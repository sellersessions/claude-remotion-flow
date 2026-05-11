import React from "react";
import {
  AbsoluteFill,
  Audio,
  CalculateMetadataFunction,
  Img,
  OffthreadVideo,
  Sequence,
  interpolate,
  staticFile,
  useCurrentFrame,
} from "remotion";
import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { loadFont } from "@remotion/google-fonts/PlusJakartaSans";
import { z } from "zod";

const { fontFamily } = loadFont();

const FPS = 25;
const WIDTH = 1920;
const HEIGHT = 1080;

const VIDEO_SRC = "assets/ssl-2026-timelapse/ssl-2026-day-timelapse.mp4";
const SSL_LOGO = "assets/branding/ssl-logo.png";
const DATABRILL_LOGO = "assets/branding/databrill-logo.png";

const VIDEO_DURATION_S = 42.56;
const VIDEO_DURATION_FRAMES = Math.round(VIDEO_DURATION_S * FPS); // 1064

const VIDEO_FADE_OUT_FRAMES = 25;
const AUDIO_FADE_OUT_FRAMES = 25;

const PURPLE = "#461499";
const BLACK = "#0A0A0A";
const WHITE = "#FFFFFF";

const s = (sec: number) => Math.round(sec * FPS);

export const FALLBACK_DURATION_IN_FRAMES = s(115.24);

export const ssl2026TimelapseSchema = z.object({
  audioSrc: z.string(),
  audioDurationFrames: z.number().optional(),
});

type Ssl2026TimelapseProps = z.infer<typeof ssl2026TimelapseSchema>;

export const calculateMetadata: CalculateMetadataFunction<Ssl2026TimelapseProps> =
  async ({ props }) => {
    let audioFrames = 0;
    try {
      const audioSecs = await getAudioDurationInSeconds(staticFile(props.audioSrc));
      audioFrames = Math.ceil(audioSecs * FPS);
    } catch {
      audioFrames = 0;
    }
    const total = Math.max(VIDEO_DURATION_FRAMES, audioFrames);
    return {
      durationInFrames: total,
      fps: FPS,
      width: WIDTH,
      height: HEIGHT,
      props: { ...props, audioDurationFrames: audioFrames },
    };
  };

const BackgroundVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [VIDEO_DURATION_FRAMES - VIDEO_FADE_OUT_FRAMES, VIDEO_DURATION_FRAMES],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  if (opacity <= 0) return null;
  return (
    <AbsoluteFill style={{ opacity }}>
      <OffthreadVideo
        src={staticFile(VIDEO_SRC)}
        muted
        endAt={VIDEO_DURATION_FRAMES}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

const FullBleedShape: React.FC<{ colour: string }> = ({ colour }) => (
  <AbsoluteFill style={{ background: colour }} />
);

const TriangleTopRight: React.FC<{ colour: string }> = ({ colour }) => (
  <AbsoluteFill style={{ background: colour, clipPath: "polygon(0 0, 100% 0, 100% 100%)" }} />
);

const TriangleBottomLeft: React.FC<{ colour: string }> = ({ colour }) => (
  <AbsoluteFill style={{ background: colour, clipPath: "polygon(0 0, 0 100%, 100% 100%)" }} />
);

const HorizontalBand: React.FC<{ colour: string }> = ({ colour }) => (
  <AbsoluteFill style={{ display: "flex", alignItems: "center" }}>
    <div style={{ width: "100%", height: "60%", background: colour }} />
  </AbsoluteFill>
);

type BeatProps = {
  durationFrames: number;
  shape: React.ReactNode;
  headline: React.ReactNode;
  subline?: React.ReactNode;
};

const Beat: React.FC<BeatProps> = ({ durationFrames, shape, headline, subline }) => {
  const frame = useCurrentFrame();
  const exitStart = durationFrames - 8;

  const shapeIn = interpolate(frame, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shapeOut = interpolate(frame, [exitStart, durationFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const shapeOpacity = Math.min(shapeIn, shapeOut);

  const textIn = interpolate(frame, [4, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOut = interpolate(frame, [exitStart, durationFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textOpacity = Math.min(textIn, textOut);
  const scale = interpolate(frame, [4, 14], [0.94, 1.0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: shapeOpacity }}>{shape}</AbsoluteFill>
      <AbsoluteFill
        style={{
          opacity: textOpacity,
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: 120,
        }}
      >
        <div
          style={{
            fontFamily,
            fontWeight: 800,
            fontSize: 200,
            lineHeight: 0.85,
            color: WHITE,
            textTransform: "uppercase",
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          {headline}
        </div>
        {subline ? (
          <div
            style={{
              fontFamily,
              fontStyle: "italic",
              fontSize: 36,
              fontWeight: 500,
              color: WHITE,
              opacity: 0.65,
              textAlign: "center",
              marginTop: 40,
              maxWidth: 1200,
            }}
          >
            {subline}
          </div>
        ) : null}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const StaticSslLogo: React.FC = () => (
  <AbsoluteFill style={{ alignItems: "center", paddingTop: 70 }}>
    <Img src={staticFile(SSL_LOGO)} style={{ width: 640, height: "auto" }} />
  </AbsoluteFill>
);

const CreditSection: React.FC<{ header: string; lines?: string[]; logo?: string; leadLine?: string }> = ({
  header,
  lines,
  logo,
  leadLine,
}) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
    <div
      style={{
        fontFamily,
        fontWeight: 700,
        fontSize: 36,
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: WHITE,
        opacity: 0.55,
      }}
    >
      {header}
    </div>
    {leadLine ? (
      <div
        style={{
          fontFamily,
          fontWeight: 700,
          fontSize: 96,
          color: WHITE,
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {leadLine}
      </div>
    ) : null}
    {lines
      ? lines.map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily,
              fontWeight: 500,
              fontSize: 64,
              color: WHITE,
              textAlign: "center",
              lineHeight: 1.1,
            }}
          >
            {line}
          </div>
        ))
      : null}
    {logo ? <Img src={staticFile(logo)} style={{ width: 720, height: "auto", marginTop: 8 }} /> : null}
  </div>
);

const RollingCredits: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const COLUMN_HEIGHT = 2600;
  const startY = HEIGHT - 40;
  const endY = -COLUMN_HEIGHT - 40;
  const translateY = interpolate(frame, [0, durationFrames], [startY, endY], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          transform: `translateY(${translateY}px)`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 200,
          paddingLeft: 120,
          paddingRight: 120,
        }}
      >
        <CreditSection
          header="Featuring"
          leadLine="Dr. Ellis Whitehead"
          lines={["Sim Mahon", "Dorian Gorski", "Shubhash", "Matt Kostan", "Danny McMillan"]}
        />
        <CreditSection header="Production" lines={["Leo · Kay-Dee · Glenn · Sanjay · Alex · Kerrie"]} />
        <CreditSection header="Brought to you by" logo={DATABRILL_LOGO} />
        <CreditSection header="Music" lines={["Therealasethic", '"original sound" · TikTok']} />
      </div>
    </AbsoluteFill>
  );
};

const FinalCard: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const fadeIn = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 25, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = Math.min(fadeIn, fadeOut);

  return (
    <AbsoluteFill
      style={{
        opacity,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 56,
      }}
    >
      <div
        style={{
          fontFamily,
          fontWeight: 600,
          fontSize: 60,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: WHITE,
          opacity: 0.7,
          textAlign: "center",
        }}
      >
        A Seller Sessions Production.
      </div>
      <div
        style={{
          fontFamily,
          fontWeight: 800,
          fontSize: 180,
          letterSpacing: "-0.02em",
          textTransform: "uppercase",
          color: WHITE,
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        Ahead of the Curv.
      </div>
    </AbsoluteFill>
  );
};

export const Ssl2026Timelapse: React.FC<Ssl2026TimelapseProps> = ({
  audioSrc,
  audioDurationFrames,
}) => {
  const audioEnd = audioDurationFrames ?? VIDEO_DURATION_FRAMES;
  const fadeStart = Math.max(0, audioEnd - AUDIO_FADE_OUT_FRAMES);

  const creditsFrom = s(47);
  const creditsDuration = s(95) - s(47);
  const finalFrom = s(95);
  const finalDuration = s(110) - s(95);
  const logoFrom = s(47);
  const logoDuration = s(110) - s(47);

  return (
    <AbsoluteFill style={{ background: BLACK }}>
      <BackgroundVideo />

      <Sequence from={s(0)} durationInFrames={s(5)}>
        <Beat
          durationFrames={s(5)}
          shape={<FullBleedShape colour={BLACK} />}
          headline={<>Innovation,<br />Not Imitation.</>}
          subline="SSL 2026"
        />
      </Sequence>

      <Sequence from={s(12)} durationInFrames={s(4)}>
        <Beat
          durationFrames={s(4)}
          shape={<TriangleTopRight colour={PURPLE} />}
          headline={<>Often Copied.<br />Never Caught.</>}
        />
      </Sequence>

      <Sequence from={s(24)} durationInFrames={s(4)}>
        <Beat
          durationFrames={s(4)}
          shape={<HorizontalBand colour={BLACK} />}
          headline="We Curated a Space."
          subline="for creative and forward-thinking brands."
        />
      </Sequence>

      <Sequence from={s(34)} durationInFrames={s(4)}>
        <Beat
          durationFrames={s(4)}
          shape={<TriangleBottomLeft colour={PURPLE} />}
          headline={<>Human in the Loop.<br />Not End-to-End Slop.</>}
        />
      </Sequence>

      <Sequence from={logoFrom} durationInFrames={logoDuration}>
        <StaticSslLogo />
      </Sequence>

      <Sequence from={creditsFrom} durationInFrames={creditsDuration}>
        <RollingCredits durationFrames={creditsDuration} />
      </Sequence>

      <Sequence from={finalFrom} durationInFrames={finalDuration}>
        <FinalCard durationFrames={finalDuration} />
      </Sequence>

      <Audio
        src={staticFile(audioSrc)}
        volume={(frame) =>
          interpolate(frame, [fadeStart, audioEnd], [1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          })
        }
      />
    </AbsoluteFill>
  );
};
