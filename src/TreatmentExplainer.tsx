import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Easing,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import {
  TransitionSeries,
  linearTiming,
} from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { loadFont } from "@remotion/google-fonts/Inter";
import { noise2D } from "@remotion/noise";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { z } from "zod";

// ---------------------------------------------------------------------------
// VO scaffolding
// ---------------------------------------------------------------------------

const FPS = 30;
const TRANS_FRAMES = 8; // must match TRANS() below

// VO anchoring — keeps the voice from butting against scene start/end.
// Pre-pad lets the animation establish before VO lands; post-pad gives a tail
// so the voice doesn't hit the cross-fade.
const VO_PRE_PAD_FRAMES = 15; // ~0.5s
const VO_POST_PAD_FRAMES = 20; // ~0.67s

const SCENE_AUDIO_FILES = [
  "assets/voice/generated/TreatmentExplainer/scene-1-title.mp3",
  "assets/voice/generated/TreatmentExplainer/scene-2-layers.mp3",
  "assets/voice/generated/TreatmentExplainer/scene-3-brief.mp3",
  "assets/voice/generated/TreatmentExplainer/scene-4-skeletons.mp3",
  "assets/voice/generated/TreatmentExplainer/scene-5-treatment.mp3",
  "assets/voice/generated/TreatmentExplainer/scene-6-pipeline.mp3",
] as const;

// Per-scene VO enable flag. Scene 1 is visual-only — the title card already
// says "Brief any video in three layers" on screen, so repeating it in VO
// felt redundant. File is kept on disk in case we want it back.
const SCENE_VO_ENABLED = [false, true, true, true, true, true] as const;

// Animator's original scene intent (pre-VO) — used as the floor so scenes
// never compress below the timing the visuals were designed around.
const FALLBACK_SCENE_DURATIONS = [120, 180, 210, 270, 240, 180] as const;

// Chapter cards — brief "Layer X — The Brief" screens between major sections.
// Inserted BEFORE the scene at their index. null = no card before that scene.
const CARD_DURATION_FRAMES = 45; // 1.5s: 12 fade in · 21 hold · 12 fade out
type ChapterCardSpec = { label: string; title: string };
const CARD_BEFORE: Array<ChapterCardSpec | null> = [
  null, // before S1 (title)
  null, // before S2 (overview)
  { label: "Layer 01", title: "The Brief" },      // before S3
  { label: "Layer 02", title: "The Skeleton" },   // before S4
  { label: "Layer 03", title: "The Treatment" },  // before S5
  null, // before S6 (pipeline)
];

// Music bed — calming cinematic ambient, 98.95s source trimmed to comp length.
// Both volumes dropped −2 dB from the first pass (0.55/0.22 → 0.44/0.18) so the
// bed sits as incidental backing rather than fighting the VO.
const MUSIC_BED = "assets/music/ssl-live-beds/penguinmusic-through-the-clouds-calming-cinematic-ambient-200392.mp3";
const MUSIC_HIGH = 0.44;
const MUSIC_DUCK = 0.18;
const DUCK_RAMP = 15; // frames to ramp in/out of a VO window
const MUSIC_FADE_OUT_FRAMES = 75; // 2.5s tail — source is 99s, comp is 42s, needs a soft landing
const FADE_TO_BLACK_FRAMES = 60; // 2.0s visual fade, ends aligned with music fade

// Pre-roll lets the intro whoosh BUILD before the title lands — peak of the
// sweep hits at the moment the title fades in, instead of the sweep starting
// under an already-visible title.
// Post-roll gives the outro boom's decay room to finish naturally (its attack
// is zero-frame so the tail needs space to breathe into silence + black).
const PRE_ROLL_FRAMES = 30;   // 1.0s — trimmed from 2.0s: black-before-title was dragging
const POST_ROLL_FRAMES = 60;  // 2.0s — room for boom tail (ends visualEnd+43) + silent black
// Outro boom fires a bit before visualEnd so it doesn't feel "late": attack
// lands while the screen is still mid-fade, then decay resolves into black.
const SFX_OUTRO_LEAD_IN_FRAMES = 20; // boom start = visualEnd − 20

// SFX bookends — Danny's picks. Intro whoosh fires at t=0 over the title.
// Outro boom starts when the music fade begins so the attack punches the
// transition and the decay absorbs into the fade-to-black — avoids the
// perceptual "clipping" of an unsignposted ending.
const SFX_INTRO = "assets/sfx/library/transitions/pixabay-ksjsbwuil-whoosh-8-6b32a439bc.mp3";
const SFX_OUTRO = "assets/sfx/library/impacts/pixabay-universfield-impact-cinematic-boom-be1e4daf3e.mp3";
const SFX_INTRO_LEN_FRAMES = 114; // 3.79s source — peak lands at PRE_ROLL_FRAMES
const SFX_OUTRO_LEN_FRAMES = 63;  // 2.09s — zero-attack boom + decay
// Boom attack fires at the end of the visual section (visual_end) so its hit
// punches the fade-to-black moment; decay rides through the post-roll.

// Beat-snap — shift scene starts onto librosa onset markers where the cost is
// trivial. Source: scripts/music/output/through-the-clouds-onsets.json.
// We only snap when the delta is under ~25 frames. Everything else would
// bloat the comp length for a marginal musical payoff.
//   S2: native 112 → 134 (+22f, onset strength 0.64 @ 4.46s)
//   S5: native 859 → 852 (−7f, onset strength 0.74 @ 28.41s)
// Net comp change: +15 frames (0.5s).
const BEAT_SNAP_FRAMES: Array<number | null> = [
  null, // S1 title — no snap (music just starts)
  134,  // S2 overview — onset at 4.46s
  null, // S3 brief — nearest onset 68f away, too far
  null, // S4 skeleton — nearest onset 98f away, too far
  852,  // S5 treatment — onset at 28.41s, basically already locked
  null, // S6 pipeline — nearest onset past comp end
];

// Includes chapter card durations so the composition length is correct when
// VO files are missing (fallback branch in calculateMetadata).
const CARD_COUNT = CARD_BEFORE.filter(Boolean).length;
export const FALLBACK_DURATION_IN_FRAMES =
  PRE_ROLL_FRAMES +
  FALLBACK_SCENE_DURATIONS.reduce((s, d) => s + d, 0) +
  CARD_COUNT * CARD_DURATION_FRAMES -
  (FALLBACK_SCENE_DURATIONS.length + CARD_COUNT - 1) * TRANS_FRAMES +
  POST_ROLL_FRAMES;

export const treatmentExplainerSchema = z.object({
  voiceover: z.array(z.number()).optional(), // scene durations (frames)
  voLengths: z.array(z.number()).optional(), // raw VO audio lengths (frames)
});

type TreatmentExplainerProps = z.infer<typeof treatmentExplainerSchema>;

export const calculateMetadata: CalculateMetadataFunction<TreatmentExplainerProps> =
  async () => {
    const results = await Promise.allSettled(
      SCENE_AUDIO_FILES.map(async (file) => {
        try {
          const src = staticFile(file);
          const secs = await getAudioDurationInSeconds(src);
          return secs * FPS;
        } catch {
          return null;
        }
      }),
    );

    const voLengths: number[] = results.map((r, i) => {
      if (r.status === "fulfilled" && r.value !== null) {
        return Math.ceil(r.value);
      }
      console.warn(
        `[TreatmentExplainer] VO file missing or unreadable: ${SCENE_AUDIO_FILES[i]}. ` +
          `Falling back to ${FALLBACK_SCENE_DURATIONS[i]} frames.`,
      );
      return 0;
    });

    const allFallback = results.every((r) => r.status === "rejected" || r.value === null);
    if (allFallback) {
      console.warn(
        "[TreatmentExplainer] No VO files found — using hardcoded duration. " +
          "Run the ElevenLabs generation script to populate public/assets/voice/generated/TreatmentExplainer/",
      );
      return {
        durationInFrames: FALLBACK_DURATION_IN_FRAMES,
        props: {
          voiceover: [...FALLBACK_SCENE_DURATIONS],
          voLengths: [...FALLBACK_SCENE_DURATIONS],
        },
      };
    }

    // Scene = max(VO + pre-pad + post-pad, animator fallback)
    // Guarantees the visuals always have at least their intended breathing room.
    const sceneDurations: number[] = voLengths.map((vo, i) => {
      const padded = vo + VO_PRE_PAD_FRAMES + VO_POST_PAD_FRAMES;
      return Math.ceil(Math.max(padded, FALLBACK_SCENE_DURATIONS[i]));
    });

    // Beat-snap pass — nudge scene boundaries so targeted scene starts land on
    // music onsets. We shift by adjusting the PRIOR scene's duration; VO audio
    // is never sped/slowed and never clipped (safety floor = VO + pre-pad + trans).
    for (let i = 1; i < sceneDurations.length; i++) {
      const target = BEAT_SNAP_FRAMES[i];
      if (target == null) continue;
      const { sceneStarts } = computeTimeline(sceneDurations);
      const delta = target - sceneStarts[i];
      if (delta === 0) continue;
      const prior = i - 1;
      const voLenPrior = voLengths[prior] ?? 0;
      const minPrior = voLenPrior + VO_PRE_PAD_FRAMES + TRANS_FRAMES;
      sceneDurations[prior] = Math.max(minPrior, sceneDurations[prior] + delta);
    }

    const { totalFrames: visualFrames } = computeTimeline(sceneDurations);
    const totalFrames = PRE_ROLL_FRAMES + visualFrames + POST_ROLL_FRAMES;

    return {
      durationInFrames: Math.ceil(totalFrames),
      props: { voiceover: sceneDurations, voLengths },
    };
  };

type TimelineItem =
  | { kind: "scene"; sceneIndex: number; duration: number; start: number }
  | { kind: "card"; card: ChapterCardSpec; duration: number; start: number };

function computeTimeline(sceneDurations: number[]): {
  sceneStarts: number[];
  items: TimelineItem[];
  totalFrames: number;
} {
  // 1. Build render order (cards interleaved before their target scene).
  const raw: Array<
    | { kind: "scene"; sceneIndex: number; duration: number }
    | { kind: "card"; card: ChapterCardSpec; duration: number }
  > = [];
  for (let i = 0; i < sceneDurations.length; i++) {
    const card = CARD_BEFORE[i];
    if (card) raw.push({ kind: "card", card, duration: CARD_DURATION_FRAMES });
    raw.push({ kind: "scene", sceneIndex: i, duration: sceneDurations[i] });
  }

  // 2. Compute cumulative starts with transition overlap.
  const sceneStarts: number[] = new Array(sceneDurations.length).fill(0);
  const items: TimelineItem[] = [];
  let cursor = 0;
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (item.kind === "scene") {
      items.push({ ...item, start: cursor });
      sceneStarts[item.sceneIndex] = cursor;
    } else {
      items.push({ ...item, start: cursor });
    }
    cursor += item.duration - (i < raw.length - 1 ? TRANS_FRAMES : 0);
  }

  const last = items[items.length - 1];
  const totalFrames = last.start + last.duration;

  return { sceneStarts, items, totalFrames };
}

const { fontFamily: INTER } = loadFont();

// Design tokens — matching SSL palette
const BG = "linear-gradient(140deg, #0C0322, #1a1a2e, #461499)";
const ACCENT = "#753EF7";
const ACCENT_2 = "#FBBF24";
const TEXT = "#ffffff";
const TEXT_DIM = "#a0a0b0";
const FONT = `${INTER}, system-ui, sans-serif`;
const MONO = "ui-monospace, SFMono-Regular, Menlo, monospace";
const EASE_OUT = Easing.bezier(0.16, 1, 0.3, 1);
const TRANS_EASE = Easing.bezier(0.4, 0, 0.2, 1);

const GRAIN_SVG =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")";

// --- SHARED COMPONENTS ---

const SceneBG: React.FC = () => {
  const frame = useCurrentFrame();
  const dx = noise2D("dx", frame / 90, 0) * 2;
  const dy = noise2D("dy", 0, frame / 90) * 2;
  return (
    <>
      <AbsoluteFill style={{ background: BG, transform: `translate(${dx}px, ${dy}px)` }} />
      <AbsoluteFill style={{ opacity: 0.035, mixBlendMode: "overlay", backgroundImage: GRAIN_SVG }} />
    </>
  );
};

const easeIn = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

const FadeUp: React.FC<{
  delay: number;
  children: React.ReactNode;
  offsetY?: number;
}> = ({ delay, children, offsetY = 40 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 120 } });
  const y = interpolate(s, [0, 1], [offsetY, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  return (
    <div style={{ opacity: op, transform: `translateY(${y}px)` }}>
      {children}
    </div>
  );
};

// --- SCENE 1: TITLE CARD (120f / 4s) ---

const Scene1Title: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 100 } });
  const titleY = interpolate(titleS, [0, 1], [80, 0]);
  const titleOp = interpolate(titleS, [0, 1], [0, 1]);

  const subS = spring({ frame: frame - 30, fps, config: { damping: 20, stiffness: 100 } });
  const subOp = interpolate(subS, [0, 1], [0, 1]);
  const subY = interpolate(subS, [0, 1], [30, 0]);

  const lineW = interpolate(frame, [20, 50], [0, 400], {
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
              fontSize: 88,
              fontWeight: 800,
              color: TEXT,
              letterSpacing: "-0.03em",
              opacity: titleOp,
              transform: `translateY(${titleY}px)`,
              textShadow: `0 0 60px ${ACCENT}66`,
            }}
          >
            How to Brief a Video
          </div>
          <div
            style={{
              width: lineW,
              height: 3,
              background: `linear-gradient(90deg, transparent, ${ACCENT_2}, transparent)`,
              margin: "24px auto",
            }}
          />
          <div
            style={{
              fontSize: 36,
              fontWeight: 400,
              color: TEXT_DIM,
              opacity: subOp,
              transform: `translateY(${subY}px)`,
            }}
          >
            A 3-layer framework for anyone
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- SCENE 2: THE 3 LAYERS OVERVIEW (180f / 6s) ---

const LAYERS = [
  { num: "1", label: "THE BRIEF", sub: "What do I want?", color: ACCENT_2 },
  { num: "2", label: "THE SKELETON", sub: "What shape is the story?", color: ACCENT },
  { num: "3", label: "THE TREATMENT", sub: "Scene-by-scene execution", color: "#22d3ee" },
];

const Scene2Layers: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 25);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "80px 120px" }}>
        <div style={{ opacity: headerOp, fontSize: 52, fontWeight: 700, color: TEXT, marginBottom: 60 }}>
          Every video follows <span style={{ color: ACCENT_2 }}>three layers</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>
          {LAYERS.map((layer, i) => {
            const delay = 25 + i * 20;
            const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 120 } });
            const x = interpolate(s, [0, 1], [-200, 0]);
            const op = interpolate(s, [0, 1], [0, 1]);

            // Arrow between layers
            const arrowOp = i < 2 ? interpolate(frame, [delay + 15, delay + 25], [0, 1], {
              extrapolateLeft: "clamp", extrapolateRight: "clamp",
            }) : 0;

            return (
              <div key={i}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 32,
                    opacity: op,
                    transform: `translateX(${x}px)`,
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: 16,
                      border: `2px solid ${layer.color}`,
                      background: `${layer.color}15`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 36,
                      fontWeight: 800,
                      color: layer.color,
                      flexShrink: 0,
                    }}
                  >
                    {layer.num}
                  </div>
                  <div>
                    <div style={{ fontSize: 40, fontWeight: 700, color: TEXT, letterSpacing: "0.05em" }}>
                      {layer.label}
                    </div>
                    <div style={{ fontSize: 28, color: TEXT_DIM, marginTop: 4 }}>
                      {layer.sub}
                    </div>
                  </div>
                </div>
                {i < 2 && (
                  <div
                    style={{
                      marginLeft: 38,
                      height: 30,
                      width: 4,
                      background: `linear-gradient(to bottom, ${layer.color}88, ${LAYERS[i + 1].color}88)`,
                      opacity: arrowOp,
                      marginTop: 8,
                      marginBottom: 8,
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- SCENE 3: CREATIVE BRIEF (210f / 7s) ---

const BRIEF_FIELDS = [
  { field: "Objective", example: "What must this video DO?", icon: "🎯" },
  { field: "Audience", example: "Who watches? What do they believe?", icon: "👥" },
  { field: "Key Message", example: "If they remember one thing...", icon: "💬" },
  { field: "Tone", example: "3-5 adjectives: cinematic, urgent, premium", icon: "🎨" },
  { field: "References", example: "2-3 videos that FEEL right", icon: "🔗" },
  { field: "Deliverables", example: "Duration, aspect ratio, platform", icon: "📐" },
];

const Scene3Brief: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 20);

  // Highlight badge
  const badgeS = spring({ frame: frame - 8, fps, config: { damping: 20, stiffness: 140 } });
  const badgeScale = interpolate(badgeS, [0, 1], [0.5, 1]);
  const badgeOp = interpolate(badgeS, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "70px 100px" }}>
        {/* Layer badge */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              padding: "6px 20px",
              borderRadius: 30,
              background: `${ACCENT_2}25`,
              border: `1px solid ${ACCENT_2}`,
              fontSize: 20,
              fontWeight: 700,
              color: ACCENT_2,
              letterSpacing: "0.08em",
              opacity: badgeOp,
              transform: `scale(${badgeScale})`,
            }}
          >
            LAYER 1
          </div>
        </div>

        <div style={{ opacity: headerOp, fontSize: 52, fontWeight: 700, color: TEXT, marginBottom: 48 }}>
          The Creative Brief
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px 48px" }}>
          {BRIEF_FIELDS.map((item, i) => {
            const delay = 20 + i * 12;
            const s = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 130 } });
            const op = interpolate(s, [0, 1], [0, 1]);
            const y = interpolate(s, [0, 1], [30, 0]);

            return (
              <div
                key={i}
                style={{
                  opacity: op,
                  transform: `translateY(${y}px)`,
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 16,
                  padding: "16px 20px",
                  borderRadius: 14,
                  background: "rgba(26, 26, 46, 0.5)",
                  border: "1px solid rgba(117, 62, 247, 0.2)",
                }}
              >
                <div style={{ fontSize: 32, flexShrink: 0, marginTop: 2 }}>{item.icon}</div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>{item.field}</div>
                  <div style={{ fontSize: 20, color: TEXT_DIM, marginTop: 4 }}>{item.example}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom note */}
        <FadeUp delay={90}>
          <div
            style={{
              marginTop: 40,
              fontSize: 24,
              color: ACCENT_2,
              fontStyle: "italic",
              textAlign: "center",
            }}
          >
            The References field is the escape hatch — "I know it when I see it" works here
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- SCENE 4: FOUR SKELETONS (270f / 9s) ---

const SKELETONS = [
  {
    name: "Beat Sheet",
    use: "Telling a story",
    beats: ["Hook", "Setup", "Turn", "Proof", "Resolve"],
    color: "#22d3ee",
  },
  {
    name: "Problem-Agitate-Solve",
    use: "Selling a product",
    beats: ["Problem", "Agitate", "Solve", "Outcome"],
    color: "#f97316",
  },
  {
    name: "Hook-Hold-Payoff",
    use: "Social retention",
    beats: ["Hook 3s", "Hold 17s", "Payoff 10s"],
    color: "#a855f7",
  },
  {
    name: "Energy Map",
    use: "Audio drives the edit",
    beats: ["Intro", "Build", "Drop", "Groove", "Resolve"],
    color: "#34d399",
  },
];

const Scene4Skeletons: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 20);

  // Highlight which skeleton is "active" — cycles through them
  const activeIdx = frame < 60 ? -1 : Math.min(3, Math.floor((frame - 60) / 45));

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "70px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              padding: "6px 20px",
              borderRadius: 30,
              background: `${ACCENT}25`,
              border: `1px solid ${ACCENT}`,
              fontSize: 20,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: "0.08em",
            }}
          >
            LAYER 2
          </div>
        </div>

        <div style={{ opacity: headerOp, fontSize: 48, fontWeight: 700, color: TEXT, marginBottom: 20 }}>
          Pick Your Shape
        </div>
        <div style={{ fontSize: 26, color: TEXT_DIM, marginBottom: 40, opacity: headerOp }}>
          What does the video need to do?
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 28 }}>
          {SKELETONS.map((skel, i) => {
            const delay = 25 + i * 18;
            const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 130 } });
            const op = interpolate(s, [0, 1], [0, 1]);
            const scale = interpolate(s, [0, 1], [0.9, 1]);
            const isActive = activeIdx === i;
            const glowOp = isActive ? 0.4 : 0;

            return (
              <div
                key={i}
                style={{
                  opacity: op,
                  transform: `scale(${scale})`,
                  padding: "28px 32px",
                  borderRadius: 18,
                  background: isActive ? `${skel.color}12` : "rgba(26, 26, 46, 0.5)",
                  border: `2px solid ${isActive ? skel.color : "rgba(117, 62, 247, 0.2)"}`,
                  boxShadow: isActive ? `0 0 40px ${skel.color}${Math.round(glowOp * 255).toString(16).padStart(2, "0")}` : "none",
                  transition: "all 0.3s",
                }}
              >
                <div style={{ fontSize: 30, fontWeight: 700, color: skel.color, marginBottom: 6 }}>
                  {skel.name}
                </div>
                <div style={{ fontSize: 22, color: TEXT_DIM, marginBottom: 16 }}>
                  {skel.use}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {skel.beats.map((beat, bi) => {
                    const beatDelay = delay + 10 + bi * 5;
                    const beatOp = interpolate(frame, [beatDelay, beatDelay + 10], [0, 1], {
                      extrapolateLeft: "clamp",
                      extrapolateRight: "clamp",
                    });
                    return (
                      <div
                        key={bi}
                        style={{
                          padding: "4px 14px",
                          borderRadius: 20,
                          background: `${skel.color}20`,
                          border: `1px solid ${skel.color}55`,
                          fontSize: 18,
                          color: TEXT,
                          opacity: beatOp,
                        }}
                      >
                        {beat}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- SCENE 5: THE TREATMENT DOC (240f / 8s) ---

const TREATMENT_LINES = [
  { type: "header", text: "SCENE 1 — Hook (0:00–0:03)" },
  { type: "field", label: "Visual", text: "Logo explodes from particles" },
  { type: "field", label: "Motion", text: "spring({ damping: 14 }) → overshoot settle" },
  { type: "field", label: "Text", text: '"Built for Innovators."' },
  { type: "field", label: "Audio", text: "Riser → impact hit at frame 92" },
  { type: "spacer", text: "" },
  { type: "header", text: "SCENE 2 — Setup (0:03–0:10)" },
  { type: "field", label: "Visual", text: "Speaker cards scroll vertically" },
  { type: "field", label: "Motion", text: "Auto-pan, staggered 120ms delay" },
  { type: "field", label: "Text", text: "Speaker name + role + time" },
  { type: "field", label: "Audio", text: "Music bed, vol 0.55" },
];

const Scene5Treatment: React.FC = () => {
  const frame = useCurrentFrame();

  const headerOp = easeIn(frame, 5, 20);

  // Scroll the treatment doc up slowly
  const scrollY = interpolate(frame, [80, 220], [0, -120], {
    easing: EASE_OUT,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ padding: "70px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
          <div
            style={{
              padding: "6px 20px",
              borderRadius: 30,
              background: "rgba(34, 211, 238, 0.15)",
              border: "1px solid #22d3ee",
              fontSize: 20,
              fontWeight: 700,
              color: "#22d3ee",
              letterSpacing: "0.08em",
            }}
          >
            LAYER 3
          </div>
        </div>

        <div style={{ opacity: headerOp, fontSize: 48, fontWeight: 700, color: TEXT, marginBottom: 36 }}>
          The Treatment Document
        </div>

        {/* Fake code editor / document */}
        <div
          style={{
            background: "rgba(10, 3, 20, 0.8)",
            border: "1px solid rgba(117, 62, 247, 0.3)",
            borderRadius: 16,
            padding: "32px 40px",
            overflow: "hidden",
            maxHeight: 520,
          }}
        >
          <div style={{ transform: `translateY(${scrollY}px)` }}>
            {TREATMENT_LINES.map((line, i) => {
              const delay = 15 + i * 8;
              const lineOp = interpolate(frame, [delay, delay + 12], [0, 1], {
                extrapolateLeft: "clamp",
                extrapolateRight: "clamp",
              });

              if (line.type === "spacer") {
                return <div key={i} style={{ height: 20 }} />;
              }

              if (line.type === "header") {
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 28,
                      fontWeight: 700,
                      color: ACCENT_2,
                      marginBottom: 12,
                      marginTop: i > 0 ? 8 : 0,
                      opacity: lineOp,
                      fontFamily: MONO,
                    }}
                  >
                    {line.text}
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    gap: 16,
                    marginBottom: 8,
                    opacity: lineOp,
                    fontSize: 22,
                    fontFamily: MONO,
                  }}
                >
                  <span style={{ color: ACCENT, fontWeight: 600, minWidth: 90 }}>
                    {line.label}:
                  </span>
                  <span style={{ color: TEXT_DIM }}>{line.text}</span>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- SCENE 6: THE PIPELINE FLOW + CTA (180f / 6s) ---

const FLOW_STEPS = [
  { label: "Brief", sub: "What do I want?", color: ACCENT_2 },
  { label: "Skeleton", sub: "Pick the shape", color: ACCENT },
  { label: "Treatment", sub: "Scene by scene", color: "#22d3ee" },
  { label: "Remotion", sub: "Claude builds it", color: "#34d399" },
  { label: "Ship", sub: "Render + publish", color: "#f43f5e" },
];

const Scene6Pipeline: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOp = easeIn(frame, 5, 20);

  return (
    <AbsoluteFill style={{ fontFamily: FONT }}>
      <SceneBG />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 100px" }}>
        <div style={{ textAlign: "center", marginBottom: 60, opacity: headerOp }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: TEXT }}>
            From idea to video
          </div>
        </div>

        {/* Horizontal pipeline */}
        <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
          {FLOW_STEPS.map((step, i) => {
            const delay = 15 + i * 18;
            const s = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
            const scale = interpolate(s, [0, 1], [0.5, 1]);
            const op = interpolate(s, [0, 1], [0, 1]);

            // Arrow between steps
            const arrowDelay = delay + 10;
            const arrowW = i < FLOW_STEPS.length - 1
              ? interpolate(frame, [arrowDelay, arrowDelay + 12], [0, 48], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                })
              : 0;

            return (
              <div key={i} style={{ display: "flex", alignItems: "center" }}>
                <div
                  style={{
                    opacity: op,
                    transform: `scale(${scale})`,
                    textAlign: "center",
                    minWidth: 160,
                  }}
                >
                  <div
                    style={{
                      width: 72,
                      height: 72,
                      borderRadius: 16,
                      border: `2px solid ${step.color}`,
                      background: `${step.color}18`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      fontSize: 28,
                      fontWeight: 800,
                      color: step.color,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: TEXT }}>{step.label}</div>
                  <div style={{ fontSize: 18, color: TEXT_DIM, marginTop: 4 }}>{step.sub}</div>
                </div>
                {i < FLOW_STEPS.length - 1 && (
                  <div
                    style={{
                      width: arrowW,
                      height: 3,
                      background: `linear-gradient(90deg, ${step.color}, ${FLOW_STEPS[i + 1].color})`,
                      margin: "0 4px",
                      marginBottom: 50,
                      borderRadius: 2,
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom tagline */}
        <FadeUp delay={100}>
          <div
            style={{
              marginTop: 60,
              fontSize: 30,
              color: TEXT_DIM,
              textAlign: "center",
            }}
          >
            You describe it. Claude builds it. Remotion renders it.
          </div>
        </FadeUp>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- TRANSITION + SCENE EXIT WRAPPERS ---

const TRANS = () => (
  <TransitionSeries.Transition
    presentation={fade()}
    timing={linearTiming({ durationInFrames: 8, easing: TRANS_EASE })}
  />
);

const EXIT_FRAMES = 14;

const SceneExit: React.FC<{ durationInFrames: number; children: React.ReactNode }> = ({
  durationInFrames,
  children,
}) => {
  const frame = useCurrentFrame();
  const exitStart = durationInFrames - EXIT_FRAMES;
  const p = interpolate(frame, [exitStart, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.4, 0, 0.2, 1),
  });
  return (
    <AbsoluteFill style={{ opacity: 1 - p, transform: `scale(${1 - p * 0.04})` }}>
      {children}
    </AbsoluteFill>
  );
};

// --- CHAPTER CARD (brief screen-holder between major sections) ---

const ChapterCard: React.FC<{
  card: ChapterCardSpec;
  durationInFrames: number;
}> = ({ card, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = Math.min(10, Math.floor(durationInFrames / 3));
  const fadeOut = Math.min(10, Math.floor(durationInFrames / 3));
  const fadeOutStart = durationInFrames - fadeOut;

  const op = interpolate(
    frame,
    [0, fadeIn, fadeOutStart, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT },
  );

  // Horizontal rule sweeps in from the center during fade-in
  const ruleScale = interpolate(frame, [0, fadeIn + 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });

  return (
    <AbsoluteFill>
      <SceneBG />
      <AbsoluteFill
        style={{
          opacity: op,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 24,
        }}
      >
        <div
          style={{
            fontFamily: MONO,
            fontSize: 24,
            letterSpacing: "0.32em",
            textTransform: "uppercase",
            color: ACCENT_2,
            opacity: 0.9,
          }}
        >
          {card.label}
        </div>
        <div
          style={{
            width: 280,
            height: 1,
            background: `linear-gradient(90deg, transparent, ${TEXT_DIM}, transparent)`,
            transform: `scaleX(${ruleScale})`,
          }}
        />
        <div
          style={{
            fontFamily: FONT,
            fontSize: 92,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            color: TEXT,
            textAlign: "center",
          }}
        >
          {card.title}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// --- MAIN COMPOSITION (VO-driven) ---

const SCENE_COMPONENTS: React.FC[] = [
  Scene1Title,
  Scene2Layers,
  Scene3Brief,
  Scene4Skeletons,
  Scene5Treatment,
  Scene6Pipeline,
];

// Last-N-frames black curtain. Wrapped in its own component so it can call
// useCurrentFrame without forcing the main composition to subscribe.
const FadeToBlack: React.FC<{ visualEnd: number }> = ({ visualEnd }) => {
  const frame = useCurrentFrame();
  // 0 → 1 across the last FADE_TO_BLACK_FRAMES of the visual section; holds
  // at 1 through the post-roll so the screen stays black for the boom tail.
  const opacity = interpolate(
    frame,
    [visualEnd - FADE_TO_BLACK_FRAMES, visualEnd],
    [0, 1],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill
      style={{ backgroundColor: "#000", opacity, pointerEvents: "none" }}
    />
  );
};

export const TreatmentExplainer: React.FC<TreatmentExplainerProps> = ({ voiceover, voLengths }) => {
  const sceneDurations: number[] =
    voiceover && voiceover.length === SCENE_AUDIO_FILES.length
      ? voiceover
      : [...FALLBACK_SCENE_DURATIONS];

  const voLengthsFinal: number[] =
    voLengths && voLengths.length === SCENE_AUDIO_FILES.length
      ? voLengths
      : [...FALLBACK_SCENE_DURATIONS];

  const { sceneStarts, items, totalFrames: visualFrames } = computeTimeline(sceneDurations);

  // Absolute-frame anchors in the final composition (which wraps the visual
  // timeline in a pre-roll + post-roll so the intro whoosh can build before
  // the title and the outro boom's decay can finish in silence).
  const visualStart = PRE_ROLL_FRAMES;
  const visualEnd = PRE_ROLL_FRAMES + visualFrames;
  const totalFrames = visualEnd + POST_ROLL_FRAMES;

  // Build VO windows in ABSOLUTE composition frames. Music ducks only during
  // these — scene cards + VO pre/post pad sit at full bed volume.
  const voWindows: Array<{ start: number; end: number }> = [];
  for (let i = 0; i < SCENE_AUDIO_FILES.length; i++) {
    if (!SCENE_VO_ENABLED[i]) continue;
    const start = visualStart + sceneStarts[i] + VO_PRE_PAD_FRAMES;
    voWindows.push({ start, end: start + voLengthsFinal[i] });
  }

  // Music volume envelope:
  //   - fade IN over the pre-roll so the bed rises with the whoosh
  //   - duck to MUSIC_DUCK during each VO window
  //   - fade OUT so bed is silent by visualEnd (lets the boom stand alone)
  const musicVolume = (frame: number) => {
    const fadeIn = interpolate(
      frame,
      [0, PRE_ROLL_FRAMES],
      [0, 1],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    const fadeOut = interpolate(
      frame,
      [visualEnd - MUSIC_FADE_OUT_FRAMES, visualEnd],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    let vol = MUSIC_HIGH;
    for (const w of voWindows) {
      const duckVol = interpolate(
        frame,
        [w.start, w.start + DUCK_RAMP, w.end - DUCK_RAMP, w.end],
        [MUSIC_HIGH, MUSIC_DUCK, MUSIC_DUCK, MUSIC_HIGH],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      vol = Math.min(vol, duckVol);
    }
    return vol * fadeIn * fadeOut;
  };

  return (
    <>
      {/* Music bed — fades in with the whoosh during pre-roll, ducks under
          each VO, fades to zero at visualEnd. endAt trims the 99s source. */}
      <Audio
        src={staticFile(MUSIC_BED)}
        volume={musicVolume}
        endAt={totalFrames}
      />

      {/* Intro whoosh — rides the pre-roll; the sweep peaks as the title
          fades in (around frame PRE_ROLL_FRAMES), not after it. */}
      <Sequence from={0} durationInFrames={SFX_INTRO_LEN_FRAMES} name="SFX-intro">
        <Audio src={staticFile(SFX_INTRO)} volume={0.45} />
      </Sequence>

      {/* Outro boom — attack lands SFX_OUTRO_LEAD_IN_FRAMES before visualEnd
          so it hits while the screen is still fading, not after it's gone;
          decay rides through the post-roll in silent black. */}
      <Sequence
        from={Math.max(0, visualEnd - SFX_OUTRO_LEAD_IN_FRAMES)}
        durationInFrames={SFX_OUTRO_LEN_FRAMES}
        name="SFX-outro"
      >
        <Audio src={staticFile(SFX_OUTRO)} volume={0.55} />
      </Sequence>

      {/* Voiceover — absolute frames include the visualStart offset. */}
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

      {/* Wrap the visual timeline inside the pre/post-roll envelope so the
          screen stays black during the whoosh build and the boom's decay. */}
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
          } else {
            nodes.push(
              <TransitionSeries.Sequence
                key={`card-${i}-${item.card.label}`}
                durationInFrames={item.duration}
              >
                <ChapterCard card={item.card} durationInFrames={item.duration} />
              </TransitionSeries.Sequence>,
            );
          }
          if (i < items.length - 1) {
            nodes.push(
              <React.Fragment key={`trans-${i}`}>{TRANS()}</React.Fragment>,
            );
          }
          return nodes;
        })}
      </TransitionSeries>
      </Sequence>

      {/* Curtain — fades to black across the final FADE_TO_BLACK_FRAMES of the
          visual section; stays fully black through the post-roll so the boom's
          decay plays into darkness. */}
      <FadeToBlack visualEnd={visualEnd} />
    </>
  );
};
