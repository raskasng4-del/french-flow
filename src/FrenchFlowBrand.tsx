import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
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
  bg: "#FFFFFF",
  text: "#000000",
  textMuted: "#666666",
  accent: "#0055A4",
  accent2: "#EF4135",
  accent3: "#00A86B",
  cardBg: "#F8F8F8",
  cardBorder: "#E0E0E0",
};

export const VideoContainer: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ background: colors.bg }}>{children}</AbsoluteFill>
);

export const IntroOverlay: React.FC<{ type: string; icon?: string }> = ({ type, icon = "🇫🇷" }) => {
  const frame = useCurrentFrame();
  const scale = interpolate(frame, [0, 20], [0.8, 1], { extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 15, 35], [0, 1, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: colors.bg }}>
      <FrenchFlagBar />
      <AbsoluteFill
        style={{
          justifyContent: "center",
          alignItems: "center",
          opacity,
          transform: `scale(${scale})`,
        }}
      >
        <div style={{ fontSize: 56, marginBottom: 16 }}>{icon}</div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            textAlign: "center",
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
    <AbsoluteFill style={{ background: colors.bg }}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity, transform: `scale(${scale})` }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.accent,
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
          French Flow
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const FrenchFlagBar: React.FC = () => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 4,
      display: "flex",
    }}
  >
    <div style={{ flex: 1, background: "#0055A4" }} />
    <div style={{ flex: 1, background: "#FFFFFF" }} />
    <div style={{ flex: 1, background: "#EF4135" }} />
  </div>
);

export const TopBar: React.FC<{ label: string; progress: number; icon?: string }> = ({ label, progress, icon = "🇫🇷" }) => (
  <div
    style={{
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      padding: "20px 24px",
      display: "flex",
      alignItems: "center",
      gap: 12,
    }}
  >
    <FrenchFlagBar />
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: 10,
        background: colors.accent,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: 16,
        fontWeight: 700,
        fontFamily: fonts.heading,
        color: "#fff",
        marginTop: 4,
      }}
    >
      {icon}
    </div>
    <div
      style={{
        flex: 1,
        height: 3,
        borderRadius: 2,
        background: colors.cardBorder,
        marginTop: 4,
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
    <div
      style={{
        fontSize: 11,
        fontWeight: 500,
        fontFamily: fonts.body,
        color: colors.textMuted,
        letterSpacing: 1,
        marginTop: 4,
      }}
    >
      {label}
    </div>
  </div>
);
