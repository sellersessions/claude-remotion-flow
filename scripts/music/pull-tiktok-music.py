#!/usr/bin/env python3
"""
Pull music tracks from a list of TikTok URLs (mixed video + photo posts).
Names files from the TikTok music credit, not from post content:
  {artist} - {track}.mp3
For "original sound" / promo posts:
  {uploader} - original sound - {music_id}.mp3
Writes flat folder + manifest.json with full attribution.

Usage:
  ./pull-tiktok-music.py <url-list-file> <out-dir>
"""
import sys, os, json, re, subprocess, shutil, hashlib, urllib.request
from pathlib import Path
from datetime import datetime


def sanitize(s, max_len=100):
    if not s:
        return ""
    s = s.replace("—", "-").replace("–", "-")
    s = re.sub(r'[\\/:*?"<>|]', "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s[:max_len].strip()


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()[:16]


def resolve_url(short_url):
    r = subprocess.run(
        ["curl", "-sILo", "/dev/null", "-w", "%{url_effective}",
         "-L", "--max-time", "10", short_url],
        capture_output=True, text=True
    )
    return r.stdout.strip()


def classify(url):
    if "/photo/" in url:
        return "photo"
    if "/video/" in url:
        return "video"
    return "unknown"


def build_filename(track, artist, uploader, music_id, is_original):
    if is_original or (track or "").strip().lower() == "original sound":
        return f"{sanitize(uploader or 'unknown')} - original sound - {music_id or 'na'}.mp3"
    return f"{sanitize(artist or 'unknown')} - {sanitize(track or 'untitled')}.mp3"


def unique_path(out_dir, fname, music_id):
    p = out_dir / fname
    if not p.exists():
        return p
    return out_dir / f"{p.stem} - {music_id or 'dup'}.mp3"


def pull_video(canonical, out_dir):
    meta_r = subprocess.run(
        ["yt-dlp", "--skip-download", "--dump-single-json", canonical],
        capture_output=True, text=True
    )
    if meta_r.returncode != 0:
        return None, f"yt-dlp meta: {meta_r.stderr[-300:]}"
    meta = json.loads(meta_r.stdout)
    track = meta.get("track") or ""
    artist = meta.get("artist") or ""
    uploader = meta.get("uploader") or ""
    vid = str(meta.get("id") or "")
    is_original = (track.strip().lower() == "original sound")

    fname = build_filename(track, artist, uploader, vid, is_original)
    out_path = unique_path(out_dir, fname, vid)

    # yt-dlp templates expect path with no extension when using -x
    stem = str(out_path.with_suffix(""))
    dl_r = subprocess.run(
        ["yt-dlp", "-x", "--audio-format", "mp3", "--audio-quality", "320K",
         "--no-progress", "-o", stem + ".%(ext)s", canonical],
        capture_output=True, text=True
    )
    if dl_r.returncode != 0:
        return None, f"yt-dlp dl: {dl_r.stderr[-300:]}"
    if not out_path.exists():
        return None, f"yt-dlp dl: output missing at {out_path}"

    return {
        "filename": out_path.name,
        "kind": "video",
        "track": track or None,
        "artist": artist or None,
        "album": meta.get("album") or None,
        "uploader": uploader or None,
        "video_id": vid,
        "duration": meta.get("duration"),
        "original_sound": is_original,
        "sha256_16": sha256(out_path),
    }, None


def pull_photo(canonical, out_dir, tmp_dir):
    g_r = subprocess.run(
        ["gallery-dl", "--no-download", "-j", canonical],
        capture_output=True, text=True
    )
    if g_r.returncode != 0:
        return None, f"gallery-dl meta: {g_r.stderr[-300:]}"
    data = json.loads(g_r.stdout)

    music = None
    post = None
    for entry in data:
        if isinstance(entry, list) and len(entry) >= 3 and isinstance(entry[2], dict):
            md = entry[2]
            if isinstance(md.get("music"), dict) and md["music"].get("playUrl"):
                music = md["music"]
                post = md
                break
    if not music:
        return None, "no music metadata in photo post"

    track = music.get("title") or ""
    artist = music.get("authorName") or ""
    album = music.get("album") or None
    is_original = bool(music.get("original"))
    music_id = str(music.get("id") or "")
    play_url = music.get("playUrl")
    author = (post.get("author") or {}) if isinstance(post.get("author"), dict) else {}
    uploader = author.get("uniqueId") or author.get("nickname") or ""

    fname = build_filename(track, artist, uploader, music_id, is_original)
    out_path = unique_path(out_dir, fname, music_id)

    tmp_file = tmp_dir / f"{music_id or 'tmp'}.audio"
    tmp_dir.mkdir(parents=True, exist_ok=True)
    try:
        req = urllib.request.Request(play_url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as resp, open(tmp_file, "wb") as f:
            shutil.copyfileobj(resp, f)
    except Exception as e:
        return None, f"music download: {e}"

    ff_r = subprocess.run(
        ["ffmpeg", "-y", "-loglevel", "error", "-i", str(tmp_file),
         "-codec:a", "libmp3lame", "-b:a", "320k", str(out_path)],
        capture_output=True, text=True
    )
    tmp_file.unlink(missing_ok=True)
    if ff_r.returncode != 0:
        return None, f"ffmpeg: {ff_r.stderr[-300:]}"

    return {
        "filename": out_path.name,
        "kind": "photo",
        "track": track or None,
        "artist": artist or None,
        "album": album,
        "uploader": uploader or None,
        "music_id": music_id,
        "duration": music.get("duration"),
        "is_copyrighted": music.get("isCopyrighted"),
        "original_sound": is_original,
        "sha256_16": sha256(out_path),
    }, None


def main(url_file, out_dir):
    out_dir = Path(out_dir).resolve()
    out_dir.mkdir(parents=True, exist_ok=True)
    tmp_dir = out_dir / "_tmp"

    urls = []
    for line in Path(url_file).read_text().splitlines():
        line = line.strip()
        if line and not line.startswith("#"):
            urls.append(line)

    manifest = []
    failures = []

    for i, short_url in enumerate(urls, 1):
        print(f"[{i:02d}/{len(urls)}] {short_url}", flush=True)
        canonical = resolve_url(short_url)
        kind = classify(canonical)
        print(f"        {kind} <- {canonical[:90]}", flush=True)

        if kind == "video":
            entry, err = pull_video(canonical, out_dir)
        elif kind == "photo":
            entry, err = pull_photo(canonical, out_dir, tmp_dir)
        else:
            entry, err = None, "could not classify"

        if entry:
            entry["short_url"] = short_url
            entry["canonical_url"] = canonical
            entry["captured_at"] = datetime.now().isoformat(timespec="seconds")
            manifest.append(entry)
            print(f"        ok: {entry['filename']}", flush=True)
        else:
            failures.append({
                "short_url": short_url,
                "canonical_url": canonical,
                "kind": kind,
                "error": (err or "")[:300],
            })
            print(f"        FAIL: {(err or '')[:200]}", flush=True)

    out_manifest = out_dir / "manifest.json"
    out_manifest.write_text(json.dumps({
        "generated_at": datetime.now().isoformat(timespec="seconds"),
        "source": "WhatsApp self-chat (89653281566857@lid) 2026-05-11 14:58-15:10 BST",
        "total_urls": len(urls),
        "successful": len(manifest),
        "failed": len(failures),
        "tracks": manifest,
        "failures": failures,
    }, indent=2))

    shutil.rmtree(tmp_dir, ignore_errors=True)

    print()
    print(f"DONE: {len(manifest)}/{len(urls)} pulled, {len(failures)} failed.")
    print(f"OUT:  {out_dir}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__, file=sys.stderr)
        sys.exit(2)
    main(sys.argv[1], sys.argv[2])
