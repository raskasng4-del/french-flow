import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  useVideoConfig,
  Audio,
  staticFile,
} from "remotion";
import { colors, IntroOverlay, OutroOverlay, BottomBar } from "./FrenchFlowBrand";

const fontFamily = "'Helvetica Neue', Arial, sans-serif";
const FPS = 30;
const INTRO_F = 1.5 * FPS;
const OUTRO_F = 1 * FPS;

const fadeIn = (frame: number, duration = FPS * 0.5) =>
  interpolate(frame, [0, duration], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

const slideUp = (frame: number, delay = 0, duration = FPS * 0.6) =>
  interpolate(frame, [delay, delay + duration], [40, 0], {
    extrapolateRight: "clamp",
    easing: Easing.bezier(0.16, 1, 0.3, 1),
  });

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

const ProgressBar: React.FC<{ frame: number; total: number }> = ({
  frame,
  total,
}) => {
  const progress = interpolate(frame, [0, total], [0, 1], {
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        backgroundColor: "rgba(255,255,255,0.15)",
      }}
    >
      <div
        style={{
          height: "100%",
          width: `${progress * 100}%`,
          backgroundColor: colors.secondary,
          transition: "width 0.1s linear",
        }}
      />
    </div>
  );
};

const WordHighlight: React.FC<{
  word: string;
  translation: string;
  frame: number;
  index: number;
}> = ({ word, translation, frame, index }) => {
  const delay = index * 12;
  const opacity = fadeIn(Math.max(0, frame - delay));
  const y = slideUp(frame, delay);
  return (
    <span
      style={{
        display: "inline-block",
        margin: "0 6px",
        padding: "4px 10px",
        borderRadius: 6,
        backgroundColor: colors.primary,
        color: colors.text,
        fontSize: 22,
        fontFamily,
        opacity,
        transform: `translateY(${y}px)`,
      }}
    >
      {word}
      <span
        style={{
          display: "block",
          fontSize: 14,
          color: colors.secondary,
          marginTop: 2,
        }}
      >
        {translation}
      </span>
    </span>
  );
};

export const MotDuJour: React.FC<{
  word: WordData;
  totalDuration: number;
}> = ({ word, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) {
    return <IntroOverlay type="Mot du jour" />;
  }
  if (frame >= totalDuration - OUTRO_F) {
    return <OutroOverlay />;
  }

  const cf = frame - INTRO_F;
  const centerOpacity = fadeIn(cf);
  const exampleOpacity = fadeIn(Math.max(0, cf - contentFrames * 0.5));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <ProgressBar frame={cf} total={contentFrames} />

      <div
        style={{
          fontSize: 56,
          fontWeight: 700,
          fontFamily,
          color: colors.accent,
          opacity: centerOpacity,
          transform: `translateY(${slideUp(cf)}px)`,
          marginBottom: 10,
        }}
      >
        {word.french}
      </div>

      <div
        style={{
          fontSize: 28,
          fontWeight: 400,
          fontFamily,
          color: colors.textDark,
          opacity: centerOpacity,
          marginBottom: 30,
        }}
      >
        {word.arabic}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 300,
          fontFamily,
          color: colors.textDark,
          fontStyle: "italic",
          opacity: exampleOpacity,
          textAlign: "center",
          maxWidth: "80%",
        }}
      >
        {word.example}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 300,
          fontFamily,
          color: colors.border,
          opacity: exampleOpacity * 0.7,
          marginTop: 8,
          textAlign: "center",
        }}
      >
        {word.example_ar}
      </div>

      <BottomBar label={`Niveau ${word.level}`} />
    </AbsoluteFill>
  );
};

export const PhraseDuJour: React.FC<{
  word: WordData;
  totalDuration: number;
}> = ({ word, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) {
    return <IntroOverlay type="Phrase du jour" />;
  }
  if (frame >= totalDuration - OUTRO_F) {
    return <OutroOverlay />;
  }

  const cf = frame - INTRO_F;
  const words = word.example.split(" ");
  const arabicWords = word.example_ar.split(" ");

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <ProgressBar frame={cf} total={contentFrames} />

      <div
        style={{
          fontSize: 26,
          fontWeight: 600,
          fontFamily,
          color: colors.textDark,
          marginBottom: 30,
          textAlign: "center",
          lineHeight: 1.6,
          maxWidth: "85%",
        }}
      >
        {words.map((w, i) => (
          <WordHighlight
            key={i}
            word={w}
            translation={arabicWords[i] || ""}
            frame={cf}
            index={i}
          />
        ))}
      </div>

      <BottomBar label={`Mot: ${word.french}`} />
    </AbsoluteFill>
  );
};

export const Grammaire: React.FC<{
  grammar: GrammarData;
  totalDuration: number;
}> = ({ grammar, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) {
    return <IntroOverlay type="Grammaire" />;
  }
  if (frame >= totalDuration - OUTRO_F) {
    return <OutroOverlay />;
  }

  const cf = frame - INTRO_F;
  const titleOpacity = fadeIn(cf);
  const explOpacity = fadeIn(Math.max(0, cf - 20));
  const exOpacity = fadeIn(Math.max(0, cf - contentFrames * 0.4));

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <ProgressBar frame={cf} total={contentFrames} />

      <div
        style={{
          fontSize: 32,
          fontWeight: 700,
          fontFamily,
          color: colors.primary,
          opacity: titleOpacity,
          marginBottom: 8,
          textAlign: "center",
        }}
      >
        {grammar.title}
      </div>

      <div
        style={{
          fontSize: 18,
          fontWeight: 400,
          fontFamily,
          color: colors.secondary,
          opacity: titleOpacity * 0.8,
          marginBottom: 24,
        }}
      >
        {grammar.title_ar}
      </div>

      <div
        style={{
          fontSize: 20,
          fontWeight: 300,
          fontFamily,
          color: colors.textDark,
          opacity: explOpacity,
          textAlign: "center",
          lineHeight: 1.7,
          maxWidth: "80%",
          marginBottom: 24,
        }}
      >
        {grammar.explanation}
      </div>

      <div
        style={{
          opacity: exOpacity,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {grammar.examples.map((ex, i) => (
          <div
            key={i}
            style={{
              fontSize: 18,
              fontWeight: 400,
              fontFamily,
              color: colors.accent,
              padding: "8px 20px",
              borderRadius: 8,
              backgroundColor: "rgba(231,76,60,0.08)",
            }}
          >
            {ex}
          </div>
        ))}
      </div>

      <BottomBar label={`Niveau ${grammar.level}`} />
    </AbsoluteFill>
  );
};

export const Quiz: React.FC<{
  quiz: QuizData;
  totalDuration: number;
}> = ({ quiz, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) {
    return <IntroOverlay type="Quiz" />;
  }
  if (frame >= totalDuration - OUTRO_F) {
    return <OutroOverlay />;
  }

  const cf = frame - INTRO_F;
  const questionOpacity = fadeIn(cf);
  const revealFrame = contentFrames * 0.7;

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <ProgressBar frame={cf} total={contentFrames} />

      <div
        style={{
          fontSize: 28,
          fontWeight: 700,
          fontFamily,
          color: colors.primary,
          opacity: questionOpacity,
          marginBottom: 36,
          textAlign: "center",
        }}
      >
        {quiz.question}
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          width: "70%",
        }}
      >
        {quiz.options.map((opt, i) => {
          const isCorrect = i === quiz.correctIndex;
          const showAnswer = cf >= revealFrame;
          const bgColor = showAnswer
            ? isCorrect
              ? colors.success
              : colors.accent
            : colors.primary;
          return (
            <div
              key={i}
              style={{
                padding: "14px 24px",
                borderRadius: 10,
                backgroundColor: bgColor,
                color: colors.text,
                fontSize: 20,
                fontWeight: 500,
                fontFamily,
                textAlign: "center",
                opacity: fadeIn(Math.max(0, cf - i * 8)),
                transform: `translateX(${slideUp(cf, i * 8)}px)`,
              }}
            >
              {String.fromCharCode(65 + i)}. {opt}
            </div>
          );
        })}
      </div>

      <BottomBar label="Quiz" />
    </AbsoluteFill>
  );
};

export const Conjugaison: React.FC<{
  verb: VerbData;
  totalDuration: number;
}> = ({ verb, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F) {
    return <IntroOverlay type="Conjugaison" />;
  }
  if (frame >= totalDuration - OUTRO_F) {
    return <OutroOverlay />;
  }

  const cf = frame - INTRO_F;
  const pronouns = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

  return (
    <AbsoluteFill
      style={{
        backgroundColor: colors.bgLight,
        justifyContent: "center",
        alignItems: "center",
        padding: 40,
      }}
    >
      <ProgressBar frame={cf} total={contentFrames} />

      <div
        style={{
          fontSize: 36,
          fontWeight: 700,
          fontFamily,
          color: colors.accent,
          opacity: fadeIn(cf),
          marginBottom: 4,
        }}
      >
        {verb.infinitive}
      </div>

      <div
        style={{
          fontSize: 16,
          fontWeight: 300,
          fontFamily,
          color: colors.border,
          opacity: fadeIn(cf) * 0.7,
          marginBottom: 24,
        }}
      >
        {verb.arabic}
      </div>

      <table
        style={{
          width: "60%",
          borderCollapse: "collapse",
          opacity: fadeIn(Math.max(0, cf - 10)),
        }}
      >
        <thead>
          <tr>
            <th
              style={{
                padding: "8px 16px",
                backgroundColor: colors.primary,
                color: colors.text,
                fontSize: 14,
                fontFamily,
                textAlign: "left",
              }}
            >
              Sujet
            </th>
            <th
              style={{
                padding: "8px 16px",
                backgroundColor: colors.primary,
                color: colors.text,
                fontSize: 14,
                fontFamily,
                textAlign: "left",
              }}
            >
              Présent
            </th>
          </tr>
        </thead>
        <tbody>
          {pronouns.map((p, i) => (
            <tr key={p}>
              <td
                style={{
                  padding: "8px 16px",
                  fontSize: 18,
                  fontWeight: 600,
                  fontFamily,
                  color: colors.textDark,
                  borderBottom: `1px solid ${colors.border}`,
                  opacity: fadeIn(Math.max(0, cf - i * 8)),
                }}
              >
                {p}
              </td>
              <td
                style={{
                  padding: "8px 16px",
                  fontSize: 18,
                  fontWeight: 400,
                  fontFamily,
                  color: colors.accent,
                  borderBottom: `1px solid ${colors.border}`,
                  opacity: fadeIn(Math.max(0, cf - i * 8)),
                  transform: `translateY(${slideUp(cf, i * 8)}px)`,
                }}
              >
                {verb.present[p]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <BottomBar label={`Niveau ${verb.level}`} />
    </AbsoluteFill>
  );
};
