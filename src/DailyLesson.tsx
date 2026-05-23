import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
} from "remotion";
import {
  fonts,
  colors,
  GradientBackground,
  GlassCard,
  IntroOverlay,
  OutroOverlay,
  TopBar,
} from "./FrenchFlowBrand";

const FPS = 30;
const INTRO_F = 1.5 * FPS;
const OUTRO_F = 1 * FPS;

const springIn = (frame: number, delay = 0) => {
  const f = Math.max(0, frame - delay);
  const progress = interpolate(f, [0, 25], [0, 1], {
    easing: Easing.bezier(0.34, 1.56, 0.64, 1),
    extrapolateRight: "clamp",
  });
  return progress;
};

const fadeSlide = (frame: number, delay = 0, yFrom = 30) => {
  const f = Math.max(0, frame - delay);
  const opacity = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 20], [yFrom, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  return { opacity, y };
};

const GlowText: React.FC<{
  text: string;
  style?: React.CSSProperties;
  color?: string;
}> = ({ text, style, color = colors.accent }) => (
  <span
    style={{
      ...style,
      textShadow: `0 0 30px ${color}66, 0 0 60px ${color}33`,
    }}
  >
    {text}
  </span>
);

const TagPill: React.FC<{ text: string; color?: string }> = ({
  text,
  color = colors.accent,
}) => (
  <div
    style={{
      display: "inline-block",
      padding: "6px 18px",
      borderRadius: 20,
      background: `${color}22`,
      border: `1px solid ${color}44`,
      fontSize: 13,
      fontWeight: 500,
      fontFamily: fonts.body,
      color: color,
      letterSpacing: 1,
    }}
  >
    {text}
  </div>
);

interface WordData {
  id: number;
  french: string;
  arabic: string;
  level: string;
  example: string;
  example_ar: string;
}

interface GrammarData {
  id: number;
  title: string;
  title_ar: string;
  level: string;
  explanation: string;
  examples: string[];
}

interface VerbData {
  id: number;
  infinitive: string;
  arabic: string;
  level: string;
  present: Record<string, string>;
  passe_compose?: Record<string, string>;
  imparfait?: Record<string, string>;
}

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
}

// ─── Motivation du Jour ────────────────────────────────────────
export const MotDuJour: React.FC<{
  word: WordData;
  totalDuration: number;
}> = ({ word, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) return <IntroOverlay type="Mot du jour" />;
  if (frame >= totalDuration - OUTRO_F) return <OutroOverlay />;

  const cf = frame - INTRO_F;
  const { opacity: exOp, y: exY } = fadeSlide(cf, contentFrames * 0.45);
  const s = springIn(cf);

  return (
    <AbsoluteFill>
      <GradientBackground />
      <TopBar label="MOT DU JOUR" progress={cf / contentFrames} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        {/* French word */}
        <div style={{ opacity: s, transform: `scale(${s})`, marginBottom: 8 }}>
          <TagPill text={word.level} color={colors.accent2} />
        </div>
        <GlowText
          text={word.french}
          color={colors.accent}
          style={{
            fontSize: 72,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            marginBottom: 8,
            opacity: s,
            transform: `scale(${s})`,
          }}
        />
        {/* Arabic translation */}
        <div
          style={{
            fontSize: 28,
            fontWeight: 400,
            fontFamily: fonts.body,
            color: colors.accent2,
            opacity: s,
            marginBottom: 36,
          }}
        >
          {word.arabic}
        </div>
        {/* Example */}
        <GlassCard>
          <div
            style={{
              fontSize: 18,
              fontWeight: 300,
              fontFamily: fonts.body,
              color: colors.text,
              fontStyle: "italic",
              opacity: exOp,
              transform: `translateY(${exY}px)`,
              textAlign: "center",
              lineHeight: 1.7,
            }}
          >
            {word.example}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 300,
              fontFamily: fonts.body,
              color: colors.textMuted,
              opacity: exOp * 0.7,
              marginTop: 8,
              textAlign: "center",
            }}
          >
            {word.example_ar}
          </div>
        </GlassCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Phrase du Jour ────────────────────────────────────────────
export const PhraseDuJour: React.FC<{
  word: WordData;
  totalDuration: number;
}> = ({ word, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) return <IntroOverlay type="Phrase du jour" />;
  if (frame >= totalDuration - OUTRO_F) return <OutroOverlay />;

  const cf = frame - INTRO_F;
  const words = word.example.split(" ");
  const arabicWords = word.example_ar.split(" ");

  return (
    <AbsoluteFill>
      <GradientBackground />
      <TopBar label="PHRASE DU JOUR" progress={cf / contentFrames} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <GlassCard width="90%">
          <div
            style={{
              fontSize: 22,
              fontWeight: 500,
              fontFamily: fonts.heading,
              color: colors.text,
              textAlign: "center",
              lineHeight: 2.2,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 6,
            }}
          >
            {words.map((w, i) => {
              const { opacity, y } = fadeSlide(cf, i * 8);
              const bg = `${colors.glass}`;
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    padding: "6px 14px",
                    borderRadius: 10,
                    background: bg,
                    border: `1px solid ${colors.glassBorder}`,
                    opacity,
                    transform: `translateY(${y}px)`,
                  }}
                >
                  {w}
                  <span
                    style={{
                      display: "block",
                      fontSize: 12,
                      color: colors.accent2,
                      fontWeight: 300,
                      marginTop: 2,
                      opacity: 0.8,
                    }}
                  >
                    {arabicWords[i] || ""}
                  </span>
                </span>
              );
            })}
          </div>
        </GlassCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Grammaire ─────────────────────────────────────────────────
export const Grammaire: React.FC<{
  grammar: GrammarData;
  totalDuration: number;
}> = ({ grammar, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) return <IntroOverlay type="Grammaire" />;
  if (frame >= totalDuration - OUTRO_F) return <OutroOverlay />;

  const cf = frame - INTRO_F;
  const { opacity: tOp, y: tY } = fadeSlide(cf);
  const { opacity: eOp, y: eY } = fadeSlide(cf, contentFrames * 0.35);

  return (
    <AbsoluteFill>
      <GradientBackground />
      <TopBar label="GRAMMAIRE" progress={cf / contentFrames} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: tOp, transform: `translateY(${tY}px)`, textAlign: "center", marginBottom: 16 }}>
          <TagPill text={grammar.level} color={colors.accent3} />
        </div>
        <GlowText
          text={grammar.title}
          color={colors.accent2}
          style={{
            fontSize: 32,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            opacity: tOp,
            transform: `translateY(${tY}px)`,
            marginBottom: 6,
            textAlign: "center",
            padding: "0 20px",
          }}
        />
        <div
          style={{
            fontSize: 18,
            fontWeight: 300,
            fontFamily: fonts.body,
            color: colors.textMuted,
            opacity: tOp * 0.7,
            marginBottom: 24,
          }}
        >
          {grammar.title_ar}
        </div>
        <GlassCard>
          <div
            style={{
              fontSize: 16,
              fontWeight: 300,
              fontFamily: fonts.body,
              color: colors.text,
              textAlign: "center",
              lineHeight: 1.8,
              opacity: eOp,
              transform: `translateY(${eY}px)`,
            }}
          >
            {grammar.explanation}
          </div>
          <div
            style={{
              opacity: eOp,
              marginTop: 16,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {grammar.examples.map((ex, i) => (
              <div
                key={i}
                style={{
                  fontSize: 16,
                  fontWeight: 400,
                  fontFamily: fonts.body,
                  color: colors.accent3,
                  padding: "10px 18px",
                  borderRadius: 10,
                  background: `${colors.accent3}11`,
                  border: `1px solid ${colors.accent3}22`,
                  textAlign: "center",
                }}
              >
                {ex}
              </div>
            ))}
          </div>
        </GlassCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Quiz ──────────────────────────────────────────────────────
export const Quiz: React.FC<{
  quiz: QuizData;
  totalDuration: number;
}> = ({ quiz, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) return <IntroOverlay type="Quiz" />;
  if (frame >= totalDuration - OUTRO_F) return <OutroOverlay />;

  const cf = frame - INTRO_F;
  const revealFrame = contentFrames * 0.65;

  return (
    <AbsoluteFill>
      <GradientBackground />
      <TopBar label="QUIZ" progress={cf / contentFrames} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 600,
            fontFamily: fonts.heading,
            color: colors.text,
            textAlign: "center",
            marginBottom: 32,
            padding: "0 24px",
            opacity: springIn(cf),
          }}
        >
          {quiz.question}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            width: "80%",
          }}
        >
          {quiz.options.map((opt, i) => {
            const isCorrect = i === quiz.correctIndex;
            const showAnswer = cf >= revealFrame;
            const s = springIn(cf, i * 4);

            let bg = colors.glass;
            let border = colors.glassBorder;
            let txtColor = colors.text;
            if (showAnswer) {
              bg = isCorrect ? "#6BCB7722" : "#FF6B6B22";
              border = isCorrect ? colors.accent3 : colors.accent;
              txtColor = isCorrect ? colors.accent3 : colors.accent;
            }

            return (
              <div
                key={i}
                style={{
                  padding: "16px 24px",
                  borderRadius: 14,
                  background: bg,
                  border: `1px solid ${border}`,
                  fontSize: 18,
                  fontWeight: 500,
                  fontFamily: fonts.body,
                  color: txtColor,
                  textAlign: "center",
                  opacity: s,
                  transform: `scale(${s})`,
                  transition: "all 0.1s",
                }}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── Conjugaison ───────────────────────────────────────────────
export const Conjugaison: React.FC<{
  verb: VerbData;
  totalDuration: number;
}> = ({ verb, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) return <IntroOverlay type="Conjugaison" />;
  if (frame >= totalDuration - OUTRO_F) return <OutroOverlay />;

  const cf = frame - INTRO_F;
  const pronouns = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

  return (
    <AbsoluteFill>
      <GradientBackground />
      <TopBar label="CONJUGAISON" progress={cf / contentFrames} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 20, opacity: springIn(cf) }}>
          <TagPill text={verb.level} color={colors.accent} />
        </div>
        <GlowText
          text={verb.infinitive}
          color={colors.accent}
          style={{
            fontSize: 40,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            opacity: springIn(cf),
            transform: `scale(${springIn(cf)})`,
            marginBottom: 4,
          }}
        />
        <div
          style={{
            fontSize: 14,
            fontWeight: 300,
            fontFamily: fonts.body,
            color: colors.textMuted,
            opacity: springIn(cf) * 0.7,
            marginBottom: 20,
          }}
        >
          {verb.arabic}
        </div>

        <GlassCard width="70%">
          {pronouns.map((p, i) => {
            const s = springIn(cf, i * 4);
            return (
              <div
                key={p}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px 16px",
                  borderBottom: i < pronouns.length - 1 ? `1px solid ${colors.glassBorder}` : "none",
                  opacity: s,
                  transform: `translateY(${interpolate(s, [0, 1], [10, 0])}px)`,
                }}
              >
                <span
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    fontFamily: fonts.heading,
                    color: colors.textMuted,
                  }}
                >
                  {p}
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 500,
                    fontFamily: fonts.body,
                    color: colors.accent2,
                    textShadow: `0 0 15px ${colors.accent2}44`,
                  }}
                >
                  {verb.present[p]}
                </span>
              </div>
            );
          })}
        </GlassCard>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
