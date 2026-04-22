import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
} from "remotion";
import { z } from "zod";

export const ssDemoSchema = z.object({
  speakerName: z.string(),
  talkTitle: z.string(),
  eventDate: z.string(),
});

export const SSDemo: React.FC<z.infer<typeof ssDemoSchema>> = ({
  speakerName,
  talkTitle,
  eventDate,
}) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Background gradient animation
  const gradientShift = interpolate(frame, [0, durationInFrames], [0, 360]);

  // Logo/brand entrance
  const brandScale = spring({ frame, fps, config: { damping: 80, mass: 0.8 } });

  // Speaker name slides in from left
  const nameSlide = spring({
    frame: frame - 20,
    fps,
    config: { damping: 60 },
  });
  const nameX = interpolate(nameSlide, [0, 1], [-800, 0]);

  // Talk title fades up
  const titleProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 80 },
  });
  const titleY = interpolate(titleProgress, [0, 1], [60, 0]);
  const titleOpacity = interpolate(titleProgress, [0, 1], [0, 1]);

  // Date bar slides in
  const dateProgress = spring({
    frame: frame - 60,
    fps,
    config: { damping: 100 },
  });
  const dateWidth = interpolate(dateProgress, [0, 1], [0, 100]);

  // Accent line animation
  const lineProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 50, stiffness: 80 },
  });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 400]);

  // Fade out
  const fadeOut = interpolate(
    frame,
    [durationInFrames - 20, durationInFrames - 5],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(${gradientShift}deg, #0a0a0a, #1a1a2e, #16213e)`,
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <AbsoluteFill style={{ opacity: fadeOut }}>
        {/* Subtle grid overlay */}
        <AbsoluteFill
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* Brand mark top-left */}
        <div
          style={{
            position: "absolute",
            top: 60,
            left: 80,
            transform: `scale(${brandScale})`,
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: "linear-gradient(135deg, #f97316, #ef4444)",
            }}
          />
          <span
            style={{
              color: "#ffffff",
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            SELLER SESSIONS
          </span>
        </div>

        {/* Accent line */}
        <div
          style={{
            position: "absolute",
            top: 420,
            left: 80,
            height: 3,
            width: lineWidth,
            background: "linear-gradient(90deg, #f97316, #ef4444)",
            borderRadius: 2,
          }}
        />

        {/* Speaker name */}
        <Sequence from={20}>
          <div
            style={{
              position: "absolute",
              top: 450,
              left: 80,
              transform: `translateX(${nameX}px)`,
            }}
          >
            <span
              style={{
                color: "#ffffff",
                fontSize: 82,
                fontWeight: 800,
                letterSpacing: "-0.03em",
                lineHeight: 1.1,
              }}
            >
              {speakerName}
            </span>
          </div>
        </Sequence>

        {/* Talk title */}
        <Sequence from={40}>
          <div
            style={{
              position: "absolute",
              top: 560,
              left: 80,
              maxWidth: 1200,
              transform: `translateY(${titleY}px)`,
              opacity: titleOpacity,
            }}
          >
            <span
              style={{
                color: "#a0a0b0",
                fontSize: 42,
                fontWeight: 400,
                lineHeight: 1.4,
              }}
            >
              {talkTitle}
            </span>
          </div>
        </Sequence>

        {/* Date bar */}
        <Sequence from={60}>
          <div
            style={{
              position: "absolute",
              bottom: 80,
              left: 80,
              display: "flex",
              alignItems: "center",
              gap: 20,
            }}
          >
            <div
              style={{
                height: 40,
                width: `${dateWidth}%`,
                maxWidth: 4,
                background: "#f97316",
                borderRadius: 2,
              }}
            />
            <span
              style={{
                color: "#666680",
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              {eventDate}
            </span>
          </div>
        </Sequence>

        {/* SSL LIVE badge */}
        <Sequence from={55}>
          <div
            style={{
              position: "absolute",
              bottom: 80,
              right: 80,
              opacity: interpolate(
                spring({ frame: frame - 55, fps, config: { damping: 80 } }),
                [0, 1],
                [0, 1]
              ),
              transform: `scale(${spring({ frame: frame - 55, fps, config: { damping: 60 } })})`,
            }}
          >
            <div
              style={{
                padding: "14px 32px",
                border: "2px solid rgba(249, 115, 22, 0.5)",
                borderRadius: 8,
                color: "#f97316",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.15em",
              }}
            >
              SSL 2026 LIVE
            </div>
          </div>
        </Sequence>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
