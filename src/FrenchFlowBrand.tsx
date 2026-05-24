import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/google-fonts/Poppins";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";

const { fontFamily: poppins } = loadFont("normal", {
  weights: ["300", "400", "600", "700"],
  subsets: ["latin"],
});
const { fontFamily: inter } = loadInter("normal", {
  weights: ["300", "400", "500"],
  subsets: ["latin"],
});

export const fonts = {
  heading: poppins,
  body: inter,
};

export const colors = {
  bg1: "#0f0c29",
  bg2: "#302b63",
  bg3: "#24243e",
  accent: "#FF6B6B",
  accent2: "#FFD93D",
  accent3: "#6BCB77",
  text: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.6)",
  glass: "rgba(255,255,255,0.08)",
  glassBorder: "rgba(255,255,255,0.12)",
};

const FloatingOrb: React.FC<{
  size: number;
  color: string;
  x: number;
  y: number;
  driftX: number;
  driftY: number;
  frame: number;
}> = ({ size, color, x, y, driftX, driftY, frame }) => {
  const dx = interpolate(frame % 120, [0, 60, 120], [0, driftX, 0]);
  const dy = interpolate(frame % 120, [0, 60, 120], [0, driftY, 0]);
  return (
    <div
      style={{
        position: "absolute",
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle, ${color}44, ${color}11)`,
        left: x + dx,
        top: y + dy,
        filter: "blur(40px)",
        pointerEvents: "none",
      }}
    />
  );
};

export const GradientBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const shift = interpolate(frame % 150, [0, 75, 150], [0, 15, 0]);

  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(135deg, ${colors.bg1} 0%, ${colors.bg2} ${50 + shift}%, ${colors.bg3} 100%)`,
      }}
    >
      <FloatingOrb size={300} color={colors.accent} x={50} y={100} driftX={30} driftY={-20} frame={frame} />
      <FloatingOrb size={250} color={colors.accent2} x={750} y={300} driftX={-25} driftY={15} frame={frame} />
      <FloatingOrb size={200} color={colors.accent3} x={300} y={700} driftX={20} driftY={25} frame={frame} />
      <FloatingOrb size={350} color="#845EC2" x={650} y={800} driftX={-30} driftY={-15} frame={frame} />
    </AbsoluteFill>
  );
};

export const GlassCard: React.FC<{
  children: React.ReactNode;
  padding?: number;
  width?: string;
}> = ({ children, padding = 32, width = "85%" }) => (
  <div
    style={{
      width,
      padding,
      borderRadius: 20,
      background: colors.glass,
      border: `1px solid ${colors.glassBorder}`,
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
    }}
  >
    {children}
  </div>
);

export const BackgroundMusic: React.FC<{ volume?: number }> = ({ volume = 1.0 }) => (
  <Audio src={staticFile("bg-music.mp3")} volume={volume} />
);

export const VideoContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <BackgroundMusic />
    {children}
  </AbsoluteFill>
);

export const IntroOverlay: React.FC<{ type: string }> = ({ type }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 20], [0.8, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 15, 35], [0, 1, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBackground />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            textAlign: "center",
            textShadow: "0 2px 20px rgba(255,107,107,0.3)",
          }}
        >
          {type}
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 300,
            fontFamily: fonts.body,
            color: colors.textMuted,
            marginTop: 12,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          French Flow
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const OutroOverlay: React.FC = () => {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const scale = interpolate(frame, [0, 20], [0.9, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill>
      <GradientBackground />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity, transform: `scale(${scale})` }}>
        <div
          style={{
            fontSize: 42,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.accent2,
            textShadow: "0 2px 20px rgba(255,217,61,0.3)",
          }}
        >
          À bientôt !
        </div>
        <div
          style={{
            fontSize: 16,
            fontWeight: 300,
            fontFamily: fonts.body,
            color: colors.textMuted,
            marginTop: 10,
          }}
        >
          French Flow &mdash; إلى اللقاء
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const TopBar: React.FC<{ label: string; progress: number }> = ({ label, progress }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      padding: "16px 24px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <div
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        background: colors.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 14,
        fontWeight: 700,
        fontFamily: fonts.heading,
        color: "#fff",
      }}
    >
      FF
    </div>
    <div
      style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        background: colors.glass,
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
    <div
      style={{
        fontSize: 12,
        fontWeight: 500,
        fontFamily: fonts.body,
        color: colors.textMuted,
        letterSpacing: 1,
      }}
    >
      {label}
    </div>
  </div>
);
