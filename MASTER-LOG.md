# Claude Remotion Flow — MASTER-LOG

> Programmatic video production pipeline powered by Remotion + Claude Code. SSL 2026 opener, treatment framework, voice cloning, reels, walkthroughs, event promos.

## Kickoff

Remotion composition rendering SSL 2026 promotional reel. 1920×1080, 30fps. 8 scenes covering conference value proposition, speaker lineup, workflow demo, and CTA. Expanding to full video production pipeline: treatments, voice cloning, beat-sync, multi-format output. **Voice pipeline pivoted 17 Apr** from F5-TTS (self-hosted, local MPS) to **ElevenLabs Professional Voice Clone** after quality ceiling hit on F5-TTS tuning (max similarity 0.949, ±45 pitch variance vs real ±14 — formants/resonance couldn't be fixed with EQ). New clone "Danny Raw Voice 2026" uploaded with 2hrs training + self-recorded validation sample. ElevenLabs validation window 2–36 hours.

## Next Up

1. [ ] **Render ch03 to MP4 to confirm clicks are studio-preview-only** — `npx remotion render WorkshopIntroCh03 out/WorkshopIntroCh03.mp4`. Strategic pivot Session 15: stop chasing studio-preview mixer artefacts. Final-render summing path differs; if clicks vanish in MP4 we ship as 80–90%-good for editor polish.
2. [ ] **Decide on missing first card** — ElevenLabs still swallows the 0.5s lead break tag. Lean **(B) ship without first card** since music bed + scene cards 2-6 now mask the sparse opening; only re-render with `BREAK_LEAD_SEC=1.5` (~1k credits) if MP4 review shows the cold-open feels naked.
3. [ ] **Phase 2 — Mirror factory to `WorkshopIntroCh05`** — new `slug + scenes` contract, single-stem VO, clip-fit guard. Config skeleton already at `scripts/voice/intro-ch05.config.json` — needs rename to `workshop-intro-ch05.config.json` + `clipDurationSeconds` per scene. Inherits everything from `makeIntroChapter` including the new music-bed wiring.
4. [ ] **Phase 3 — Batch ch01/02/04** (3 chapters; ElevenLabs cost only — F5-TTS not in this loop anymore).
5. [ ] **Danny scrubs StackExplainer in Studio with the live mixer** → per-scene feedback + fine-tune mixer values. Drag-scrubber step = 0.05 (20 meaningful gain steps). VO-length cache now prevents the "calculating metadata" toast on every drag tick.
6. [ ] **Render StackExplainer to MP4** — `npm run render:stack`. Lands at `out/StackExplainer.mp4`. Deferred until Danny's satisfied post-scrub.
7. [ ] **Clarify FormatExplainer intent** — scene scaffolding (`scene-container`, `scene-interview`, `scene-delegate`) suggests delegation/agent-workflow topic, but `HOW-TO-SHIP-AN-EXPLAINER.md` lists it as "output formats + dimensions." Resolve before writing VO script.
8. [ ] **Write 8 scene scripts** for FormatExplainer VO — blocked on #7.
9. [ ] **Generate 8 VO MP3s** for FormatExplainer — blocked on #8.
10. [ ] **Test FormatExplainer render** — calculateMetadata auto-sizing already wired (Session 7).
11. [ ] **(Stretch) Visible track-and-thumb slider tool** — separate HTML page writing mixer values to a JSON file read via `staticFile()`. Only if the `InputDragger` UX isn't enough. ~1-2h build.
12. [ ] **(Stretch) Fix pre-compact routing leaks** — `flights_decisions`, `claudeflow_architecture`, `video_editing_flow_decisions` still absorb some remotion content (too-broad regex). Danny handling via session-start/memory/close work in another terminal.
13. [ ] **Auto-snap against real StackExplainer scene starts** — script exists (`scripts/music/auto-snap.ts`), but `BEAT_SNAP_FRAMES` is still all-null. Re-run with VO-driven starts to see if any snaps emerge.
14. [ ] **Round 3 voice polish** — per-word pitch bump on "guys" in "Hey guys" tune-in. Requires DSP post-processing.
15. [ ] **Canvas-only-during-transition bug** — TreatmentExplainer renders canvas only during transitions, empty at rest.
16. [ ] Danny scrubs TreatmentExplainer in Studio → feedback on 6 scenes.
17. [ ] **Curate library via auditioner** — ⭐-shortlist winners across 6 tabs.
18. [ ] Wire remaining SFX from shortlisted set.
19. [ ] Scene 6 CTA button restyle (Danny flagged, deferred).
20. [ ] **Fix 2 pre-existing lint warnings** — `@remotion/non-pure-animation` at StackExplainer:894 + TreatmentExplainer:470. Render-farm flicker risk; live renders play fine. Low priority.
21. [ ] **Embed 3 explainer MP4s in repo README** — deferred by Danny until all fine adjustments land; possibly via hosted (YouTube/Loom) links instead of raw embeds.
22. [x] **ch03 audio polish pass — surgical fades, source-mp4 audio strip, music bed wired, ducker decommissioned, outro-boom timing** — Session 15.
23. [x] **Production spine refactor — single-stem VO + peak limiter + factory hardening + ch03 naming migration + docs/CONVENTIONS.md.** Session 14.
24. [x] **Park F5-TTS pipeline** — fallback-only.
25. [x] **Auditioner v2** — Session 8.
26. [x] **TreatmentExplainer audio spine** — music bed + beat-snap + cinematic bookends + fade-to-black + pre/post-roll. Session 9.
27. [x] **StackExplainer content lock** — treatment doc + 8-scene VO config + 8 MP3s + music bed picked + onsets captured. Session 10.
28. [x] **StackExplainer composition + explainer-shared extraction** — 8 scenes, music bed + SFX bookends wired, TreatmentExplainer refactored onto shared module. `npm run render:stack` added. Session 11.
29. [x] **Wave 1-4 Loom feedback + live mixer promotion + cookbook + helper scripts + README refresh** — Session 12.
30. [x] **Starter-template cleanup + live-mixer drag-scrub fix + VO-length cache** — Session 13.

---

## Session Log

### Session 15 — ch03 audio polish: surgical fades, source-mp4 audio strip, music bed, ducker decommissioned (26 Apr, 09:23 BST)

- **Resumed Session 14 verify gate.** Round-2 alignment fix was unverified at end of S14. Danny scrubbed Studio at `localhost:3000/WorkshopIntroCh03` and reported three audio issues: frame ~1430 click ("your recovery surface"), frame ~1864 click on scene-5 entry ("Beyond"), Typora pronounced "typraa", outro explosion needs to shift back a couple of frames.
- **Misdiagnosis 1 — break-tag joins:** First read was that ElevenLabs single-stem TTS produced amplitude discontinuities at the SSML `<break>` joins. Built a surgical-fades pass into `scripts/voice/post-process.py`: cosine-taper file head/tail (default 30 ms) + per-boundary tapers (10 ms either side of every silence region from `chapter.timings.json`). New helper `apply_surgical_fades(audio, sr, regions, head_ms, tail_ms, boundary_ms)`, new CLI flags `--fade-head-ms`, `--fade-tail-ms`, `--fade-boundary-ms`, `--no-surgical-fades`. Re-encoded `chapter.mp3` from `_raw/`. Click at frame 1430 reduced but did not vanish.
- **Misdiagnosis 2 — outro-boom alignment:** Danny's screenshot showed his marked playhead at frame 2494 with the boom firing late. Math: `visualEnd = PRE_ROLL_FRAMES (30) + chapter-mp3 frames (2495) = 2525`; existing `SFX_OUTRO_LEAD_IN_FRAMES = 20` placed boom at 2505. Bumped to **31** in `src/explainer-shared/constants.ts` so attack now lands at 2494, decay rides into post-roll silence.
- **Real cause #1 — source mp4 carries audio.** Danny zoomed the Studio waveform: the source `workshop-intro-chapters.mp4` had its original recording's audio still embedded — even though `<OffthreadVideo muted>`, the raw recording's clicks were bleeding into perceived playback. Stripped audio with `ffmpeg -i in.mp4 -c:v copy -an out.mp4`, produced `workshop-intro-chapters-no-audio.mp4` (87 MB, was 100 MB). Symlinked into `public/assets/source-clips/`. `WorkshopIntroCh03.tsx` repointed: `sourceMp4: "assets/source-clips/workshop-intro-chapters-no-audio.mp4"`.
- **Real cause #2 — `void musicDuck;` hidden in factory.** Danny flagged music ducking as the suspect. Source-read `intro-chapter.tsx:186` showed `void musicDuck;` — the music ducker was **never wired** in `makeIntroChapter`. The factory takes `musicDuck` as a prop for API parity with `StackExplainer`/`TreatmentExplainer` but ignores it: music renders at flat `volume={musicHigh}` for the whole chapter. So passing 0.05 vs 0.15 made zero difference. This is a documented decommission, not a bug — Danny's strategic call was *"being clever using ducking is causing most of the problems"*. Left the `void` in place; the prop survives in the schema for backward compatibility.
- **Music bed wired into ch03.** Danny pivoted from per-click-precision to *"add background music to mask imperfections, target 80–90% video for editor polish"*. Reused StackExplainer's bed `assets/music/ssl-live-beds/penguinmusic-wings-196958.mp3` (83.49s, matches 83.17s VO stem). Added `musicBed` to `WorkshopIntroCh03.tsx` factory call. `Root.tsx` defaultProps: `musicHigh: 0.15`, `musicDuck: 0.15` (no-op), `sfxIntroVolume: 0.7`, `sfxOutroVolume: 0.7`. Music gated in factory: `{musicBed && musicHigh > 0 && (...)}` — flat volume, single Audio sequence over `0` to `visualEnd + POST_ROLL_FRAMES`.
- **Strategic decisions.** **(a) Typora pronunciation** — dropped entirely. Danny: *"I think we just have to let it go."* No phoneme override, no re-render. **(b) Studio-preview clicks** — stop chasing. Studio's audio summing peaks momentarily >1.0 with three sources active (SFX-intro + chapter-VO + music-bed); final-render mixer handles peaks differently. Verification path moves from Studio scrub to MP4 render.
- **Hot-reload trap.** Danny twice reported "no changes have been made" after edits. Cause: studio cached old composition; HMR doesn't always pick up `defaultProps`/sourceMp4 changes for an already-mounted comp. Fix: kill PIDs (21053, 21027, 21055), `npm run dev` fresh (PID 44768). Pattern catalogued for future sessions: when defaultProps don't reflect, tab-close + studio-restart, not refresh.
- **Audio file heads verified clean.** Spot-check via ffmpeg pcm_s16le sample dump: music-bed sample 0 = 0, sfx-intro sample 0 = 0, chapter-vo sample 0 = 0 after surgical-fades pass. Nothing in the input streams to cause a hard click at frame 0.
- **Verify gate handed off.** End of session: ducker decommissioned, mp4 audio stripped, music bed live, surgical fades live, boom landing at 2494. Danny to test playback after a tab refresh; if clicks persist in Studio, the next move is `npm run render:workshop-intro-ch03` to confirm it's a studio-preview-only artefact.
- **Pre-existing TS error (not from this session):** `'DEFAULT_MIXER' is declared but its value is never read` in `Root.tsx`. Inherited from S14 single-stem refactor — the chapter factory doesn't use it. Safe to remove next session if it bothers tsc strict mode.
- **Out of scope this session:** Phase 2 (`WorkshopIntroCh05`). Phase 3 (ch01/02/04). FormatExplainer intent. StackExplainer MP4 render.

### Session 14 — Production spine refactor: single-stem VO, peak limiter, factory hardening (25 Apr, 21:01 BST)

- **Problem named.** Across multiple sessions the same friction: voice distorts on playback even after `post-process.py`; per-scene ElevenLabs generation creates different "rooms" between scenes; chapter cards leave purple-gradient overhang on source clips when VO exceeds natural segment length; production features (mixer, reverb, music bed) get bolted on per-comp instead of inherited; naming drift between `IntroCh03Composition` and `StackExplainer`. Plan: `~/.claude/plans/lazy-baking-willow.md`.
- **Audio architecture flipped to single-stem.** ElevenLabs now gets the whole chapter in ONE TTS call (`generate-vo.ts --mode chapter`), with scenes joined by `<break time="X.Xs" />` SSML tags (0.5s lead, 1.5s between, 0.7s tail). One decoder context = consistent room across the chapter. Output: `_raw/chapter.mp3` + `chapter.metadata.json` (scene-id order). Per-scene mode preserved as `--mode per-scene` for one-off retakes.
- **Peak limiter added.** `post-process.py` pipeline is now `loudnorm → reverb → Limiter(-1.0 dBTP) → MP3 encode`. Catches reverb tails that previously pushed past the loudnorm true-peak ceiling and clipped into the encode. New flags: `--limiter-threshold`, `--no-limiter`. Idempotent `_raw/` backup contract unchanged.
- **timings.json sidecar.** `post-process.py` runs ffmpeg `silencedetect` on the raw stem (default `-40 dBFS / 0.8s min silence`), validates region count == scene count, writes `chapter.timings.json` with `{sceneId, startSec, endSec, durationSec}`. Replaces the per-scene `getAudioDurationInSeconds` loop in `metadata.ts`.
- **Factory hardening.** New chapter contract is **slug + scenes**, nothing else:
  ```ts
  makeIntroChapter({ slug, scenes: [{ id, label, title, sourceStart, clipDurationSeconds }], sourceMp4 })
  ```
  Slug derives `voDir`, `chapterMp3`, `timingsJson`, `logPrefix`. `IntroChapterScene` gets `clipDurationSeconds` (mandatory). The factory:
  - Plays a **single `<Audio>`** over the whole stem (no per-scene Audio sequences).
  - Wires music bed: `<Audio src={musicBed}>` rendered when `musicBed` field set + `musicHigh > 0` (default off).
  - Enforces clip-fit: scene VO duration clamped to `clipDurationSeconds * FPS`; warns to console on overshoot.
  - Defaults `voVolume: 0.65` (~−3.7 dB on top of −16 LUFS, clipping headroom).
  - `OffthreadVideo` `endAt` clamped to natural clip end so source never repeats / shows wrong footage.
- **Metadata split.** New `ChapterMetadataConfig` + `makeChapterCalculateMetadata` + `chapterFallbackDurationInFrames` added to `metadata.ts`. Old `ExplainerConfig` + `makeCalculateMetadata` kept untouched for `StackExplainer` / `TreatmentExplainer`. Two-cache design (`chapterTimingsCache` + `chapterStemCache`) keyed by timings.json path, so mixer-prop changes don't re-fetch.
- **ch03 migrated.**
  - `src/IntroCh03Composition.tsx` → `src/WorkshopIntroCh03.tsx`
  - `scripts/voice/intro-ch03.config.json` → `scripts/voice/workshop-intro-ch03.config.json` (cleaned of voice-irrelevant fields — `clipDurationSeconds`/`sourceStart` belong in the .tsx)
  - `public/assets/voice/generated/IntroCh03/` → `public/assets/voice/generated/workshop-intro-ch03/`
  - `Root.tsx` ID `IntroCh03` → `WorkshopIntroCh03`
  - `package.json`: added `render:workshop-intro-ch03` script
- **Conventions documented.** `docs/CONVENTIONS.md` written — naming table, pipeline diagram, factory contract, troubleshooting matrix. Future sessions read this on focus.
- **End-to-end run for ch03.** Single ElevenLabs call (1,033 chars + 5 break tags, 1.3 MB raw chapter.mp3) → silence-detect produced 6 clean regions matching scene order, post-process produced 994 KB final chapter.mp3 + chapter.timings.json. Scene 4 (`master-log`) durations: 10.97s VO vs 10s clip → clip-fit clamp will kick in. Studio came up clean (`HTTP 200`, no TS errors).
- **Round-2 fix — visual timeline locked 1:1 to audio stem.** Round 1 still drifted: cards/scenes used fixed durations while audio was now one continuous stem with variable inter-scene silences. Pulled `TransitionSeries` out of the chapter factory entirely. New layout in `intro-chapter.tsx`: each card + scene becomes an absolute-positioned `<Sequence from={absFrom} durationInFrames={...}>`, where card durations come from `cardDurations[]` returned by `makeChapterCalculateMetadata` (= silence gaps from timings.json: 1.58s / 1.82s / 1.83s / 1.61s / 1.62s for ch03), and scene durations come from non-silent regions. `VO_PRE_PAD` removed from the VO sequence (the stem has its own leading silence baked in). Visual frames sum exactly to `stemFrames` so audio and visuals can never drift.
- **Verify gate still open at session end.** Studio rebuilt clean (HTTP 200, tsc clean) but Danny tried `localhost:3000/IntroCh03` (old slug) → "Composition not found". Correct URL post-rename: `localhost:3000/WorkshopIntroCh03`. Round-2 alignment fix unverified. Also: timings.json shows scene-1 starts at 0.000s — ElevenLabs swallowed the leading 0.5s break tag → no chapter card before scene 1. Two paths to fix: (A) re-render with `BREAK_LEAD_SEC` 0.5 → 1.5 (~1k credits); (B) live without first card (cards 2-6 still align cleanly).
- **Out of scope this phase:** Renaming Stack/Treatment/Format to the new convention (post-SSL). Mirroring to ch05 (Phase 2). Batch ch01/02/04 (Phase 3).

### Session 13 — Live-mixer UX fixes + starter-template cleanup (23 Apr, 19:46 BST)

- **Resumed post-compact** with the Session 12 kickoff prompt. Danny asked four things: (1) are we looking at mixer sliders, (2) what is FormatExplainer, (3) fix pre-existing lint errors, (4) technical-debt triage.
- **FormatExplainer clarity dug out:** File exists (`src/FormatExplainer.tsx`, Session 7). VO folder (`public/assets/voice/generated/FormatExplainer/`) does NOT exist on disk. Scene IDs (`scene-opener` / `scene-0-agenda` / `scene-2-problem` / `scene-3-container` / `scene-4-interview` / `scene-5-delegate` / `scene-6-outro`) read like a delegation-workflow video, but `HOW-TO-SHIP-AN-EXPLAINER.md` describes it as "output formats + dimensions." Contradiction flagged — Danny needs to pick intent before VO work.
- **Cleanup — `55407c2` "remove remotion-starter leftovers + live-mixer tune":** Deleted `src/HelloWorld.tsx`, full `src/HelloWorld/` folder (Arc, Atom, constants, Logo, Subtitle, Title — 7 files), `src/SSDemo.tsx`. Danny's prior working-tree had already dropped the corresponding `<Composition>` blocks + hardcoded StackExplainer mixer defaults; this commit consolidates. Removed 3 now-dead import lines from `Root.tsx`. ESLint `--fix` landed the `from={0}` auto-fix on `FormatExplainer.tsx:1422`. Added `scripts` to `tsconfig.json` exclude list — `generate-vo.ts` uses ESM features (`import.meta`, dynamic-import options) and runs via `node --strip-types`, not the project's commonjs config. Lint: 7 errors → 0 errors. 647 lines deleted, 8 added.
- **Mixer drag-scrub fix — `afb92dd` "fix mixer drag-scrub granularity":** Perplexity (via Danny's Comet tab) reported "sliders aren't showing; Claude edited the wrong file; use `z.number().step(0.01)`." Both wrong. Source-read verified: `.step()` is not a Zod method; Remotion renders `z.number().min().max()` as `InputDragger` (drag-scrubbable number field with `cursor: 'ew-resize'`, `mousemove` listeners) — NOT an `<input type="range">`. Step came through as `undefined` because no `.multipleOf()` on the schema. Added `.multipleOf(0.01)` to all 4 mixer props on both StackExplainer + TreatmentExplainer schemas. The "slider" was always there — it just couldn't scrub across the 0-1 range.
- **Cache + step refinement — `8c8ec10` "cache VO lengths + tune mixer step to 0.05":** First test drag surfaced a second problem: "calculating metadata" toasts flashing on every drag tick. Cause — `makeCalculateMetadata` re-ran `Promise.allSettled` over 8 `getAudioDurationInSeconds` fetches whenever any schema prop changed (Remotion re-invokes `calculateMetadata` on every prop change). Added module-level `voLengthsCache` (`Map<string, number[]>`) keyed by `sceneAudioFiles.join("|")`. First call does the fetch; subsequent calls return synchronously. Also bumped schema `.multipleOf(0.01)` → `.multipleOf(0.05)` for 20 responsive steps vs 100 imperceptible micro-ticks. Rounded grid-violating constants: `MUSIC_HIGH 0.16 → 0.15` (-0.56 dB, inaudible), `MUSIC_DUCK 0.06 → 0.05` (-1.58 dB, same mixing intent). Picked up Studio's auto-saved StackExplainer `defaultProps` edit (`musicHigh 1 → 0.6`, `musicDuck 0.06 → 0.1`).
- **Remotion API fact catalogued:** There is NO `zSlider` / `zNumberSlider` / auto-rendered `<input type="range">` in Remotion 4. Stock Remotion renders numbers via `ZodNumberEditor.js` → `InputDragger` (horizontal drag-scrub, respects `.min()`/`.max()`/`.multipleOf()`). For a visible track-and-thumb UI, the only path is a separate HTML side-tool writing values to a JSON file read via `staticFile()`. Deferred — the drag-scrubber now works.
- **Commits:** `55407c2`, `afb92dd`, `8c8ec10`. Lint state: 0 errors, 2 pre-existing `@remotion/non-pure-animation` warnings (`StackExplainer:894`, `TreatmentExplainer:470`) untouched.
- **Not done (deliberate):** No StackExplainer MP4 render (Danny still scrubbing). No FormatExplainer VO script (blocked on intent clarification). No visible-slider side-tool (drag-scrubber OK for now). No pre-compact routing tightening (Danny handling in another terminal).

### Session 12 — Wave 1-4 Loom feedback + live mixer + helpers + README refresh (23 Apr, pre-compact)

*(Retroactive entry — master log wasn't updated at end of that conversation. Reconstructed from commit log + kickoff prompt.)*

- **Wave 1-4 Loom feedback — `ddebe64`:** All 13 feedback items landed across StackExplainer + explainer-shared. Music dropped −5 dB: `MUSIC_HIGH 0.28 → 0.16`, `MUSIC_DUCK 0.10 → 0.06`. Added 4 chapter cards (Part 01 / 02 / 03 + Recap). New `SAFE_INSET_X` / `SAFE_INSET_Y` tokens. S1 VO toggled off. S8 renamed envelope → production. NEW `Scene9Recap` (silent 6s). Final comp ~74s. Typecheck clean.
- **Live mixer zod schema — `620ac33`:** Promoted `MUSIC_HIGH` / `MUSIC_DUCK` / `SFX_INTRO_VOLUME` / `SFX_OUTRO_VOLUME` from constants to schema props (`z.number().min(0).max(1)`) on both explainers. Added `MixerProps` type + `DEFAULT_MIXER` const in `src/explainer-shared/metadata.ts`. `buildMusicVolume()` accepts optional `musicHigh` / `musicDuck` overrides. `makeCalculateMetadata` spreads input props so mixer values survive. `Root.tsx`: `defaultProps={{ ...DEFAULT_MIXER }}` on both comps.
- **Cookbook — `d31cade`:** Wrote `HOW-TO-SHIP-AN-EXPLAINER.md` at repo root. 6-step recipe (treatment → VO → music + onsets → composition → Studio scrub → render). The user-facing README for non-technical contributors.
- **Auto-snap helper — `cc839db`:** `scripts/music/auto-snap.ts` — CLI that turns an onset JSON + scene-starts array into a paste-ready `BEAT_SNAP_FRAMES` literal. 4/9 snap on wings onsets with contrived starts. Closes Session 10's 5/10 beat-detection gap.
- **Shortlist → code helper — `cafd54d`:** `scripts/sfx/shortlist-to-code.ts` + generated `src/explainer-shared/sfx-library.ts` — typed SFX path constants from MANIFEST.json `shortlisted: true` items. 18 items across 4 categories. Closes Session 10's 3/10 shortlist gap.
- **Project registry — `bcfb584`:** Added `claude-remotion-flow` entry to `command-centre-memory/project-registry.json` — 34 trigger keywords + 1 capture pattern. Content now routes into new `remotion_flow_decisions` ChromaDB collection instead of bleeding into flights / legal / databrill. Post-session validation: +31 captures, routing confirmed.
- **README refresh — `e9fbe99`:** 11 surgical edits. Repo path updated (remotion-demo → claude-remotion-flow). Package count 30 → 29. Directory tree expanded (explainer-shared/, scripts/, treatments/, out/, cookbook). Compositions table (StackExplainer added, durations now VO-driven). SFX section rewritten around MANIFEST (378 indexed, 18 shortlisted). Voice-pipeline mermaid redrawn (dropped fictional human-VO + Whisper; shows actual ElevenLabs + house-voice + calculateMetadata). Beat-sync mermaid redrawn (dropped `getAudioData()` fiction; shows `detect-onsets → auto-snap → calculateMetadata`). Remotion 4 API updates (`trimBefore`/`trimAfter` → `startFrom`/`endAt`). Aspect-ratio renders: `npx` → `npm run render:*`. New design tokens: `ACCENT_3`, `SAFE_INSET_X/Y`, `CANVAS_W/H`, `GRAIN_SVG`. New sections: npm Scripts table, Helper Scripts table, Live Mixer table.
- **Commits:** `ddebe64`, `620ac33`, `d31cade`, `cc839db`, `cafd54d`, `bcfb584`, `e9fbe99`.

### Session 11 — StackExplainer: composition + explainer-shared extraction (23 Apr)

- **Shipped:** `src/StackExplainer.tsx` (1286 lines) + `src/explainer-shared/` module + TreatmentExplainer refactored onto the shared module. Composition registered in `Root.tsx` at 1920×1080 / 30fps with VO-driven `calculateMetadata`. `npm run render:stack` + `npm run render:treatment` added.
- **explainer-shared extracted:** 5-file module (~479 lines total) cleaving the TreatmentExplainer skeleton into reusable parts —
  - `constants.ts` — timing + audio envelope (TRANS_FRAMES, VO_PRE_PAD, MUSIC_HIGH/DUCK, PRE/POST_ROLL, SFX_* defaults).
  - `tokens.ts` — SSL palette + Inter font + EASE_OUT/TRANS_EASE + grain SVG.
  - `timeline.ts` — `computeTimeline` + `ChapterCardSpec`/`TimelineItem` types; now parameterised over a `cardBefore` array so configs control card placement.
  - `components.tsx` — `SceneBG`, `FadeUp`, `SceneExit`, `FadeToBlack`, `TRANS` factory, `ChapterCard`, `easeIn` helper.
  - `metadata.ts` — `makeCalculateMetadata(config)` factory (reads VO MP3s, sizes scenes, applies beat-snap with safety floor) + `fallbackDurationInFrames(config)` + `buildMusicVolume({visualEnd, voWindows})` factory.
  - Module contract: a composition-specific config (`SCENE_AUDIO_FILES`, `SCENE_VO_ENABLED`, `FALLBACK_SCENE_DURATIONS`, `CARD_BEFORE`, `BEAT_SNAP_FRAMES`, `MUSIC_BED`, `logPrefix`) plugs into the factories. Everything else is inherited. Adding a video #4 is ~90 lines of scaffolding + scene bodies — no audio/timing boilerplate.
- **StackExplainer visuals — 8 scenes (no chapter cards, montage cadence):**
  - **S1 Title** — "From stock Remotion → to a Production Engine" with monospace kicker + gold rule + scaled headline punch-in.
  - **S2 Stock** — ticking clock (one rotation per second, driven by `useCurrentFrame`) + three monospace tags (`<Sequence>`, `<Audio>`, `useCurrentFrame()`) + "a stage · a clock · a tag" caption. Deliberately stark.
  - **S3 Plugins** — 6×3 grid of 18 plugin cards (transitions → zod-types), colour-coded by category (gold → cyan → purple → dim), spring-stagger 3 frames per card.
  - **S4 Design System** — two-column layout: palette swatches (BG gradient, ACCENT, ACCENT_2, TEXT) + scene-skeleton diagram (`calculateMetadata` code fragment + 4-step skeleton ladder).
  - **S5 Voice** — side-by-side: preset JSON reveal (keys appearing line-by-line) + 8 cascading pseudo-waveforms (deterministic seed per scene) with "Script in — MP3s out." payoff.
  - **S6 Library** — auditioner UI mock: tab bar (impacts tab highlighted in gold), 6 rows with ⭐/☆ toggle + 📋 copy button + animated star-pulse on row 0 at frame 55.
  - **S7 Beats** — music waveform (120 bars, sine*cosine envelope, L→R reveal over 45f) + 8 onset markers dropping in at their real `wings-onsets.json` positions + scene-cut line that snaps from 45% to the 27.5s strongest-onset marker (spring anim from frame 95).
  - **S8 Envelope** — three stacked channel rows: (1) whoosh rising sweep, (2) boom radial burst, (3) fade-to-black progress bar filling. Meta-payoff: the video's own ending enacts the envelope the scene is describing.
- **TreatmentExplainer refactor** — stripped 325 lines of duplicate constants/tokens/components/metadata-logic, replaced with 32-line import from `./explainer-shared`. Scene bodies (1–6) + chapter cards + config (SCENE_AUDIO_FILES, SCENE_VO_ENABLED, FALLBACK_SCENE_DURATIONS, CARD_BEFORE, MUSIC_BED, BEAT_SNAP_FRAMES) preserved verbatim. Typecheck clean. File size: 1197 → 872 lines.
- **Beat-snap for StackExplainer — deferred:** The wings bed's strong onsets (376/638/826/1163/1210/1426/1791) don't land within ~25f of the natural scene starts that the VO dictates. Snapping would either bloat the comp by a second+ or ship a long awkward title card. Decision: all `BEAT_SNAP_FRAMES` null for this composition. Session 12 auto-snap helper can revisit with better logic (per-scene budget, looser snap window).
- **npm scripts added:** `render:stack` + `render:treatment` — `remotion render <Id> out/<Id>.mp4`. Runs locally, no Studio required.
- **Studio validation:** Running on :3000 across the session; hot-reload picked up both StackExplainer and the refactored TreatmentExplainer cleanly. Both composition IDs visible in Studio index.
- **Lint state:** StackExplainer + explainer-shared clean. TreatmentExplainer clean (a pre-existing flicker warning at line 465 is untouched). FormatExplainer has a pre-existing `from={0}` redundant-prop error (not touched this session).
- **Not done (deliberate):** No StackExplainer render yet (Danny scrubs in Studio first). No cookbook / README wiring. No auto-snap helper. No shortlist-to-code helper. Those are Session 12.
- **Commit:** `session 11: stackexplainer composition + explainer-shared extraction`.

### Session 10 — StackExplainer: content lock (script + VO + music bed) (23 Apr)

- **Premise:** Third explainer video — *"how we turned stock Remotion into a production video engine"*. Two goals in one: ship video #3, and use it as a forcing function to extract a reusable one-shot template (video README replacement for non-technical users landing on the repo).
- **Plan file:** `/Users/dannymcmillan/.claude/plans/vast-baking-crab.md` — three-session arc: S10 content lock, S11 scenes + skeleton extract, S12 cookbook + auto-snap/shortlist helpers.
- **Pipeline readiness audit:** VO generation 9/10, beat detection 5/10 (manual target picking), shortlist→code 3/10 (manual copy/paste), render loop 2/10 (no npm script). Scene bodies always custom — everything else templatable.
- **Treatment doc written:** `treatments/stack-explainer-vo.md` — 3-layer protocol, Hook-Hold-Payoff skeleton with component montage, 8 scenes × visual/motion/text/audio columns. Meta-payoff: the video ends with the exact envelope (whoosh/boom/fade) it's describing.
- **VO config locked:** `scripts/voice/stack-explainer.config.json` — 8 scenes, 804 chars ≈ 804 credits (0.66% of monthly 121k budget). References `ssl-2026-house-voice.json` preset — no per-scene overrides this pass.
- **VO generated:** 8 MP3s in `public/assets/voice/generated/StackExplainer/`. Total VO runtime **57.92s** (target was ~57s). Per-scene: `1-title 2.97s, 2-stock 6.18s, 3-plugins 9.61s, 4-design-system 7.34s, 5-voice 8.41s, 6-library 7.11s, 7-beats 9.29s, 8-envelope 7.01s`. With pre/post-roll (30f + 60f) + VO padding + transitions, comp target ≈ 62s.
- **Music bed picked autonomously — `penguinmusic-wings-196958.mp3` (83.5s):**
  - Ran `detect-onsets.py` on all three candidates (`emotions-cinematic-ambient`, `wings`, `onaldin cherry-orchard piano`); `through-the-clouds` excluded — already on TreatmentExplainer.
  - Wings scored best: 4 markers ≥ 1.0 strength (vs 1 for emotions, 1 for piano), full-range distribution (12.5s → 59.7s, no dead zones), max strength 1.25 vs TreatmentExplainer's 0.74 top marker — proven different peak profile.
  - Piano (cherry-orchard) rejected: 356 raw onsets — too dense, would fight the VO under ducking.
  - Emotions-cinematic rejected: weak peaks (top 1.14, most 0.67–0.89) + texturally too close to through-the-clouds (same Penguinmusic ambient family).
- **Onset markers captured:** `scripts/music/output/stack-explainer-onsets.json` — 12 markers from 190 raw detections, min_gap 1.5s, strength range 0.84–1.25. Not applied to scene cuts this session (scene bodies don't exist yet). Candidate JSONs kept in `candidates/` for provenance.
- **Out of scope this session (deliberate):** No `src/StackExplainer.tsx` build. No `src/explainer-shared/` extraction. No beat-snap application. No changes to any existing composition.
- **Commit:** `session 10: stackexplainer — script + VO + music bed locked`.

### Session 9 — TreatmentExplainer audio: music bed, beat-snap, cinematic bookends (22 Apr)

- **Context:** Session 7 left two SFX picks (wet stinger + submority boom) that Danny wanted replaced by a full music bed for the audio spine, with the boom re-used as an outro impact on fade-to-black.
- **Music bed wired:** `penguinmusic-through-the-clouds-calming-cinematic-ambient-200392.mp3` (99s source, ~42s visuals). Per-frame ducking callback inside `TreatmentExplainer.tsx`: `MUSIC_HIGH=0.44`, `MUSIC_DUCK=0.18`, `DUCK_RAMP=15f`, `MUSIC_FADE_OUT_FRAMES=75f`. Both high/duck were −2 dB from first pass (Danny: *"keep music much lower when it's incidental"*).
- **Cinematic bookends:**
  - `SFX_INTRO` = `pixabay-ksjsbwuil-whoosh-8` (114f/3.79s) — build-up whoosh.
  - `SFX_OUTRO` = `pixabay-universfield-impact-cinematic-boom` (63f/2.09s) — zero-attack boom.
  - `FadeToBlack` subcomponent (60f fade-in to opacity 1) added to hide the last visual frame behind a clean finish.
- **Pre/post-roll envelope refactor:** The whoosh can't peak *before* the title appears if audio starts at frame 0 = visual start. Fix: wrap visuals in a `<Sequence from={visualStart} durationInFrames={visualFrames}>` and extend comp by `PRE_ROLL_FRAMES + POST_ROLL_FRAMES`. Final tune: `PRE_ROLL=30f` (1.0s, trimmed from 60f — too much black before title), `POST_ROLL=60f` (2.0s — room for boom tail), `SFX_OUTRO_LEAD_IN=20f` (boom attack fires at `visualEnd − 20`, mid-fade not after full black).
- **Beat-snap logic:** New `calculateMetadata` pass adjusts PRIOR scene duration so `sceneStarts[i]` lands on a librosa onset. Safety floor = `voLen + VO_PRE_PAD + TRANS_FRAMES` (scene can never collapse below VO+transition). Applied only cheap snaps: `S2 start → 134f (+22f, onset 4.46s str 0.64)`, `S5 start → 852f (−7f, onset 28.41s str 0.74)`. Far onsets rejected — would bloat comp ≥2s.
- **Autonomous rule locked:** Danny: *"allow you to autonomously make the decision, because when I give this project to non-video makers, they won't pick."* Applied here: music bed volumes, SFX picks from the auditioner library, beat-snap selection — all chosen by Claude, documented in commit message + master log so decisions are auditable.
- **New script:** `scripts/music/detect-onsets.py` — librosa spectral-flux onset detector with greedy min-gap filter. JSON output with `time_s`/`frame`/`strength` per marker. Re-run any music swap in ~2s. Through-the-clouds output saved at `scripts/music/output/through-the-clouds-onsets.json`.
- **Commit:** `ee864b0` — `session 9: treatment audio — music bed, beat-snap, cinematic bookends (intro whoosh / outro boom / fade-to-black)`.

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
