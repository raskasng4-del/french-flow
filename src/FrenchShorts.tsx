import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  spring,
} from "remotion";
import {
  fonts,
  colors,
  GradientBackground,
  FrenchFlagBar,
  BackgroundMusic,
} from "./FrenchFlowBrand";

const FPS = 30;

interface PhraseItem {
  french: string;
  arabic: string;
  audioSrc?: string;
}

interface FrenchShortsProps {
  title?: string;
  phrases: PhraseItem[];
  durationPerItem?: number;
}

const Header: React.FC<{ title: string; progress: number }> = ({
  title,
  progress,
}) => {
  return (
    <div
      style={{
        position: "absolute",
        top: 60,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <div
        style={{
          padding: "14px 40px",
          borderRadius: 50,
          background: "rgba(255,255,255,0.1)",
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          fontSize: 22,
          fontWeight: 700,
          fontFamily: fonts.heading,
          color: "#fff",
          letterSpacing: 1,
          textShadow: "0 2px 10px rgba(0,0,0,0.3)",
        }}
      >
        {title}
      </div>
      <div
        style={{
          marginTop: 12,
          width: "80%",
          height: 3,
          borderRadius: 2,
          background: "rgba(255,255,255,0.1)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 2,
            background: `linear-gradient(90deg, ${colors.accent}, ${colors.accent2})`,
          }}
        />
      </div>
    </div>
  );
};

const PhraseCard: React.FC<{
  french: string;
  arabic: string;
  frame: number;
}> = ({ french, arabic, frame }) => {
  const frenchScale = spring({
    frame,
    fps: FPS,
    config: { damping: 12, stiffness: 100 },
  });
  const arabicOpacity = interpolate(frame, [15, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });
  const arabicY = interpolate(frame, [15, 35], [30, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        padding: "0 40px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.06)",
          borderRadius: 24,
          border: "1px solid rgba(255,255,255,0.1)",
          padding: "48px 36px",
          width: "90%",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: "#fff",
            textAlign: "center",
            lineHeight: 1.4,
            transform: `scale(${frenchScale})`,
            textShadow: `0 0 40px ${colors.accent}66`,
          }}
        >
          {french}
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 32,
            fontWeight: 500,
            fontFamily: fonts.body,
            color: colors.accent2,
            textAlign: "center",
            opacity: arabicOpacity,
            transform: `translateY(${arabicY}px)`,
            textShadow: `0 0 20px ${colors.accent2}44`,
          }}
        >
          {arabic}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Avatar: React.FC = () => {
  const breathe = useCurrentFrame();
  const scale = 1 + Math.sin(breathe * 0.03) * 0.03;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 80,
        left: 0,
        right: 0,
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "12px 24px 12px 12px",
          borderRadius: 50,
          background: "rgba(255,255,255,0.08)",
          border: "1px solid rgba(255,255,255,0.12)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${colors.accent}, ${colors.accent2})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            transform: `scale(${scale})`,
          }}
        >
          👩‍🏫
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              fontFamily: fonts.heading,
              color: "#fff",
            }}
          >
            French Flow
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 400,
              fontFamily: fonts.body,
              color: colors.accent2,
            }}
          >
            {"Professeur de français"}
          </div>
        </div>
      </div>
    </div>
  );
};

export const FrenchShorts: React.FC<FrenchShortsProps> = ({
  title = "تعلم اللغة الفرنسية 🇫🇷",
  phrases = [],
  durationPerItem = 3,
}) => {
  const frame = useCurrentFrame();
  const itemFrames = durationPerItem * FPS;
  const totalFrames = phrases.length * itemFrames + 1 * FPS;
  const progress = Math.min(frame / totalFrames, 1);

  if (phrases.length === 0) {
    return (
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          background: colors.bg1,
        }}
      >
        <div
          style={{
            fontSize: 28,
            color: colors.textMuted,
            fontFamily: fonts.body,
          }}
        >
          No phrases provided
        </div>
      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill>
      <BackgroundMusic volume={0.5} />
      <GradientBackground />
      <FrenchFlagBar />
      <Header title={title} progress={progress} />

      {phrases.map((phrase, i) => (
        <Sequence
          key={i}
          from={i * itemFrames}
          durationInFrames={itemFrames + FPS}
        >
          <PhraseCard
            french={phrase.french}
            arabic={phrase.arabic}
            frame={frame - i * itemFrames}
          />
        </Sequence>
      ))}

      <Avatar />
    </AbsoluteFill>
  );
};
