#!/usr/bin/env python3
"""VO post-processing — LUFS normalize → reverb bus → peak limiter → MP3.

Two output modes per chapter:
  - Single-stem (preferred):  _raw/chapter.mp3   → chapter.mp3 + chapter.timings.json
  - Per-scene (legacy):       _raw/scene-*.mp3   → scene-*.mp3 (one each)

Pipeline order (per file):
  1. ffmpeg loudnorm to --lufs / --tp dBTP
  2. pedalboard Reverb (default 2% wet, 100% dry — subtle "air")
  3. pedalboard Limiter (default −1.0 dBTP) — catches reverb tail before encode
  4. ffmpeg → MP3 VBR ~190 kbps

Idempotent: first run backs up the raw mp3 to <vo-dir>/_raw/, every subsequent
run re-reads from _raw/ so settings can be tweaked without compounding.

Single-stem also writes chapter.timings.json from ffmpeg silencedetect on the
raw stem (the audio-engineering "right" side: timings reflect the dry signal
boundaries before reverb tail leaks into silences).

Usage:
  ./scripts/voice/.venv/bin/python3.12 scripts/voice/post-process.py
  ./scripts/voice/.venv/bin/python3.12 scripts/voice/post-process.py --target workshop-intro-ch03
  ./scripts/voice/.venv/bin/python3.12 scripts/voice/post-process.py \
      --target-dir public/assets/voice/generated/workshop-intro-ch05

Config knobs:
  --target              Composition slug under public/assets/voice/generated/
  --target-dir          Explicit absolute or repo-relative VO dir
  --wet                 Reverb wet level 0.0-1.0 (default 0.02 = 2%)
  --room                Room size 0.0-1.0 (default 0.4 = small room)
  --damping             High-freq damping 0.0-1.0 (default 0.5)
  --lufs                Target integrated loudness, dB LUFS (default -16.0)
  --tp                  Target true peak, dBTP (default -1.5)
  --limiter-threshold   Limiter ceiling, dBTP (default -1.0)
  --no-loudnorm         Skip the loudness pass
  --no-limiter          Skip the limiter (debug only — re-introduces clipping risk)
  --silence-noise       silencedetect noise floor, dB (default -40)
  --silence-min         silencedetect minimum silence, sec (default 0.8)
  --dry-run             Print what would happen, don't write
"""

import argparse
import json
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from pedalboard import Limiter, Pedalboard, Reverb
from pedalboard.io import AudioFile

REPO_ROOT = Path(__file__).parent.parent.parent
VO_BASE = REPO_ROOT / "public" / "assets" / "voice" / "generated"


def loudnorm_to_wav(src_path: Path, dst_wav: Path, lufs: float, tp: float) -> None:
    """One-pass ffmpeg loudnorm → 24-bit WAV."""
    result = subprocess.run(
        [
            "ffmpeg", "-y", "-loglevel", "error",
            "-i", str(src_path),
            "-af", f"loudnorm=I={lufs}:LRA=11:TP={tp}",
            "-ar", "44100",
            "-c:a", "pcm_s24le",
            str(dst_wav),
        ],
        capture_output=True, text=True,
    )
    if result.returncode != 0:
        print(f"  loudnorm error on {src_path.name}: {result.stderr.strip()}", file=sys.stderr)
        sys.exit(1)


def detect_nonsilent_regions(
    src_path: Path, noise_db: float, min_silence_sec: float,
) -> list[tuple[float, float]]:
    """Run ffmpeg silencedetect, return list of (start, end) non-silent ranges in seconds."""
    result = subprocess.run(
        [
            "ffmpeg", "-i", str(src_path),
            "-af", f"silencedetect=noise={noise_db}dB:d={min_silence_sec}",
            "-f", "null", "-",
        ],
        capture_output=True, text=True,
    )
    log = result.stderr

    # Total duration via ffprobe-equivalent parse from log.
    dur_match = re.search(r"Duration:\s*(\d+):(\d+):([\d.]+)", log)
    if not dur_match:
        raise RuntimeError(f"Could not parse duration from {src_path}")
    h, m, s = dur_match.groups()
    total_sec = int(h) * 3600 + int(m) * 60 + float(s)

    silence_starts = [float(x) for x in re.findall(r"silence_start:\s*([\d.]+)", log)]
    silence_ends = [float(x) for x in re.findall(r"silence_end:\s*([\d.]+)", log)]

    # Build non-silent (active speech) regions from silence boundaries.
    regions: list[tuple[float, float]] = []
    cursor = 0.0
    for s_start, s_end in zip(silence_starts, silence_ends):
        if s_start > cursor:
            regions.append((cursor, s_start))
        cursor = s_end
    if cursor < total_sec:
        regions.append((cursor, total_sec))

    # Drop trivially short regions (< 200ms — usually breath/click artefacts).
    regions = [(a, b) for a, b in regions if (b - a) >= 0.2]
    return regions


def write_timings(
    raw_chapter_mp3: Path,
    out_path: Path,
    scene_ids: list[str],
    noise_db: float,
    min_silence_sec: float,
) -> None:
    """Compute timings.json from silence-detect on the raw stem and write to disk."""
    regions = detect_nonsilent_regions(raw_chapter_mp3, noise_db, min_silence_sec)
    if len(regions) != len(scene_ids):
        msg = (
            f"silence-detect found {len(regions)} non-silent regions but config has "
            f"{len(scene_ids)} scenes. Tune --silence-noise / --silence-min, or check "
            f"the chapter render for missing/merged scenes."
        )
        print(f"  ERROR: {msg}", file=sys.stderr)
        for i, (a, b) in enumerate(regions):
            print(f"    region {i}: {a:.2f}s → {b:.2f}s ({b - a:.2f}s)", file=sys.stderr)
        raise SystemExit(1)

    timings = [
        {
            "sceneId": sid,
            "startSec": round(start, 3),
            "endSec": round(end, 3),
            "durationSec": round(end - start, 3),
        }
        for sid, (start, end) in zip(scene_ids, regions)
    ]
    out_path.write_text(json.dumps(timings, indent=2) + "\n")
    print(f"  timings: {len(timings)} scenes → {out_path.name}")


def process_file(
    raw_path: Path,
    out_path: Path,
    wet: float,
    room: float,
    damping: float,
    lufs: float | None,
    tp: float,
    limiter_threshold: float | None,
    dry_run: bool,
) -> None:
    if dry_run:
        steps = []
        if lufs is not None:
            steps.append(f"loudnorm I={lufs} TP={tp}")
        steps.append(f"reverb wet={wet}")
        if limiter_threshold is not None:
            steps.append(f"limiter @{limiter_threshold}dB")
        print(f"  [dry-run] {raw_path.name} → {out_path.name}  ({' → '.join(steps)})")
        return

    chain: list = [
        Reverb(
            room_size=room,
            damping=damping,
            wet_level=wet,
            dry_level=1.0,
            width=1.0,
            freeze_mode=0.0,
        ),
    ]
    if limiter_threshold is not None:
        chain.append(Limiter(threshold_db=limiter_threshold, release_ms=100))
    board = Pedalboard(chain)

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_in:
        in_wav = Path(tmp_in.name)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp_out:
        out_wav = Path(tmp_out.name)
    try:
        if lufs is not None:
            loudnorm_to_wav(raw_path, in_wav, lufs, tp)
            audio_src = in_wav
        else:
            audio_src = raw_path

        with AudioFile(str(audio_src)) as f:
            audio = f.read(f.frames)
            sr = f.samplerate
            channels = f.num_channels
        effected = board(audio, sr)

        with AudioFile(str(out_wav), "w", sr, channels) as f:
            f.write(effected)

        result = subprocess.run(
            [
                "ffmpeg", "-y", "-loglevel", "error",
                "-i", str(out_wav),
                "-codec:a", "libmp3lame",
                "-qscale:a", "2",
                str(out_path),
            ],
            capture_output=True, text=True,
        )
        if result.returncode != 0:
            print(f"  encode error on {out_path.name}: {result.stderr.strip()}", file=sys.stderr)
            sys.exit(1)
    finally:
        in_wav.unlink(missing_ok=True)
        out_wav.unlink(missing_ok=True)

    size_kb = out_path.stat().st_size / 1024
    print(f"  {raw_path.name} → {out_path.name}  ({size_kb:.1f} KB)")


def resolve_vo_dir(target: str | None, target_dir: str | None) -> Path:
    if target_dir:
        p = Path(target_dir)
        return p if p.is_absolute() else (REPO_ROOT / p).resolve()
    if target:
        return VO_BASE / target
    return VO_BASE / "TreatmentExplainer"


def discover_files(vo_dir: Path) -> tuple[str, list[Path]]:
    """Return (mode, files). 'chapter' mode returns the single stem; 'per-scene'
    returns the scene MP3s. Chapter takes precedence when both exist."""
    chapter = vo_dir / "chapter.mp3"
    raw_chapter = vo_dir / "_raw" / "chapter.mp3"
    if chapter.exists() or raw_chapter.exists():
        return "chapter", [chapter]
    scenes = sorted(vo_dir.glob("scene-*.mp3"))
    if scenes:
        return "per-scene", scenes
    return "empty", []


def load_scene_ids(vo_dir: Path) -> list[str]:
    """Read scene ID order from chapter.metadata.json (written by generate-vo --mode chapter)."""
    meta_path = vo_dir / "chapter.metadata.json"
    if not meta_path.exists():
        meta_path = vo_dir / "_raw" / "chapter.metadata.json"
    if not meta_path.exists():
        raise SystemExit(
            f"error: chapter.metadata.json not found in {vo_dir}. "
            f"Run generate-vo.ts --mode chapter first."
        )
    meta = json.loads(meta_path.read_text())
    return [scene["id"] for scene in meta["scenes"]]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--target", help="Composition slug under public/assets/voice/generated/")
    parser.add_argument("--target-dir", help="Explicit VO dir (absolute or repo-relative)")
    parser.add_argument("--wet", type=float, default=0.02, help="Reverb wet level (default 0.02)")
    parser.add_argument("--room", type=float, default=0.4, help="Room size (default 0.4)")
    parser.add_argument("--damping", type=float, default=0.5, help="HF damping (default 0.5)")
    parser.add_argument("--lufs", type=float, default=-16.0, help="Target LUFS (default -16.0)")
    parser.add_argument("--tp", type=float, default=-1.5, help="True-peak ceiling dBTP (default -1.5)")
    parser.add_argument("--limiter-threshold", type=float, default=-1.0, help="Limiter ceiling dBTP (default -1.0)")
    parser.add_argument("--no-loudnorm", action="store_true", help="Skip loudness normalization")
    parser.add_argument("--no-limiter", action="store_true", help="Skip the limiter (debug only)")
    parser.add_argument("--silence-noise", type=float, default=-40.0, help="silencedetect noise floor dB (default -40)")
    parser.add_argument("--silence-min", type=float, default=0.8, help="silencedetect min silence sec (default 0.8)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    vo_dir = resolve_vo_dir(args.target, args.target_dir)
    raw_dir = vo_dir / "_raw"

    if not vo_dir.exists():
        print(f"error: VO dir not found: {vo_dir}", file=sys.stderr)
        return 1

    mode, files = discover_files(vo_dir)
    if mode == "empty":
        print(f"error: no chapter.mp3 or scene-*.mp3 files in {vo_dir}", file=sys.stderr)
        return 1

    raw_dir.mkdir(exist_ok=True)
    lufs = None if args.no_loudnorm else args.lufs
    limiter_threshold = None if args.no_limiter else args.limiter_threshold

    print(f"Post-processing ({mode}) in {vo_dir.relative_to(REPO_ROOT)}")
    if lufs is not None:
        print(f"  loudnorm: I={lufs} LUFS  TP={args.tp} dBTP")
    print(f"  reverb:   wet={args.wet}  room={args.room}  damping={args.damping}")
    if limiter_threshold is not None:
        print(f"  limiter:  threshold={limiter_threshold} dBTP")
    print(f"  raw backup: {raw_dir.relative_to(REPO_ROOT)}")
    print()

    if mode == "chapter":
        chapter_path = files[0]
        raw_backup = raw_dir / chapter_path.name
        if not raw_backup.exists():
            if chapter_path.exists():
                shutil.copy2(chapter_path, raw_backup)
                print(f"  [backup] {chapter_path.name} → _raw/")
            else:
                print(f"error: {chapter_path} not found and no _raw/{chapter_path.name} backup", file=sys.stderr)
                return 1

        if not args.dry_run:
            scene_ids = load_scene_ids(vo_dir)
            timings_path = vo_dir / "chapter.timings.json"
            write_timings(
                raw_chapter_mp3=raw_backup,
                out_path=timings_path,
                scene_ids=scene_ids,
                noise_db=args.silence_noise,
                min_silence_sec=args.silence_min,
            )

        process_file(
            raw_path=raw_backup,
            out_path=chapter_path,
            wet=args.wet,
            room=args.room,
            damping=args.damping,
            lufs=lufs,
            tp=args.tp,
            limiter_threshold=limiter_threshold,
            dry_run=args.dry_run,
        )
    else:  # per-scene legacy
        for mp3 in files:
            raw_backup = raw_dir / mp3.name
            if not raw_backup.exists():
                shutil.copy2(mp3, raw_backup)
                print(f"  [backup] {mp3.name} → _raw/")

            process_file(
                raw_path=raw_backup,
                out_path=mp3,
                wet=args.wet,
                room=args.room,
                damping=args.damping,
                lufs=lufs,
                tp=args.tp,
                limiter_threshold=limiter_threshold,
                dry_run=args.dry_run,
            )

    print()
    print("Done. Remotion Studio will pick up new audio on refresh.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
