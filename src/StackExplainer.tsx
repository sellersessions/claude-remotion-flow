import React from "react";
import {
  AbsoluteFill,
  Audio,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { TransitionSeries } from "@remotion/transitions";
import { z } from "zod";
import {
  ACCENT,
  ACCENT_2,
  ACCENT_3,
  EASE_OUT,
  FONT,
  MONO,
  PRE_ROLL_FRAMES,
  POST_ROLL_FRAMES,
  SFX_INTRO,
  SFX_INTRO_LEN_FRAMES,
  SFX_INTRO_VOLUME,
  SFX_OUTRO,
  SFX_OUTRO_LEAD_IN_FRAMES,
  SFX_OUTRO_LEN_FRAMES,
  SFX_OUTRO_VOLUME,
  TEXT,
  TEXT_DIM,
  VO_PRE_PAD_FRAMES,
  buildMusicVolume,
  computeTimeline,
  easeIn,
  fallbackDurationInFrames,
  makeCalculateMetadata,
  type ExplainerConfig,
  type ExplainerProps,
  FadeToBlack,
  FadeUp,
  SceneBG,
  SceneExit,
  TRANS,
} from "./explainer-shared";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const SCENE_AUDIO_FILES = [
  "assets/voice/generated/StackExplainer/scene-1-title.mp3",
  "assets/voice/generated/StackExplainer/scene-2-stock.mp3",
  "assets/voice/generated/StackExplainer/scene-3-plugins.mp3",
  "assets/voice/generated/StackExplainer/scene-4-design-system.mp3",
  "assets/voice/generated/StackExplainer/scene-5-voice.mp3",
  "assets/voice/generated/StackExplainer/scene-6-library.mp3",
  "assets/voice/generated/StackExplainer/scene-7-beats.mp3",
  "assets/voice/generated/StackExplainer/scene-8-envelope.mp3",
] as const;

const SCENE_VO_ENABLED = [true, true, true, true, true, true, true, true] as const;

// Animator floors — rough VO-length estimates + padding so the comp is
// sensible even if MP3s haven't been generated yet. Real durations come from
// calculateMetadata reading the audio files.
const FALLBACK_SCENE_DURATIONS = [120, 210, 300, 240, 270, 240, 300, 240] as const;

// No chapter cards for StackExplainer — the 8 scenes form a component
// montage, not a layered teaching arc. Keeping array for type symmetry.
const CARD_BEFORE = [null, null, null, null, null, null, null, null] as const;

// Music bed — penguinmusic-wings (83.5s, 4 onsets ≥ 1.0 strength, different
// texture from TreatmentExplainer's through-the-clouds). Session 10 pick.
const MUSIC_BED = "assets/music/ssl-live-beds/penguinmusic-wings-196958.mp3";

// Beat-snap left empty in the first pass — the wings bed's strong onsets
// (376/638/826/1163/1210/1426/1791) don't land within ~25f of the natural
// scene starts, so snapping would either bloat the comp or ship a long
// awkward title. Session 12 auto-snap helper can revisit.
const BEAT_SNAP_FRAMES = [
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
] as const;

const CONFIG: ExplainerConfig = {
  sceneAudioFiles: SCENE_AUDIO_FILES,
  sceneVoEnabled: SCENE_VO_ENABLED,
  fallbackSceneDurations: FALLBACK_SCENE_DURATIONS,
  cardBefore: CARD_BEFORE,
  beatSnapFrames: BEAT_SNAP_FRAMES,
  logPrefix: "StackExplainer",
};

export const FALLBACK_DURATION_IN_FRAMES = fallbackDurationInFrames(CONFIG);
export const calculateMetadata = makeCalculateMetadata(CONFIG);

export const stackExplainerSchema = z.object({
  voiceover: z.array(z.number()).optional(),
  voLengths: z.array(z.number()).optional(),
});

// ---------------------------------------------------------------------------
// Scene 1 — Title ("From stock Remotion — to a production engine")
// ---------------------------------------------------------------------------

const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1S = spring({ frame: frame - 8, fps, config: { damping: 18, stiffness: 110 } });
  const line1Op = interpolate(line1S, [0, 1], [0, 1]);
  const line1Y = interpolate(line1S, [0, 1], [40, 0]);

  const line2S = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 140 } });
  const line2Scale = interpolate(line2S, [0, 1], [0.88, 1]);
  const line2Op = interpolate(line2S, [0, 1], [0, 1]);

  const ruleW = interpolate(frame, [20, 50], [0, 520], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontFamily: MONO,
              fontSize: 22,
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: ACCENT_2,
              opacity: line1Op,
              transform: `translateY(${line1Y}px)`,
            }}
          >
            From stock Remotion
          </div>
          <div
            style={{
              width: ruleW,
              height: 2,
              background: `linear-gradient(90deg, transparent, ${ACCENT_2}, transparent)`,
              margin: "28px auto",
            }}
          />
          <div
            style={{
              fontSize: 92,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: "-0.03em",
              opacity: line2Op,
              transform: `scale(${line2Scale})`,
              textShadow: `0 0 80px ${ACCENT}55`,
            }}
          >
            to a <span style={{ color: ACCENT_2 }}>Production Engine</span>
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 2 — Stock Remotion ("stage, a clock, and a tag that plays a file")
// Three tags float in; a clock ticks under them. Deliberately plain — this
// is literally "all you get" without plugins.
// ---------------------------------------------------------------------------

const STOCK_TAGS = [
  { label: "<Sequence>", color: TEXT_DIM },
  { label: "<Audio>", color: TEXT_DIM },
  { label: "useCurrentFrame()", color: TEXT_DIM },
];

const Scene2Stock: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const clockAngle = (frame / fps) * 360; // one full rotation per second
  const clockOp = easeIn(frame, 10, 30);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          flexDirection: "column",
          gap: 60,
        }}
      >
        {/* Ticking clock */}
        <div
          style={{
            position: "relative",
            width: 140,
            height: 140,
            borderRadius: "50%",
            border: `2px solid ${TEXT_DIM}`,
            opacity: clockOp,
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 3,
              height: 54,
              background: ACCENT_2,
              transformOrigin: "50% 100%",
              transform: `translate(-50%, -100%) rotate(${clockAngle}deg)`,
              borderRadius: 2,
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 10,
              height: 10,
              background: ACCENT_2,
              borderRadius: "50%",
              transform: "translate(-50%, -50%)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 28 }}>
          {STOCK_TAGS.map((tag, i) => (
            <FadeUp key={tag.label} delay={30 + i * 12} offsetY={24}>
              <div
                style={{
                  fontFamily: MONO,
                  fontSize: 38,
                  color: tag.color,
                  padding: "18px 30px",
                  border: `1px solid ${TEXT_DIM}55`,
                  borderRadius: 14,
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                {tag.label}
              </div>
            </FadeUp>
          ))}
        </div>

        <FadeUp delay={80}>
          <div style={{ fontSize: 28, color: TEXT_DIM, marginTop: 20 }}>
            A stage · a clock · a tag that plays a file.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 3 — Plugins (18 package cards, each fades in on a beat)
// ---------------------------------------------------------------------------

const PLUGIN_PACKAGES: ReadonlyArray<{ name: string; accent: string }> = [
  { name: "transitions", accent: ACCENT_2 },
  { name: "motion-blur", accent: ACCENT_2 },
  { name: "noise", accent: ACCENT_2 },
  { name: "google-fonts", accent: ACCENT_3 },
  { name: "media-utils", accent: ACCENT_3 },
  { name: "media", accent: ACCENT_3 },
  { name: "captions", accent: ACCENT_3 },
  { name: "layout-utils", accent: ACCENT },
  { name: "lottie", accent: ACCENT },
  { name: "paths", accent: ACCENT },
  { name: "shapes", accent: ACCENT },
  { name: "three", accent: ACCENT },
  { name: "rive", accent: ACCENT },
  { name: "tailwind", accent: ACCENT },
  { name: "player", accent: TEXT_DIM },
  { name: "renderer", accent: TEXT_DIM },
  { name: "cli", accent: TEXT_DIM },
  { name: "zod-types", accent: TEXT_DIM },
];

const Scene3Plugins: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 25);
  // Staggered grid reveal — 3 frames per card so the whole 18-card grid
  // materialises over ~55 frames (≈1.8s).
  const PER_CARD_DELAY = 3;
  const REVEAL_START = 20;

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "60px 100px" }}>
        <div
          style={{
            opacity: headerOp,
            fontSize: 46,
            fontWeight: 700,
            color: TEXT,
            marginBottom: 12,
          }}
        >
          We stacked <span style={{ color: ACCENT_2 }}>18 plugins</span> on top.
        </div>
        <div
          style={{
            opacity: headerOp,
            fontFamily: MONO,
            fontSize: 18,
            color: TEXT_DIM,
            marginBottom: 36,
          }}
        >
          all pinned · @remotion/* @ 4.0.448
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(6, 1fr)",
            gap: 14,
          }}
        >
          {PLUGIN_PACKAGES.map((pkg, i) => {
            const delay = REVEAL_START + i * PER_CARD_DELAY;
            const s = spring({
              frame: frame - delay,
              fps,
              config: { damping: 20, stiffness: 180 },
            });
            const op = interpolate(s, [0, 1], [0, 1]);
            const scale = interpolate(s, [0, 1], [0.7, 1]);
            const y = interpolate(s, [0, 1], [14, 0]);

            return (
              <div
                key={pkg.name}
                style={{
                  opacity: op,
                  transform: `scale(${scale}) translateY(${y}px)`,
                  border: `1px solid ${pkg.accent}88`,
                  background: `${pkg.accent}12`,
                  borderRadius: 10,
                  padding: "14px 12px",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 13,
                    color: TEXT_DIM,
                    letterSpacing: "0.02em",
                  }}
                >
                  @remotion/
                </div>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 18,
                    fontWeight: 600,
                    color: pkg.accent,
                    marginTop: 2,
                  }}
                >
                  {pkg.name}
                </div>
              </div>
            );
          })}
        </div>

        <FadeUp delay={100}>
          <div
            style={{
              fontSize: 26,
              color: TEXT_DIM,
              textAlign: "center",
              marginTop: 40,
            }}
          >
            Every cinematic move — a bolt-on.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 4 — Design System (palette swatches + scene-skeleton diagram)
// ---------------------------------------------------------------------------

const PALETTE = [
  { name: "BG", value: "#0C0322 → #461499", swatch: "linear-gradient(140deg, #0C0322, #461499)" },
  { name: "ACCENT", value: "#753EF7", swatch: ACCENT },
  { name: "ACCENT_2", value: "#FBBF24", swatch: ACCENT_2 },
  { name: "TEXT", value: "#FFFFFF", swatch: TEXT },
];

const SKELETON_STEPS = [
  { n: "01", label: "VO_PRE_PAD" },
  { n: "02", label: "sceneBody" },
  { n: "03", label: "SceneExit" },
  { n: "04", label: "TRANS" },
];

const Scene4DesignSystem: React.FC = () => {
  const frame = useCurrentFrame();
  const headerOp = easeIn(frame, 5, 25);
  const leftOp = easeIn(frame, 20, 50);
  const rightOp = easeIn(frame, 40, 75);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "60px 100px" }}>
        <div
          style={{
            opacity: headerOp,
            fontSize: 46,
            fontWeight: 700,
            color: TEXT,
            marginBottom: 36,
          }}
        >
          The <span style={{ color: ACCENT_2 }}>design system</span>.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
          {/* Palette */}
          <div style={{ opacity: leftOp }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: TEXT_DIM,
                letterSpacing: "0.18em",
                marginBottom: 20,
                textTransform: "uppercase",
              }}
            >
              Palette
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {PALETTE.map((p) => (
                <div key={p.name} style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 10,
                      background: p.swatch,
                      border: `1px solid ${TEXT_DIM}33`,
                    }}
                  />
                  <div>
                    <div style={{ fontFamily: MONO, fontSize: 22, color: TEXT, fontWeight: 600 }}>
                      {p.name}
                    </div>
                    <div style={{ fontFamily: MONO, fontSize: 15, color: TEXT_DIM }}>
                      {p.value}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Scene skeleton */}
          <div style={{ opacity: rightOp }}>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: TEXT_DIM,
                letterSpacing: "0.18em",
                marginBottom: 20,
                textTransform: "uppercase",
              }}
            >
              Scene skeleton
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 15,
                color: TEXT_DIM,
                background: "rgba(0,0,0,0.35)",
                border: `1px solid ${ACCENT}44`,
                padding: "16px 18px",
                borderRadius: 10,
                marginBottom: 18,
              }}
            >
              <div style={{ color: ACCENT_2 }}>calculateMetadata</div>
              <div style={{ color: TEXT }}>
                {"  "}&rarr; reads VO · sizes scenes · snaps beats
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {SKELETON_STEPS.map((step) => (
                <div
                  key={step.n}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "10px 16px",
                    border: `1px solid ${TEXT_DIM}33`,
                    borderRadius: 10,
                  }}
                >
                  <div style={{ fontFamily: MONO, fontSize: 14, color: ACCENT_2 }}>
                    {step.n}
                  </div>
                  <div style={{ fontFamily: MONO, fontSize: 20, color: TEXT }}>
                    {step.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <FadeUp delay={100}>
          <div style={{ fontSize: 26, color: TEXT_DIM, textAlign: "center", marginTop: 40 }}>
            One pattern — every video.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 5 — Voice (preset JSON on the left, 8 MP3 waveforms cascading in)
// ---------------------------------------------------------------------------

const PRESET_LINES = [
  { k: '"voice_id"', v: '"jQOgcOzmmipekvxJN09W"' },
  { k: '"model_id"', v: '"eleven_multilingual_v2"' },
  { k: '"stability"', v: "0.31" },
  { k: '"similarity"', v: "1.0" },
  { k: '"speed"', v: "0.9" },
];

const WAVEFORM_BARS = 28;

const Scene5Voice: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 25);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "60px 100px" }}>
        <div style={{ opacity: headerOp, fontSize: 46, fontWeight: 700, color: TEXT, marginBottom: 36 }}>
          The <span style={{ color: ACCENT_2 }}>voice</span>.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60 }}>
          {/* Preset JSON */}
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: TEXT_DIM,
                letterSpacing: "0.18em",
                marginBottom: 18,
                textTransform: "uppercase",
              }}
            >
              ssl-2026-house-voice.json
            </div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 17,
                background: "rgba(0,0,0,0.45)",
                border: `1px solid ${ACCENT_3}44`,
                borderRadius: 12,
                padding: "20px 22px",
                lineHeight: 1.7,
              }}
            >
              <div style={{ color: TEXT_DIM }}>{"{"}</div>
              {PRESET_LINES.map((line, i) => {
                const delay = 25 + i * 10;
                const op = easeIn(frame, delay, delay + 12);
                return (
                  <div key={line.k} style={{ opacity: op, marginLeft: 24 }}>
                    <span style={{ color: ACCENT_3 }}>{line.k}</span>
                    <span style={{ color: TEXT_DIM }}>{": "}</span>
                    <span style={{ color: ACCENT_2 }}>{line.v}</span>
                    {i < PRESET_LINES.length - 1 && <span style={{ color: TEXT_DIM }}>{","}</span>}
                  </div>
                );
              })}
              <div style={{ color: TEXT_DIM }}>{"}"}</div>
            </div>
          </div>

          {/* Waveforms cascading in */}
          <div>
            <div
              style={{
                fontFamily: MONO,
                fontSize: 16,
                color: TEXT_DIM,
                letterSpacing: "0.18em",
                marginBottom: 18,
                textTransform: "uppercase",
              }}
            >
              → 8 MP3s
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n, i) => {
                const delay = 40 + i * 8;
                const s = spring({
                  frame: frame - delay,
                  fps,
                  config: { damping: 22, stiffness: 150 },
                });
                const op = interpolate(s, [0, 1], [0, 1]);
                const x = interpolate(s, [0, 1], [40, 0]);
                return (
                  <div
                    key={n}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      opacity: op,
                      transform: `translateX(${x}px)`,
                    }}
                  >
                    <div
                      style={{
                        fontFamily: MONO,
                        fontSize: 14,
                        color: TEXT_DIM,
                        width: 52,
                      }}
                    >
                      scene-{n}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        flex: 1,
                        height: 30,
                      }}
                    >
                      {Array.from({ length: WAVEFORM_BARS }).map((_, barIdx) => {
                        // Deterministic pseudo-waveform shape per scene.
                        const seed = (n * 13 + barIdx * 7) % 100;
                        const h = 6 + (seed / 100) * 22;
                        return (
                          <div
                            key={barIdx}
                            style={{
                              width: 3,
                              height: h,
                              background: ACCENT_2,
                              borderRadius: 1,
                              opacity: 0.75,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <FadeUp delay={140}>
          <div style={{ fontSize: 26, color: TEXT_DIM, textAlign: "center", marginTop: 30 }}>
            Script in — MP3s out.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 6 — Library (auditioner UI with ⭐ shortlist toggle + 📋 copy path)
// ---------------------------------------------------------------------------

const LIBRARY_ROWS: ReadonlyArray<{
  cat: string;
  file: string;
  dur: string;
  starred?: boolean;
}> = [
  { cat: "transitions", file: "pixabay-ksjsbwuil-whoosh-8", dur: "3.8s", starred: true },
  { cat: "impacts", file: "pixabay-universfield-cinematic-boom", dur: "2.1s", starred: true },
  { cat: "risers", file: "pixabay-tension-build-riser", dur: "5.2s" },
  { cat: "music", file: "penguinmusic-wings", dur: "83.5s", starred: true },
  { cat: "stingers", file: "alex_kizenkov-wet-stinger", dur: "1.2s" },
  { cat: "ambience", file: "pixabay-deep-wind-ambient", dur: "12.4s" },
];

const Scene6Library: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 25);

  // Star toggle animation on row 0 — ⭐ pulses on around frame 55.
  const starPulse = spring({
    frame: frame - 55,
    fps,
    config: { damping: 8, stiffness: 180 },
  });
  const starScale = interpolate(starPulse, [0, 1], [1, 1.4]);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "60px 100px" }}>
        <div style={{ opacity: headerOp, fontSize: 46, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
          The <span style={{ color: ACCENT_2 }}>library</span>.
        </div>
        <div style={{ opacity: headerOp, fontFamily: MONO, fontSize: 16, color: TEXT_DIM, marginBottom: 28 }}>
          378 items · 6 tabs · MANIFEST.json
        </div>

        <div
          style={{
            background: "rgba(0,0,0,0.45)",
            border: `1px solid ${ACCENT}44`,
            borderRadius: 14,
            overflow: "hidden",
          }}
        >
          {/* Tab bar */}
          <div
            style={{
              display: "flex",
              gap: 4,
              padding: "12px 16px",
              borderBottom: `1px solid ${TEXT_DIM}22`,
              fontFamily: MONO,
              fontSize: 14,
            }}
          >
            {["transitions", "stingers", "risers", "impacts", "ambience", "music"].map((t, i) => (
              <div
                key={t}
                style={{
                  padding: "6px 12px",
                  borderRadius: 6,
                  color: i === 3 ? TEXT : TEXT_DIM,
                  background: i === 3 ? `${ACCENT_2}22` : "transparent",
                  border: i === 3 ? `1px solid ${ACCENT_2}88` : "1px solid transparent",
                }}
              >
                {t}
              </div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ display: "flex", flexDirection: "column" }}>
            {LIBRARY_ROWS.map((row, i) => {
              const delay = 30 + i * 6;
              const op = easeIn(frame, delay, delay + 12);
              const isFirst = i === 0;
              return (
                <div
                  key={row.file}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    padding: "14px 18px",
                    borderBottom: `1px solid ${TEXT_DIM}18`,
                    opacity: op,
                    fontFamily: MONO,
                    fontSize: 16,
                  }}
                >
                  <div
                    style={{
                      fontSize: 24,
                      color: row.starred ? ACCENT_2 : TEXT_DIM,
                      transform: isFirst && row.starred ? `scale(${starScale})` : "scale(1)",
                      width: 32,
                    }}
                  >
                    {row.starred ? "★" : "☆"}
                  </div>
                  <div style={{ color: TEXT_DIM, width: 100 }}>{row.cat}</div>
                  <div style={{ color: TEXT, flex: 1 }}>{row.file}</div>
                  <div style={{ color: TEXT_DIM, width: 60, textAlign: "right" }}>{row.dur}</div>
                  <div
                    style={{
                      padding: "4px 10px",
                      border: `1px solid ${TEXT_DIM}55`,
                      borderRadius: 6,
                      color: TEXT_DIM,
                      fontSize: 14,
                    }}
                  >
                    📋 copy
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <FadeUp delay={100}>
          <div style={{ fontSize: 26, color: TEXT_DIM, textAlign: "center", marginTop: 30 }}>
            Shortlist · paste the path · done.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 7 — Beat tracking (music waveform + onset markers snapping a cut)
// Markers positions are the real wings-onsets output, scaled to comp width.
// ---------------------------------------------------------------------------

// Real markers from stack-explainer-onsets.json (wings bed, 83.5s source).
// time_s values; we show the first 8 which fall within the visible window.
const ONSET_TIMES_S = [12.54, 21.28, 27.53, 38.78, 40.34, 41.9, 43.47, 47.53];
const MUSIC_DURATION_S = 83.5;

const Scene7Beats: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 25);

  // Waveform reveal animates left-to-right over ~45f
  const wfProgress = interpolate(frame, [20, 65], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "60px 100px" }}>
        <div style={{ opacity: headerOp, fontSize: 46, fontWeight: 700, color: TEXT, marginBottom: 8 }}>
          <span style={{ color: ACCENT_2 }}>Beat tracking</span>.
        </div>
        <div
          style={{
            opacity: headerOp,
            fontFamily: MONO,
            fontSize: 16,
            color: TEXT_DIM,
            marginBottom: 50,
          }}
        >
          librosa · onset_detect(backtrack=true)
        </div>

        {/* Waveform container */}
        <div
          style={{
            position: "relative",
            height: 180,
            background: "rgba(0,0,0,0.35)",
            border: `1px solid ${ACCENT}44`,
            borderRadius: 12,
            padding: "20px 24px",
            overflow: "hidden",
          }}
        >
          {/* Waveform bars (deterministic shape, reveals L→R) */}
          <div style={{ display: "flex", alignItems: "center", gap: 2, height: "100%" }}>
            {Array.from({ length: 120 }).map((_, i) => {
              const seed = Math.sin(i * 0.8) * Math.cos(i * 0.15);
              const h = 20 + Math.abs(seed) * 90;
              const visible = i / 120 < wfProgress;
              return (
                <div
                  key={i}
                  style={{
                    width: 4,
                    height: h,
                    background: ACCENT_3,
                    borderRadius: 1,
                    opacity: visible ? 0.55 : 0,
                  }}
                />
              );
            })}
          </div>

          {/* Onset markers drop down from the top at their real positions */}
          {ONSET_TIMES_S.map((t, i) => {
            const xPct = (t / MUSIC_DURATION_S) * 100;
            const dropDelay = 55 + i * 6;
            const s = spring({
              frame: frame - dropDelay,
              fps,
              config: { damping: 14, stiffness: 160 },
            });
            const y = interpolate(s, [0, 1], [-40, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);
            return (
              <div
                key={t}
                style={{
                  position: "absolute",
                  left: `${xPct}%`,
                  top: 0,
                  bottom: 0,
                  width: 2,
                  background: ACCENT_2,
                  opacity: op,
                  transform: `translateY(${y}px)`,
                  boxShadow: `0 0 10px ${ACCENT_2}88`,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: -26,
                    left: "50%",
                    transform: "translateX(-50%)",
                    fontFamily: MONO,
                    fontSize: 12,
                    color: ACCENT_2,
                    whiteSpace: "nowrap",
                  }}
                >
                  {t.toFixed(1)}s
                </div>
              </div>
            );
          })}
        </div>

        {/* Scene-cut line snaps onto the 3rd onset (t=27.5s, strongest) */}
        <div style={{ position: "relative", marginTop: 30, height: 80 }}>
          {(() => {
            const targetX = (27.53 / MUSIC_DURATION_S) * 100;
            const snapStart = 95;
            const snap = spring({
              frame: frame - snapStart,
              fps,
              config: { damping: 20, stiffness: 180 },
            });
            // Scene-cut line starts off-center (at 45%) and snaps to targetX.
            const currentX = interpolate(snap, [0, 1], [45, targetX]);
            const op = easeIn(frame, snapStart - 10, snapStart + 5);
            return (
              <>
                <div
                  style={{
                    position: "absolute",
                    left: `${currentX}%`,
                    top: 0,
                    height: 60,
                    width: 3,
                    background: ACCENT,
                    opacity: op,
                    boxShadow: `0 0 16px ${ACCENT}`,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    left: `${currentX}%`,
                    top: 64,
                    transform: "translateX(-50%)",
                    fontFamily: MONO,
                    fontSize: 13,
                    color: ACCENT,
                    whiteSpace: "nowrap",
                    opacity: op,
                  }}
                >
                  scene-cut → snap
                </div>
              </>
            );
          })()}
        </div>

        <FadeUp delay={130}>
          <div style={{ fontSize: 26, color: TEXT_DIM, textAlign: "center", marginTop: 10 }}>
            Cuts land on phrases — VO stays untouched.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Scene 8 — The envelope (whoosh · boom · fade-to-black). The video ends
// with the exact envelope it's describing — so the viewer hears it land.
// ---------------------------------------------------------------------------

const Scene8Envelope: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 25);

  // Three "channel" tracks animate in sequence.
  // (1) Whoosh — diagonal sweep-up line
  // (2) Boom — radial burst
  // (3) Fade to black — progress bar filling
  const whooshStart = 30;
  const boomStart = 70;
  const fadeStart = 110;

  const whooshS = spring({ frame: frame - whooshStart, fps, config: { damping: 22, stiffness: 120 } });
  const whooshProg = interpolate(whooshS, [0, 1], [0, 1]);

  const boomS = spring({ frame: frame - boomStart, fps, config: { damping: 6, stiffness: 300 } });
  const boomScale = interpolate(boomS, [0, 1], [0.2, 1]);
  const boomOp = interpolate(boomS, [0, 1], [0, 1]);

  const fadeProg = interpolate(frame, [fadeStart, fadeStart + 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  const Row: React.FC<{ label: string; children: React.ReactNode; accent: string }> = ({
    label,
    children,
    accent,
  }) => (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 24,
        padding: "18px 24px",
        border: `1px solid ${accent}55`,
        background: `${accent}0C`,
        borderRadius: 14,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          fontSize: 18,
          color: accent,
          width: 160,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {label}
      </div>
      <div style={{ flex: 1, position: "relative", height: 60 }}>{children}</div>
    </div>
  );

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "60px 100px" }}>
        <div style={{ opacity: headerOp, fontSize: 46, fontWeight: 700, color: TEXT, marginBottom: 36 }}>
          The <span style={{ color: ACCENT_2 }}>envelope</span>.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <Row label="Whoosh" accent={ACCENT_3}>
            {/* Rising sweep — thin line that arcs up-right */}
            <div
              style={{
                position: "absolute",
                left: 0,
                bottom: 0,
                width: `${whooshProg * 100}%`,
                height: 3,
                background: `linear-gradient(90deg, transparent, ${ACCENT_3})`,
                transform: `translateY(${-whooshProg * 40}px)`,
                boxShadow: `0 0 12px ${ACCENT_3}`,
              }}
            />
          </Row>

          <Row label="Boom" accent={ACCENT_2}>
            {/* Radial burst at center */}
            <div
              style={{
                position: "absolute",
                left: "50%",
                top: "50%",
                width: 60 * boomScale,
                height: 60 * boomScale,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${ACCENT_2} 0%, transparent 70%)`,
                transform: "translate(-50%, -50%)",
                opacity: boomOp,
              }}
            />
          </Row>

          <Row label="Fade to black" accent={TEXT_DIM}>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: "50%",
                transform: "translateY(-50%)",
                width: "100%",
                height: 20,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${fadeProg * 100}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${TEXT_DIM}, #000)`,
                }}
              />
            </div>
          </Row>
        </div>

        <FadeUp delay={140}>
          <div style={{ fontSize: 26, color: TEXT_DIM, textAlign: "center", marginTop: 40 }}>
            Ships in one pass.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Main composition
// ---------------------------------------------------------------------------

const SCENE_COMPONENTS: React.FC[] = [
  Scene1Title,
  Scene2Stock,
  Scene3Plugins,
  Scene4DesignSystem,
  Scene5Voice,
  Scene6Library,
  Scene7Beats,
  Scene8Envelope,
];

export const StackExplainer: React.FC<ExplainerProps> = ({ voiceover, voLengths }) => {
  const sceneDurations: number[] =
    voiceover && voiceover.length === SCENE_AUDIO_FILES.length
      ? voiceover
      : [...FALLBACK_SCENE_DURATIONS];

  const voLengthsFinal: number[] =
    voLengths && voLengths.length === SCENE_AUDIO_FILES.length
      ? voLengths
      : [...FALLBACK_SCENE_DURATIONS];

  const { sceneStarts, items, totalFrames: visualFrames } = computeTimeline(
    sceneDurations,
    CARD_BEFORE,
  );

  const visualStart = PRE_ROLL_FRAMES;
  const visualEnd = PRE_ROLL_FRAMES + visualFrames;
  const totalFrames = visualEnd + POST_ROLL_FRAMES;

  // Build VO windows in absolute composition frames for the music-duck
  // envelope. Each scene's VO starts at visualStart + sceneStart + pre-pad.
  const voWindows: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < SCENE_AUDIO_FILES.length; i++) {
    if (!SCENE_VO_ENABLED[i]) continue;
    const start = visualStart + sceneStarts[i] + VO_PRE_PAD_FRAMES;
    voWindows.push({ start, end: start + voLengthsFinal[i] });
  }

  const musicVolume = buildMusicVolume({ visualEnd, voWindows });

  return (
    <>
      {/* Music bed — wings (83.5s source, trimmed at totalFrames). */}
      <Audio src={staticFile(MUSIC_BED)} volume={musicVolume} endAt={totalFrames} />

      {/* Intro whoosh — peak lands at PRE_ROLL_FRAMES, under the title. */}
      <Sequence durationInFrames={SFX_INTRO_LEN_FRAMES} name="SFX-intro">
        <Audio src={staticFile(SFX_INTRO)} volume={SFX_INTRO_VOLUME} />
      </Sequence>

      {/* Outro boom — attack lands mid-fade, decay rides into post-roll black. */}
      <Sequence
        from={Math.max(0, visualEnd - SFX_OUTRO_LEAD_IN_FRAMES)}
        durationInFrames={SFX_OUTRO_LEN_FRAMES}
        name="SFX-outro"
      >
        <Audio src={staticFile(SFX_OUTRO)} volume={SFX_OUTRO_VOLUME} />
      </Sequence>

      {/* Voiceover — absolute frames include visualStart offset. */}
      {SCENE_AUDIO_FILES.map((file, i) => {
        if (!SCENE_VO_ENABLED[i]) return null;
        return (
          <Sequence
            key={file}
            from={visualStart + sceneStarts[i] + VO_PRE_PAD_FRAMES}
            durationInFrames={voLengthsFinal[i]}
            name={`VO-${file.split("/").pop()}`}
          >
            <Audio src={staticFile(file)} volume={1.0} />
          </Sequence>
        );
      })}

      {/* Wrap the visual timeline inside the pre/post-roll envelope. */}
      <Sequence from={visualStart} durationInFrames={visualFrames} name="visuals">
        <TransitionSeries>
          {items.flatMap((item, i) => {
            const nodes: React.ReactNode[] = [];
            if (item.kind === "scene") {
              const SceneComp = SCENE_COMPONENTS[item.sceneIndex];
              nodes.push(
                <TransitionSeries.Sequence
                  key={`scene-${item.sceneIndex}`}
                  durationInFrames={item.duration}
                >
                  <SceneExit durationInFrames={item.duration}>
                    <SceneComp />
                  </SceneExit>
                </TransitionSeries.Sequence>,
              );
            }
            if (i < items.length - 1) {
              nodes.push(<React.Fragment key={`trans-${i}`}>{TRANS()}</React.Fragment>);
            }
            return nodes;
          })}
        </TransitionSeries>
      </Sequence>

      {/* Curtain — fades to black across the last FADE_TO_BLACK_FRAMES of the
          visual section; stays fully black through the post-roll so the boom's
          decay plays into darkness. Meta-payoff: the scene 8 label describes
          what's literally happening on screen as this subcomponent fires. */}
      <FadeToBlack visualEnd={visualEnd} />
    </>
  );
};
