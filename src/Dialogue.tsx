import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
} from "remotion";
import {
  fonts,
  colors,
  GradientBackground,
  IntroOverlay,
  OutroOverlay,
  TopBar,
  VideoContainer,
} from "./FrenchFlowBrand";

const FPS = 30;
const INTRO_F = 1.5 * FPS;
const OUTRO_F = 1 * FPS;
const PER_LINE_F = 80;

interface DialogueLine {
  speaker: "femme" | "homme";
  name: string;
  french: string;
  arabic: string;
}

interface DialogueData {
  id: number;
  title: string;
  title_ar: string;
  level: string;
  lines: DialogueLine[];
}

const femmeColor = "#FF6B9D";
const hommeColor = "#4FC3F7";

const BUBBLE_H = 110;

const ChatBubble: React.FC<{
  line: DialogueLine;
  side: "left" | "right";
  show: boolean;
  progress: number;
}> = ({ line, side, show, progress }) => {
  const isLeft = side === "left";
  const isFemme = line.speaker === "femme";
  const bubbleColor = isFemme ? femmeColor : hommeColor;
  const avatar = isFemme ? "👩" : "👨";

  const scale = interpolate(progress, [0, 1], [0.7, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(progress, [0, 0.4], [0, 1], {
    extrapolateRight: "clamp",
  });

  if (!show) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: isLeft ? "row" : "row-reverse",
        alignItems: "flex-start",
        gap: 10,
        marginBottom: 14,
        padding: "0 16px",
        opacity,
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: "50%",
          background: `${bubbleColor}33`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 20,
          flexShrink: 0,
          border: `2px solid ${bubbleColor}66`,
        }}
      >
        {avatar}
      </div>

      <div
        style={{
          maxWidth: "78%",
          padding: "14px 18px",
          borderRadius: isLeft
            ? "18px 18px 18px 4px"
            : "18px 18px 4px 18px",
          background: `linear-gradient(135deg, ${bubbleColor}22, ${bubbleColor}11)`,
          border: `1px solid ${bubbleColor}44`,
        }}
      >
        <div
          style={{
            fontSize: 12,
            fontWeight: 600,
            fontFamily: fonts.body,
            color: bubbleColor,
            marginBottom: 4,
            textAlign: isLeft ? "left" : "right",
          }}
        >
          {line.name}
        </div>
        <div
          style={{
            fontSize: 24,
            fontWeight: 600,
            fontFamily: fonts.heading,
            color: colors.text,
            lineHeight: 1.4,
            textAlign: isLeft ? "left" : "right",
          }}
        >
          {line.french}
        </div>
      </div>
    </div>
  );
};

export const Dialogue: React.FC<{
  dialogue: DialogueData;
  totalDuration: number;
}> = ({ dialogue, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) {
    return (
      <VideoContainer>
        <IntroOverlay type="Dialogue" icon="💬" />
      </VideoContainer>
    );
  }
  if (frame >= totalDuration - OUTRO_F) {
    return (
      <VideoContainer>
        <OutroOverlay />
      </VideoContainer>
    );
  }

  const cf = frame - INTRO_F;

  return (
    <VideoContainer>
      <GradientBackground />
      <TopBar
        label="DIALOGUE"
        progress={cf / contentFrames}
        icon="💬"
      />
      <AbsoluteFill style={{ justifyContent: "center" }}>
        <div
          style={{
            position: "absolute",
            top: 76,
            left: 0,
            right: 0,
            bottom: 0,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {dialogue.lines.map((line, i) => {
            const lineStartFrame = i * PER_LINE_F;
            const lineProgress = Math.max(
              0,
              Math.min(1, (cf - lineStartFrame) / 18)
            );
            const isVisible = cf >= lineStartFrame;
            return (
              <ChatBubble
                key={i}
                line={line}
                side={line.speaker === "femme" ? "left" : "right"}
                show={isVisible}
                progress={lineProgress}
              />
            );
          })}
        </div>
      </AbsoluteFill>
    </VideoContainer>
  );
};
