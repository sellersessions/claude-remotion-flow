import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import {
  ACCENT,
  ACCENT_2,
  EASE_OUT,
  FONT,
  MONO,
  SAFE_INSET_X,
  SAFE_INSET_Y,
  TEXT,
  TEXT_DIM,
  type SceneVisualProps,
} from "../explainer-shared";

type ScenePlaceholderProps = SceneVisualProps & {
  label: string;
  title: string;
  caption: string;
};

export const ScenePlaceholder: React.FC<ScenePlaceholderProps> = ({
  durationInFrames,
  sceneId,
  label,
  title,
  caption,
}) => {
  const frame = useCurrentFrame();
  const intro = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  const remainingSec = Math.max(0, (durationInFrames - frame) / 30);

  return (
    <AbsoluteFill
      style={{
        padding: `${SAFE_INSET_Y}px ${SAFE_INSET_X}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 32,
        opacity: intro,
        transform: `translateY(${(1 - intro) * 24}px)`,
      }}
    >
      <div
        style={{
          fontFamily: MONO,
          color: ACCENT_2,
          fontSize: 28,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: FONT,
          color: TEXT,
          fontSize: 96,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontFamily: FONT,
          color: TEXT_DIM,
          fontSize: 36,
          fontWeight: 400,
          maxWidth: 1280,
          lineHeight: 1.4,
        }}
      >
        {caption}
      </div>
      <div
        style={{
          marginTop: 24,
          padding: "16px 24px",
          alignSelf: "flex-start",
          borderRadius: 12,
          border: `1px solid ${ACCENT}55`,
          background: `${ACCENT}15`,
          fontFamily: MONO,
          color: TEXT_DIM,
          fontSize: 22,
        }}
      >
        scaffold · {sceneId} · {remainingSec.toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
};
