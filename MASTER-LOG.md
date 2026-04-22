# Claude Remotion Flow — MASTER-LOG

> Programmatic video production pipeline powered by Remotion + Claude Code. SSL 2026 opener, treatment framework, voice cloning, reels, walkthroughs, event promos.

## Kickoff

Remotion composition rendering SSL 2026 promotional reel. 1920×1080, 30fps. 8 scenes covering conference value proposition, speaker lineup, workflow demo, and CTA. Expanding to full video production pipeline: treatments, voice cloning, beat-sync, multi-format output. **Voice pipeline pivoted 17 Apr** from F5-TTS (self-hosted, local MPS) to **ElevenLabs Professional Voice Clone** after quality ceiling hit on F5-TTS tuning (max similarity 0.949, ±45 pitch variance vs real ±14 — formants/resonance couldn't be fixed with EQ). New clone "Danny Raw Voice 2026" uploaded with 2hrs training + self-recorded validation sample. ElevenLabs validation window 2–36 hours.

## Next Up

1. [ ] **Write 8 scene scripts** for FormatExplainer VO (scene-opener, scene-0-agenda, scene-1-title, scene-2-problem, scene-3-container, scene-4-interview, scene-5-delegate, scene-6-outro). Apply em-dash cadence rules from the house preset. Danny drafts copy.
2. [ ] **Generate 8 VO MP3s** via `generate-vo.ts` using `scripts/voice/presets/ssl-2026-house-voice.json`. Drop into `public/voiceover/FormatExplainer/`.
3. [ ] **Test FormatExplainer render** — calculateMetadata auto-sizes scenes to VO lengths; music ducks 0.55→0.2 during each VO sequence. Infrastructure already in place (Session 7).
4. [ ] **Round 3 voice polish** — per-word pitch bump on "guys" in "Hey guys" tune-in. Requires DSP post-processing (pedalboard). See task #13.
5. [ ] **Canvas-only-during-transition bug** — TreatmentExplainer renders canvas only during transitions, empty at rest. Suspected tie to Trail motion-blur bug. Not voice-related.
6. [ ] Danny scrubs TreatmentExplainer in Studio → feedback on 6 scenes
7. [ ] **Curate library via auditioner** — run `npm run audition`, ⭐-shortlist winners across 6 tabs (transitions/stingers/risers/impacts/ambience/music). Copy winners back to TSX via 📋 button or selection tray. 378 items total.
8. [ ] Wire remaining SFX from shortlisted set: glitch-tail stingers at transitions, whooshes at cuts.
9. [ ] Beat-sync scene cuts to cyberpunk music bed
10. [ ] Scene 6 CTA button restyle (Danny flagged, deferred)
11. [x] **Park F5-TTS pipeline** — keep venv + tuning-ui.py on disk as fallback, but stop iterating. Pivot locked to ElevenLabs.
12. [x] **Auditioner v2** — library model, music tab, ⭐ + 📋 clipboard workflow, HTTP Range streaming. Session 8.

---

## Session Log

### Session 8 — Auditioner v2: library model + music + clipboard workflow (22 Apr)

- **Context:** Session 7's auditioner had approve/reject framing — Danny rejected the model (*"they're acceptable, but we'd keep them all anyway — it's a library"*). Also missed music entirely and had no path back to terminal/Claude.
- **Schema v3:** `scripts/sfx/migrate-manifest.mjs` extended. Added `shortlisted` + `shortlisted_at`. `approved` / `approved_at` retained as deprecated for rollback; server rejects PATCH writes on them; UI ignores. 289 items touched, 578 fields added, idempotent re-run = 0 changes.
- **Inbox merged into library:** `scripts/sfx/merge-inbox-to-library.mjs` new. 289 files moved `_inbox/<cat>/` → `library/<cat>/`, manifest `local_path` patched for all 289. `_inbox/` dir removed. Dry-run default, `--apply` required. Collision check built in (none hit). Post-merge: `library/` has 309 files (289 scraped + 20 hand-picks), 5 production paths re-verified intact (`grep -rn 'assets/sfx/library/' src/` = 5 code + 1 comment, unchanged).
- **Music indexed:** `scripts/sfx/index-music.mjs` new. ffprobe-based scanner (5s timeout, stable `music-<sha1[0:10]>` id). Added 89 entries — 4 ssl-live-beds + 85 tiktok-backing. Allowlist `.mp3|.m4a|.wav|.aif`; 2× `.mp4` explicitly skipped with logged reason; `.DS_Store`, `Macintosh HD` symlink, `untitled folder`, `Tik` symlink all filtered by `lstat().isFile()`. Idempotent.
- **Scraper default fixed:** `pixabay-scrape.mjs` now writes to `public/assets/sfx/library/<cat>/` by default (was `_inbox/<cat>/`). Future scrapes land in the right place.
- **Auditioner server (`scripts/sfx/auditioner/server.mjs`):**
  - Audio jail widened: `SFX_ROOT` → `ASSETS_ROOT = public/assets/`. Traversal guard kept (`startsWith(ASSETS_ROOT + '/')`). Confirmed `/audio/../../package.json` → 404.
  - PATCH whitelist: `shortlisted`, `notes`, `mood`, `subcategory` only. Stale tabs sending `{approved:true, rejected:true}` → silently dropped; response lists `applied`+`ignored`.
  - `shortlisted_at` timestamp mirrors old `approved_at` pattern (ISO on true, null on false).
  - **HTTP Range support added** — `serveAudio()` handles `Range: bytes=…` → 206 Partial Content with `Content-Range`. Advertises `Accept-Ranges: bytes` + `Cache-Control`. Streams via `createReadStream` (no longer buffers whole file into memory). Smooth mid-track seeking for longer music tracks.
- **Auditioner UI (`scripts/sfx/auditioner/index.html`):** full rebuild.
  - ✗ reject button gone. ✓ → ⭐ shortlist toggle (yellow when on).
  - 📋 copy-path per row. Click = bare `assets/sfx/library/<cat>/<file>.mp3`. Alt-click = `staticFile("assets/…")` wrapper for direct TSX paste. Modal fallback if `navigator.clipboard` unavailable.
  - URL-encodes each path segment when building `/audio/<rel>` (filenames have spaces, brackets, parens like `[TubeRipper.com]`).
  - **Selection tray** (sticky, `localStorage` key `sfx-auditioner-selection-v1`): per-row checkbox → tray shows count, `Clear`, `Copy selection` (markdown block: `- \`path\` — notes, duration`), `Promote to ⭐ shortlist` (PATCHes each selected id + clears tray). Persists across reloads.
  - **Music tab** in unified tab bar (6 tabs: transitions/stingers/risers/impacts/ambience/music). Music grouped by subcategory (ssl-live-beds, tiktok-backing).
  - **One audio plays at a time** — global `currentAudio` pauses prior when new one starts. Handles the "too many playing" chaos when scrubbing many rows.
  - Filter chips: `all / ⭐ shortlisted / unshortlisted` (was `all/unreviewed/approved/rejected`).
- **Live round-trip test:** Danny pasted `assets/sfx/library/transitions/pixabay-dragon-studio-simple-whoosh-b3087a581e.mp3` back into the terminal — byte-exact, file resolves (DRAGON-STUDIO "Simple Whoosh", 18K). Clipboard workflow validated.
- **render-library-md.mjs:** added `music` to `CATEGORY_ORDER`, sub-groups music by subcategory, `Approved` column → `⭐ Shortlist`, sort by `shortlisted` desc then duration asc.
- **Final state:** MANIFEST schema v3 · 378 items (289 SFX + 89 music) · 0 shortlisted (curation not started) · LIBRARY.md regenerated.
- **Commit:** `abcc0a0` — `session 8: auditioner v2 — library model + music + clipboard workflow`.
- **Not done this session (deliberate):** no waveform previews (Danny explicitly declined over-engineering), no `.mp4` audio-strip, no auto mood/bpm detection, no changes to `src/*.tsx`.

### Session 7 — ElevenLabs house voice locked + FormatExplainer refactor (22 Apr)

- **Clone validated:** "Danny Raw Voice 2026" (`jQOgcOzmmipekvxJN09W`), all v2 models fine-tuned, verified on `/v1/voices` call. ElevenCreative workspace.
- **Danny's tuned UI settings pulled:** stability 0.31, similarity_boost 1.0, style 0.0, speaker_boost ON, **speed 0.80**. These became the starting baseline.
- **`generate-vo.ts` built** at `scripts/voice/generate-vo.ts` — TypeScript wrapper, native fetch + dotenv, JSON config schema, per-scene `voice_settings` overrides, dry-run mode, cost estimate. Replaces the parked F5-TTS Python generator.
- **FormatExplainer refactored** (`src/FormatExplainer.tsx`): kicked out hardcoded f105/f720/f940 timings. Now uses `calculateMetadata` + `getAudioDurationInSeconds` from `@remotion/media-utils` to auto-size each of 8 scenes to its VO MP3. Missing-file fallback logs warn + uses hardcoded scene duration so build never breaks. Music bed volume is now a frame-callback that ramps 0.55 → 0.2 over 15 frames at each VO start, holds, ramps back. Typecheck clean on `src/`.
- **Round 1 A/B/C on tune-in line** — "Hey guys, welcome back to Seller Sessions. In today's episode, we are going to be talking about Claude Code and particularly the work around Claude Code using Remotion."
  - A (clean text, stability 0.31) / B (em-dash + comma pacing, stability 0.31) / C (clean text, stability 0.20).
  - Danny picked **B**. Dismissed A + C.
- **Round 2 speed ladder on B:** 0.80 / 0.85 / 0.90 / 0.95. Danny picked **0.90** as the pocket. Speed 0.80 felt sluggish; 0.95 rushed; 0.85 too close to 0.80 to matter.
- **House voice preset locked:** `scripts/voice/presets/ssl-2026-house-voice.json` — reusable config for all future SSL 2026 Remotion VO. Reference MP3: `voice-box-generations/elevenlabs/ssl-2026-opener/LOCKED-ssl-2026-tune-in.mp3`.
- **Picker UI built:** `voice-box-generations/elevenlabs/ssl-2026-opener/index.html` — dark SS palette, 4-card layout, audio players + mailto pick buttons. Used for round 2 speed pick.
- **Rule locked (into MEMORY.md + preset JSON):** text cadence via em-dashes + extra commas. NO SSML `<break>` tags. Danny explicitly rejected them 22 Apr.
- **Credits used:** ~1,024 of 121k Creator tier.
- **Round 3 parked:** per-word pitch bump on "guys" — ElevenLabs has no per-word pitch API; needs DSP post-processing. Task #13 logged.
- **Security note:** API key Danny pasted in-session lives in `claude-remotion-flow/.env` (gitignored). To rotate after session: ElevenLabs → Profile → API Keys → regenerate.

### Session 6 — ElevenLabs Pro pivot + fresh clone upload (17 Apr)
- **F5-TTS ceiling reached:** After Session 5's 5 tuning rounds, similarity stalled at 0.949 and pitch variance remained at ±45 (vs real ±14). Root cause = formants/resonance, not something EQ/pedalboard can reshape. Decision: park F5-TTS, pivot to ElevenLabs Professional Voice Clone.
- **ElevenLabs housekeeping:** Deleted old "Danny McMillan Pro" clone (trained on Riverside-processed audio — bad source). Deleted "Danny McMillan Loom Raw" Instant Clone (created via API earlier, superseded).
- **New Pro clone uploaded:** "Danny Raw Voice 2026" in **ElevenCreative** workspace. Language: English (British). Source: ~2 hours of raw training samples (self-recorded, not Riverside/AI-processed). Validation sample recorded manually today — **ElevenLabs validation window is 2–36 hours.** Voice currently 0d old, awaiting auth.
- **Remotion Studio still running** — `npx remotion studio` alive on port 3000 across session boundary (PIDs 74823, 83945, 83960). Didn't need to reboot.
- **Canvas-only-during-transition bug surfaced** (prior session ref, Image #17): canvas only paints during scene transitions, blank at rest. Not investigated today — deferred. Suspected link to known Trail motion-blur bug (collapses static layers to (0,0)) per Session 3 fix pattern.
- **Previous Claude Code session hung** 16m17s while booting Studio, forced `/exit`. Studio itself was fine; the churn was the agent loop. Resumed cleanly from this session via master log.
- **Decision log:** F5-TTS → ElevenLabs pivot. Reasoning kept in memory: free/local workflow capped on voice realism; ElevenLabs Pro handles formants natively. Cost = Creator tier $22/mo.
- **Session end state:** Uploads complete, Danny moved to validation wait. Pick up 18 Apr after ElevenLabs confirms clone.

### Session 1 — Initial build (pre-15 Apr)
- Built 6 scenes (Title → Outro) with TransitionSeries
- SS palette tokens: BG gradient, purple accent, gold accent
- Real SSL logo + 5 speaker JPGs added to public/
- Scene0Agenda: 5 vertical speaker cards with auto-pan
- Scene 3 arrow alignment fix (evenly spaced cards)

### Session 2 — Cinematic opener (15 Apr)
- SceneOpener (150f) added: 7 stacked trailer effects
  - Letterbox bars, camera shake (noise2D), chromatic aberration
  - Lens-flare sweep, radial light burst, zoom-punch logo, vignette
- Installed: @remotion/transitions, @remotion/google-fonts (Inter), @remotion/noise, @remotion/motion-blur
- All scenes wrapped in TransitionSeries with fade() + linearTiming
- Fixed inner localFrame bug (Sequence rebases useCurrentFrame)

### Session 3 — Transitions, audio, VO pipeline (15-16 Apr)
- **Transitions tightened (Option C):** fade 18f→8f, SceneExit wrapper (14f fade+scale out) on all 8 scenes
- **Audio wired:** 19 SFX files moved to public/audio/. Music bed (cyberpunk 48.6s), riser (last 3s, 0-90f), impact hit (frame 92) connected via <Audio> + <Sequence>.
- **Opener text fixed:** "Built for Innovators." now static at frame 0 (thumbnail-ready), explodes outward frame 35+. Trail motion-blur removed from Line 1 (was collapsing layers at rest). Font 108→92, nowrap.
- **ElevenLabs voice extracted** via browser automation (extract-flow inspect.js): Voice "Danny McMillan 11L" (ID: pfeizhSY3j6DUhKGxyRz), 32min training, default settings (Stability 0.5, Similarity 0.75, Speaker Boost ON). Account on Free tier — Pro cloning needs Creator $22/mo. Saved to `SSL-2026-Format/remotion-sample/ELEVENLABS-VOICE.md`.
- **VO plan:** Danny recording 3 lines himself (podcast mic, WAV 44.1kHz mono): "Seller Sessions Live returns." / "One prompt. A full session." / "Nine May. London." Drop to `public/audio/danny-vo.wav`.

### Session 4 — Remotion upgrade, treatment framework, F5-TTS voice cloning (16 Apr)
- **Remotion upgrade:** All 30 packages pinned to v4.0.448 (was mixed 443/448). 13 new packages: @remotion/media, media-utils, captions, install-whisper-cpp, layout-utils, player, shapes, paths, lottie, tailwind, three, rive, renderer
- **Treatment framework designed:** 3-layer system (Creative Brief → Story Skeletons → Treatment Document). 7 frameworks researched (Beat Sheet, PAS, Hook-Hold-Payoff, Energy Map, Micro-Treatment, AI Production Format)
- **TreatmentExplainer.tsx created:** 1160f/38s, 6 scenes explaining the treatment framework as a Remotion composition. Registered in Root.tsx
- **F5-TTS voice cloning installed:** Python 3.12 venv at `scripts/voice/.venv`. F5-TTS v1.1.19, MPS (Apple Silicon) confirmed working. `generate-vo.py` script (single + batch mode)
- **3 VO lines generated:** vo-intro.wav ("Seller Sessions Live returns."), vo-session.wav ("One prompt. A full session."), vo-cta.wav ("Nine May. London.") — wired into FormatExplainer at f105/f720/f940 with music ducking (0.55→0.2)
- **Issue:** Reference audio was from a pre-processed/cloned sample, not Danny's raw voice. Needs re-cloning from raw podcast episodes
- **README rewritten:** SVG header (blue gradient two-part font), 5 Mermaid diagrams (outline-only dark style), 4MAT sections, package map, SFX library table, design tokens

### Session 5 — Voice tuning pipeline + folder rename (16 Apr)
- **Folder renamed:** `remotion-demo` → `claude-remotion-flow` (future standalone repo)
- **Venv recreated** after rename broke Python shebang paths
- **Voice reference source identified:** Riverside podcast exports have AI enhancement baked in — was making clone sound posh/polished. Switched to **Loom recording** (raw mic, no processing)
- **Loom audio extracted:** `yt-dlp` pulled audio from Danny's Loom video (bce66afda071452582b7d1ba830cfb04). 172s, 44.1kHz, mono WAV
- **5 tuning rounds completed:**
  - Round 1-2: Riverside reference → similarity 0.848, pitch variation too flat (±20 vs real ±28)
  - Round 3-4: Different Riverside offsets → still posh/nasal. Danny identified Riverside AI processing as root cause
  - Round 5: Loom reference → similarity **0.949** (+0.10 jump), pitch variation now ±45 (overshooting, needs compression)
- **Speaker similarity analysis built:** `resemblyzer` (speaker embeddings) + `librosa` (pitch/F0 analysis). Cosine similarity + pitch mean/std comparison
- **Key finding:** Pitch is close (108 real vs 118 gen), but variation gap is the problem (±14 real vs ±45 gen). "Posh" quality is in formants/resonance, not pitch
- **Gradio tuning UI built** (`scripts/voice/tuning-ui.py`):
  - v1: Single-stage, hit timeout errors
  - v2: Two-stage (generate once → tune instantly), still had wiring bug
  - v3 (current): Fixed `gr.State()` pipeline, switched from ffmpeg subprocess to in-memory `pedalboard` (Spotify). 10 parameters: pitch, speed, warmth, mid scoop, presence, treble/air, de-ess, bass cut, reverb, loudness normalise
- **VO removed from FormatExplainer** — music bed back to flat 0.55 volume, no ducking. Will re-wire after voice is tuned
- **Dependencies added:** `resemblyzer`, `librosa`, `pedalboard`, `pyloudnorm`

### Pending
- Danny tuning voice via Gradio UI (localhost:7860)
- Lock tuning preset → re-generate 3 SSL opener lines
- Wire VO back into FormatExplainer with ducking
- Per-move critique of 7 opener effects (Danny scrubbing)
- Remaining SFX wiring (16 files available, not connected)
- Beat-sync scene cuts to music bed
- Scene 6 CTA button restyle
- Lottie exploration (Danny talking to design team, not blocking)
