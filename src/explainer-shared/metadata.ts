import {
  CalculateMetadataFunction,
  interpolate,
  staticFile,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import {
  CARD_DURATION_FRAMES,
  DUCK_RAMP,
  FPS,
  MUSIC_DUCK,
  MUSIC_FADE_OUT_FRAMES,
  MUSIC_HIGH,
  POST_ROLL_FRAMES,
  PRE_ROLL_FRAMES,
  SFX_INTRO_VOLUME,
  SFX_OUTRO_VOLUME,
  TRANS_FRAMES,
  VO_POST_PAD_FRAMES,
  VO_PRE_PAD_FRAMES,
} from "./constants";
import { computeTimeline, type ChapterCardSpec } from "./timeline";

// Mixer props surfaced to the Studio Props panel as live sliders. Defaults
// in DEFAULT_MIXER mirror the baseline constants so the render output is
// identical unless Danny drags a slider.
export type MixerProps = {
  musicHigh: number;
  musicDuck: number;
  sfxIntroVolume: number;
  sfxOutroVolume: number;
};

export const DEFAULT_MIXER: MixerProps = {
  musicHigh: MUSIC_HIGH,
  musicDuck: MUSIC_DUCK,
  sfxIntroVolume: SFX_INTRO_VOLUME,
  sfxOutroVolume: SFX_OUTRO_VOLUME,
};

export type ExplainerProps = {
  voiceover?: number[];
  voLengths?: number[];
} & MixerProps;

export type ExplainerConfig = {
  sceneAudioFiles: readonly string[];
  sceneVoEnabled: readonly boolean[];
  fallbackSceneDurations: readonly number[];
  cardBefore: readonly (ChapterCardSpec | null)[];
  // Per-scene beat-snap targets in ABSOLUTE scene-start frames (relative to
  // the start of the visual timeline, i.e. excluding PRE_ROLL). null = no
  // snap for this scene. Prior-scene duration is adjusted so sceneStarts[i]
  // lands on the target; a safety floor prevents VO clipping.
  beatSnapFrames: readonly (number | null)[];
  logPrefix: string; // e.g. "StackExplainer" — used in console warnings
};

// Fallback comp length when no VO files exist on disk.
export function fallbackDurationInFrames(config: ExplainerConfig): number {
  const cardCount = config.cardBefore.filter(Boolean).length;
  return (
    PRE_ROLL_FRAMES +
    config.fallbackSceneDurations.reduce((s, d) => s + d, 0) +
    cardCount * CARD_DURATION_FRAMES -
    (config.fallbackSceneDurations.length + cardCount - 1) * TRANS_FRAMES +
    POST_ROLL_FRAMES
  );
}

// Module-level cache of measured VO durations, keyed by the scene-audio
// signature. calculateMetadata re-runs on every mixer prop change; without
// this cache, each drag tick would re-fetch 8 MP3 durations and block the
// Studio with a "calculating" toast.
const voLengthsCache = new Map<string, number[]>();

// VO-driven metadata factory. Reads each scene's MP3 duration, sizes scenes
// to max(VO+padding, animator fallback), then applies beat-snap by nudging
// prior-scene durations. Never touches the VO audio itself.
export function makeCalculateMetadata(
  config: ExplainerConfig,
): CalculateMetadataFunction<ExplainerProps> {
  return async ({ props }) => {
    const cacheKey = config.sceneAudioFiles.join("|");
    let voLengths = voLengthsCache.get(cacheKey);
    let allFallback = false;

    if (!voLengths) {
      const results = await Promise.allSettled(
        config.sceneAudioFiles.map(async (file) => {
          try {
            const src = staticFile(file);
            const secs = await getAudioDurationInSeconds(src);
            return secs * FPS;
          } catch {
            return null;
          }
        }),
      );

      voLengths = results.map((r, i) => {
        if (r.status === "fulfilled" && r.value !== null) {
          return Math.ceil(r.value);
        }
        console.warn(
          `[${config.logPrefix}] VO file missing or unreadable: ${config.sceneAudioFiles[i]}. ` +
            `Falling back to ${config.fallbackSceneDurations[i]} frames.`,
        );
        return 0;
      });

      allFallback = results.every(
        (r) => r.status === "rejected" || r.value === null,
      );

      if (!allFallback) voLengthsCache.set(cacheKey, voLengths);
    }
    if (allFallback) {
      console.warn(
        `[${config.logPrefix}] No VO files found — using hardcoded duration. ` +
          `Run the ElevenLabs generation script to populate the VO output dir.`,
      );
      return {
        durationInFrames: fallbackDurationInFrames(config),
        props: {
          ...props,
          voiceover: [...config.fallbackSceneDurations],
          voLengths: [...config.fallbackSceneDurations],
        },
      };
    }

    const sceneDurations: number[] = voLengths.map((vo, i) => {
      const padded = vo + VO_PRE_PAD_FRAMES + VO_POST_PAD_FRAMES;
      return Math.ceil(
        Math.max(padded, config.fallbackSceneDurations[i] ?? 0),
      );
    });

    // Beat-snap pass — shift scene start by adjusting PRIOR scene's duration.
    for (let i = 1; i < sceneDurations.length; i++) {
      const target = config.beatSnapFrames[i];
      if (target == null) continue;
      const { sceneStarts } = computeTimeline(sceneDurations, config.cardBefore);
      const delta = target - sceneStarts[i];
      if (delta === 0) continue;
      const prior = i - 1;
      const voLenPrior = voLengths[prior] ?? 0;
      const minPrior = voLenPrior + VO_PRE_PAD_FRAMES + TRANS_FRAMES;
      sceneDurations[prior] = Math.max(
        minPrior,
        sceneDurations[prior] + delta,
      );
    }

    const { totalFrames: visualFrames } = computeTimeline(
      sceneDurations,
      config.cardBefore,
    );
    const totalFrames = PRE_ROLL_FRAMES + visualFrames + POST_ROLL_FRAMES;

    return {
      durationInFrames: Math.ceil(totalFrames),
      props: { ...props, voiceover: sceneDurations, voLengths },
    };
  };
}

// Music-bed volume callback factory. The returned function is a Remotion
// volume-per-frame callback: fades in over the pre-roll, ducks to MUSIC_DUCK
// during each VO window, fades to zero by visualEnd so the outro boom can
// stand alone.
export function buildMusicVolume(args: {
  visualEnd: number;
  voWindows: readonly { start: number; end: number }[];
  musicHigh?: number;
  musicDuck?: number;
}): (frame: number) => number {
  const {
    visualEnd,
    voWindows,
    musicHigh = MUSIC_HIGH,
    musicDuck = MUSIC_DUCK,
  } = args;
  return (frame: number) => {
    const fadeIn = interpolate(frame, [0, PRE_ROLL_FRAMES], [0, 1], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    });
    const fadeOut = interpolate(
      frame,
      [visualEnd - MUSIC_FADE_OUT_FRAMES, visualEnd],
      [1, 0],
      { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
    );
    let vol = musicHigh;
    for (const w of voWindows) {
      const duckVol = interpolate(
        frame,
        [w.start, w.start + DUCK_RAMP, w.end - DUCK_RAMP, w.end],
        [musicHigh, musicDuck, musicDuck, musicHigh],
        { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
      );
      vol = Math.min(vol, duckVol);
    }
    return vol * fadeIn * fadeOut;
  };
}
