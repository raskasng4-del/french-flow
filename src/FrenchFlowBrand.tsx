import React from "react";
import { AbsoluteFill } from "remotion";

export const colors = {
  primary: "#1E3A5F",
  secondary: "#F5A623",
  accent: "#E74C3C",
  text: "#FFFFFF",
  textDark: "#2C3E50",
  bgLight: "#F8F9FA",
  success: "#27AE60",
  border: "#BDC3C7",
};

const fontFamily = "'Helvetica Neue', Arial, sans-serif";

export const IntroOverlay: React.FC<{ type: string }> = ({ type }) => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.primary,
      }}
    >
      <div
        style={{
          color: colors.secondary,
          fontSize: 28,
          fontWeight: 700,
          fontFamily,
          letterSpacing: 2,
          textTransform: "uppercase",
        }}
      >
        {type}
      </div>
      <div
        style={{
          color: colors.text,
          fontSize: 16,
          fontWeight: 300,
          fontFamily,
          marginTop: 8,
          opacity: 0.7,
        }}
      >
        French Flow
      </div>
    </AbsoluteFill>
  );
};

export const OutroOverlay: React.FC = () => {
  return (
    <AbsoluteFill
      style={{
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.primary,
      }}
    >
      <div
        style={{
          color: colors.secondary,
          fontSize: 22,
          fontWeight: 700,
          fontFamily,
        }}
      >
        À bientôt !
      </div>
      <div
        style={{
          color: colors.text,
          fontSize: 14,
          fontWeight: 300,
          fontFamily,
          marginTop: 6,
          opacity: 0.6,
        }}
      >
        French Flow &mdash; إلى اللقاء
      </div>
    </AbsoluteFill>
  );
};

export const BottomBar: React.FC<{ label: string }> = ({ label }) => {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 40,
        backgroundColor: colors.primary,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <span
        style={{
          color: colors.secondary,
          fontSize: 13,
          fontWeight: 600,
          fontFamily,
          letterSpacing: 1,
        }}
      >
        {label}
      </span>
    </div>
  );
};
