#!/usr/bin/env python3
"""TreatmentExplainer VO post-processing — pedalboard wet/dry reverb bus.

Proper bus approach: dry signal at 100%, reverb send at 2% wet, mixed in.
Not a wet-only replacement. Keeps the direct signal crisp, adds space.

Flow:
  public/assets/voice/generated/TreatmentExplainer/scene-*.mp3   ← raw from ElevenLabs
  public/assets/voice/generated/TreatmentExplainer/_raw/*.mp3    ← auto backup (first run)
  public/assets/voice/generated/TreatmentExplainer/scene-*.mp3   ← overwritten with processed

On every run, we re-read from _raw/ to keep processing idempotent.

Usage:
  cd claude-remotion-flow
  ./scripts/voice/.venv/bin/python3.12 scripts/voice/post-process.py

Config knobs:
  --wet          Reverb wet level 0.0-1.0 (default 0.02 = 2%)
  --room         Room size 0.0-1.0 (default 0.4 = small room)
  --damping      High-freq damping 0.0-1.0 (default 0.5)
  --dry-run      Print what would happen, don't write
"""

import argparse
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

from pedalboard import Pedalboard, Reverb
from pedalboard.io import AudioFile

VO_DIR = Path(__file__).parent.parent.parent / "public" / "assets" / "voice" / "generated" / "TreatmentExplainer"
RAW_DIR = VO_DIR / "_raw"


def process_file(
    raw_path: Path,
    out_path: Path,
    wet: float,
    room: float,
    damping: float,
    dry_run: bool,
) -> None:
    board = Pedalboard(
        [
            Reverb(
                room_size=room,
                damping=damping,
                wet_level=wet,
                dry_level=1.0,
                width=1.0,
                freeze_mode=0.0,
            )
        ]
    )

    if dry_run:
        print(f"  [dry-run] would process {raw_path.name} → {out_path.name}")
        return

    with AudioFile(str(raw_path)) as f:
        audio = f.read(f.frames)
        sr = f.samplerate
        channels = f.num_channels

    effected = board(audio, sr)

    # Write to temp WAV, transcode to MP3 via ffmpeg (libsndfile can't write MP3)
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
        tmp_wav = Path(tmp.name)
    try:
        with AudioFile(str(tmp_wav), "w", sr, channels) as f:
            f.write(effected)

        result = subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loglevel",
                "error",
                "-i",
                str(tmp_wav),
                "-codec:a",
                "libmp3lame",
                "-qscale:a",
                "2",  # VBR ~190kbps, transparent
                str(out_path),
            ],
            capture_output=True,
            text=True,
        )
        if result.returncode != 0:
            print(f"  ffmpeg error on {out_path.name}: {result.stderr.strip()}", file=sys.stderr)
            sys.exit(1)
    finally:
        tmp_wav.unlink(missing_ok=True)

    size_kb = out_path.stat().st_size / 1024
    print(f"  {raw_path.name} → {out_path.name}  ({size_kb:.1f} KB)")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--wet", type=float, default=0.02, help="Reverb wet level (default 0.02)")
    parser.add_argument("--room", type=float, default=0.4, help="Room size (default 0.4)")
    parser.add_argument("--damping", type=float, default=0.5, help="HF damping (default 0.5)")
    parser.add_argument("--dry-run", action="store_true", help="Preview without writing")
    args = parser.parse_args()

    if not VO_DIR.exists():
        print(f"error: VO dir not found: {VO_DIR}", file=sys.stderr)
        return 1

    mp3s = sorted(VO_DIR.glob("scene-*.mp3"))
    if not mp3s:
        print(f"error: no scene-*.mp3 files in {VO_DIR}", file=sys.stderr)
        return 1

    RAW_DIR.mkdir(exist_ok=True)

    print(f"Post-processing {len(mp3s)} VO files")
    print(f"  wet={args.wet}  room={args.room}  damping={args.damping}")
    print(f"  raw backup: {RAW_DIR}")
    print()

    for mp3 in mp3s:
        raw_backup = RAW_DIR / mp3.name
        if not raw_backup.exists():
            shutil.copy2(mp3, raw_backup)
            print(f"  [backup] {mp3.name} → _raw/")

        process_file(
            raw_path=raw_backup,
            out_path=mp3,
            wet=args.wet,
            room=args.room,
            damping=args.damping,
            dry_run=args.dry_run,
        )

    print()
    print("Done. Remotion Studio will pick up new audio on refresh.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
