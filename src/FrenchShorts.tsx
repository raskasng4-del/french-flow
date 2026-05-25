import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  spring,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import {
  fonts,
  colors,
  FrenchFlagBar,
  VideoContainer,
} from "./FrenchFlowBrand";

const FPS = 30;

interface PhraseItem {
  french: string;
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
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
          fontSize: 22,
          fontWeight: 700,
          fontFamily: fonts.heading,
          color: colors.text,
          letterSpacing: 1,
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
          background: colors.cardBorder,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            borderRadius: 2,
            background: colors.accent,
          }}
        />
      </div>
    </div>
  );
};

const PhraseCard: React.FC<{
  french: string;
  frame: number;
}> = ({ french, frame }) => {
  const frenchScale = spring({
    frame,
    fps: FPS,
    config: { damping: 12, stiffness: 100 },
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
          background: colors.cardBg,
          borderRadius: 24,
          border: `1px solid ${colors.cardBorder}`,
          padding: "48px 36px",
          width: "90%",
        }}
      >
        <div
          style={{
            fontSize: 60,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            textAlign: "center",
            lineHeight: 1.4,
            transform: `scale(${frenchScale})`,
          }}
        >
          {french}
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
          background: colors.cardBg,
          border: `1px solid ${colors.cardBorder}`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: colors.accent,
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
              color: colors.text,
            }}
          >
            French Flow
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 400,
              fontFamily: fonts.body,
              color: colors.textMuted,
            }}
          >
            Professeur de français
          </div>
        </div>
      </div>
    </div>
  );
};

export const FrenchShorts: React.FC<FrenchShortsProps> = ({
  title = "French Flow",
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
          background: colors.bg,
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
    <VideoContainer>
      <FrenchFlagBar />
      <Header title={title} progress={progress} />

      {phrases.map((phrase, i) => (
        <Sequence key={i} from={i * itemFrames} durationInFrames={itemFrames + FPS}>
          {phrase.audioSrc && (
            <Audio src={staticFile(phrase.audioSrc)} volume={0.9} />
          )}
          <PhraseCard
            french={phrase.french}
            frame={frame - i * itemFrames}
          />
        </Sequence>
      ))}

      <Avatar />
    </VideoContainer>
  );
};
