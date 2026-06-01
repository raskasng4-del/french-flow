import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  interpolate,
  Easing,
  Sequence,
  staticFile,
} from "remotion";
import { Audio } from "@remotion/media";
import {
  fonts,
  colors,
  IntroOverlay,
  OutroOverlay,
  TopBar,
  VideoContainer,
} from "./FrenchFlowBrand";

const FPS = 30;
const INTRO_F = 1.5 * FPS;
const OUTRO_F = 1 * FPS;

const fadeSlide = (frame: number, delay = 0, yFrom = 30) => {
  const f = Math.max(0, frame - delay);
  const opacity = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const y = interpolate(f, [0, 20], [yFrom, 0], {
    easing: Easing.bezier(0.16, 1, 0.3, 1),
    extrapolateRight: "clamp",
  });
  return { opacity, y };
};

const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      background: colors.cardBg,
      border: `1px solid ${colors.cardBorder}`,
      borderRadius: 16,
      padding: 32,
      width: "85%",
      ...style,
    }}
  >
    {children}
  </div>
);

const LevelPill: React.FC<{ text: string }> = ({ text }) => (
  <div
    style={{
      display: "inline-block",
      padding: "8px 24px",
      borderRadius: 20,
      background: colors.accent,
      fontSize: 16,
      fontWeight: 600,
      fontFamily: fonts.body,
      color: "#fff",
      letterSpacing: 1,
    }}
  >
    {text}
  </div>
);

interface WordData {
  id: number;
  french: string;
  level: string;
  example: string;
  audioSrc?: string;
  exampleAudioSrc?: string;
  phraseAudioSrc?: string;
}

interface GrammarLine {
  text?: string;
  text_display?: string;
  text_audio?: string;
  type: "title" | "explanation" | "example";
}

interface GrammarTimelineEntry {
  lineIndex: number;
  startFrame: number;
  durationInFrames: number;
  audioSrc: string;
}

interface GrammarData {
  id: number;
  title: string;
  level: string;
  explanation: string;
  examples: string[];
  audioSrc?: string;
  lines?: GrammarLine[];
  timeline?: GrammarTimelineEntry[];
}

interface VerbData {
  id: number;
  infinitive: string;
  level: string;
  present: Record<string, string>;
  passe_compose?: Record<string, string>;
  imparfait?: Record<string, string>;
  audioSrc?: string;
}

interface QuizData {
  question: string;
  options: string[];
  correctIndex: number;
  audioSrc?: string;
  wordAudioSrc?: string;
}

export const MotDuJour: React.FC<{
  word: WordData;
  totalDuration: number;
}> = ({ word, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F)
    return (
      <VideoContainer>
        <IntroOverlay type="Mot du jour" icon="🎯" />
      </VideoContainer>
    );
  if (frame >= totalDuration - OUTRO_F)
    return (
      <VideoContainer>
        <OutroOverlay />
      </VideoContainer>
    );

  const cf = frame - INTRO_F;
  const { opacity: s } = fadeSlide(cf);
  const { opacity: exOp, y: exY } = fadeSlide(cf, contentFrames * 0.45);

  return (
    <VideoContainer>
      <TopBar label="MOT DU JOUR" progress={cf / contentFrames} icon="🎯" />
      {word.audioSrc && (
        <Sequence from={INTRO_F} durationInFrames={Math.round(contentFrames * 0.45)}>
          <Audio src={staticFile(word.audioSrc)} volume={0.9} />
        </Sequence>
      )}
      {word.exampleAudioSrc && (
        <Sequence from={INTRO_F + Math.round(contentFrames * 0.45)} durationInFrames={Math.round(contentFrames * 0.55)}>
          <Audio src={staticFile(word.exampleAudioSrc)} volume={0.9} />
        </Sequence>
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: s, marginBottom: 12 }}>
          <LevelPill text={word.level} />
        </div>
        <div
          style={{
            fontSize: 110,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            marginBottom: 16,
            opacity: s,
            textAlign: "center",
          }}
        >
          {word.french}
        </div>
        <Card>
          <div
            style={{
              fontSize: 40,
              fontWeight: 600,
              fontFamily: fonts.heading,
              color: colors.text,
              textAlign: "center",
              lineHeight: 2.4,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
          {words.map((w, i) => {
            const { opacity, y } = fadeSlide(cf, i * 8);
            return (
              <span
                key={i}
                style={{
                  display: "inline-block",
                  padding: "14px 24px",
                  borderRadius: 14,
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  opacity,
                  transform: `translateY(${y}px)`,
                }}
              >
                {w}
              </span>
            );
          })}
        </div>
      </Card>
      </AbsoluteFill>
    </VideoContainer>
  );
};

export const PhraseDuJour: React.FC<{
  word: WordData;
  totalDuration: number;
}> = ({ word, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F)
    return (
      <VideoContainer>
        <IntroOverlay type="Phrase du jour" icon="💬" />
      </VideoContainer>
    );
  if (frame >= totalDuration - OUTRO_F)
    return (
      <VideoContainer>
        <OutroOverlay />
      </VideoContainer>
    );

  const cf = frame - INTRO_F;
  const words = word.example.split(" ");

  return (
    <VideoContainer>
      <TopBar label="PHRASE DU JOUR" progress={cf / contentFrames} icon="💬" />
      {word.phraseAudioSrc && (
        <Sequence from={INTRO_F} durationInFrames={contentFrames}>
          <Audio src={staticFile(word.phraseAudioSrc)} volume={0.9} />
        </Sequence>
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <Card width="92%">
          <div
            style={{
              fontSize: 32,
              fontWeight: 600,
              fontFamily: fonts.heading,
              color: colors.text,
              textAlign: "center",
              lineHeight: 2.4,
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: 8,
            }}
          >
            {words.map((w, i) => {
              const { opacity, y } = fadeSlide(cf, i * 8);
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    padding: "10px 20px",
                    borderRadius: 14,
                    background: colors.cardBg,
                    border: `1px solid ${colors.cardBorder}`,
                    opacity,
                    transform: `translateY(${y}px)`,
                  }}
                >
                  {w}
                </span>
              );
            })}
          </div>
        </Card>
      </AbsoluteFill>
    </VideoContainer>
  );
};

export const Grammaire: React.FC<{
  grammar: GrammarData;
  totalDuration: number;
}> = ({ grammar, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F)
    return (
      <VideoContainer>
        <IntroOverlay type="Grammaire" icon="📚" />
      </VideoContainer>
    );
  if (frame >= totalDuration - OUTRO_F)
    return (
      <VideoContainer>
        <OutroOverlay />
      </VideoContainer>
    );

  const cf = frame - INTRO_F;

  // Timeline-based karaoke mode
  if (grammar.timeline && grammar.lines) {
    const activeIndex = grammar.timeline.findIndex(
      (t) => cf >= t.startFrame && cf < t.startFrame + t.durationInFrames,
    );

    return (
      <VideoContainer>
        <TopBar label="GRAMMAIRE" progress={cf / contentFrames} icon="📚" />
        {grammar.timeline.map((entry, i) => (
          <Sequence key={i} from={INTRO_F + entry.startFrame} durationInFrames={entry.durationInFrames}>
            <Audio src={staticFile(entry.audioSrc)} volume={0.9} />
          </Sequence>
        ))}
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ marginBottom: 16, opacity: interpolate(cf, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>
            <LevelPill text={grammar.level} />
          </div>
          <div
            style={{
              width: "85%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            {grammar.lines.map((line, i) => {
              const entry = grammar.timeline[i];
              if (!entry) return null;
              const isActive = i === activeIndex;
              const isReached = cf >= entry.startFrame;
              const lineAge = Math.max(0, cf - entry.startFrame);
              const opacity = interpolate(lineAge, [0, 10], [0, 1], { extrapolateRight: "clamp" });
              const translateY = interpolate(lineAge, [0, 10], [15, 0], { extrapolateRight: "clamp" });

              const displayText = line.text_display || line.text || "";
              if (line.type === "title") {
                return (
                  <div
                    key={i}
                    style={{
                      fontSize: 48,
                      fontWeight: 700,
                      fontFamily: fonts.heading,
                      color: isActive ? "#00d4ff" : colors.text,
                      textAlign: "center",
                      marginBottom: 20,
                      opacity: Math.max(opacity, 0.3),
                    }}
                  >
                    {displayText}
                  </div>
                );
              }

              return (
                <div
                  key={i}
                  style={{
                    width: "100%",
                    padding: "12px 20px",
                    margin: "3px 0",
                    borderRadius: 12,
                    background: isActive ? "rgba(0, 212, 255, 0.08)" : "transparent",
                    borderLeft: isActive ? `4px solid #00d4ff` : `4px solid transparent`,
                    opacity: isReached ? opacity : 0,
                    transform: isReached ? `translateY(${translateY}px)` : "translateY(10px)",
                    display: isReached ? "block" : "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: line.type === "example" ? 26 : 28,
                      fontWeight: line.type === "example" ? 600 : 350,
                      fontFamily: fonts.body,
                      color: line.type === "example" ? colors.accent : (isActive ? "#00d4ff" : colors.text),
                      textAlign: "center",
                      display: "block",
                    }}
                  >
                    {displayText}
                  </span>
                </div>
              );
            })}
          </div>
        </AbsoluteFill>
      </VideoContainer>
    );
  }

  // Fallback: old static behavior
  const { opacity: tOp, y: tY } = fadeSlide(cf);
  const { opacity: eOp, y: eY } = fadeSlide(cf, contentFrames * 0.35);

  return (
    <VideoContainer>
      <TopBar label="GRAMMAIRE" progress={cf / contentFrames} icon="📚" />
      {grammar.audioSrc && (
        <Sequence from={INTRO_F} durationInFrames={contentFrames}>
          <Audio src={staticFile(grammar.audioSrc)} volume={0.9} />
        </Sequence>
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ opacity: tOp, transform: `translateY(${tY}px)`, marginBottom: 16 }}>
          <LevelPill text={grammar.level} />
        </div>
        <div
          style={{
            fontSize: 52,
            fontWeight: 700,
            fontFamily: fonts.heading,
            color: colors.text,
            opacity: tOp,
            transform: `translateY(${tY}px)`,
            marginBottom: 8,
            textAlign: "center",
            padding: "0 24px",
          }}
        >
          {grammar.title}
        </div>
        <Card>
          <div
            style={{
              fontSize: 30,
              fontWeight: 350,
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
              marginTop: 20,
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {grammar.examples.map((ex, i) => (
              <div
                key={i}
                style={{
                  fontSize: 28,
                  fontWeight: 500,
                  fontFamily: fonts.body,
                  color: colors.accent,
                  padding: "16px 24px",
                  borderRadius: 12,
                  background: colors.cardBg,
                  border: `1px solid ${colors.cardBorder}`,
                  textAlign: "center",
                }}
              >
                {ex}
              </div>
            ))}
          </div>
        </Card>
      </AbsoluteFill>
    </VideoContainer>
  );
};

export const Quiz: React.FC<{
  quiz: QuizData;
  totalDuration: number;
}> = ({ quiz, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F)
    return (
      <VideoContainer>
        <IntroOverlay type="Quiz" icon="❓" />
      </VideoContainer>
    );
  if (frame >= totalDuration - OUTRO_F)
    return (
      <VideoContainer>
        <OutroOverlay />
      </VideoContainer>
    );

  const cf = frame - INTRO_F;
  const revealFrame = contentFrames * 0.65;

  return (
    <VideoContainer>
      <TopBar label="QUIZ" progress={cf / contentFrames} icon="❓" />
      {quiz.audioSrc && (
        <Sequence from={INTRO_F} durationInFrames={contentFrames}>
          <Audio src={staticFile(quiz.audioSrc)} volume={0.9} />
        </Sequence>
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div
          style={{
          fontSize: 44,
          fontWeight: 700,
          fontFamily: fonts.heading,
          color: colors.text,
          textAlign: "center",
          marginBottom: 40,
            padding: "0 24px",
            opacity: interpolate(cf, [0, 15], [0, 1], { extrapolateRight: "clamp" }),
          }}
        >
          {quiz.question}
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
            width: "85%",
          }}
        >
          {quiz.options.map((opt, i) => {
            const isCorrect = i === quiz.correctIndex;
            const showAnswer = cf >= revealFrame;
            const prog = interpolate(Math.max(0, cf - i * 4), [0, 15], [0, 1], { extrapolateRight: "clamp" });

            let bg = colors.cardBg;
            let border = colors.cardBorder;
            let txtColor = colors.text;
            if (showAnswer) {
              bg = isCorrect ? "#E8F5E9" : "#FFEBEE";
              border = isCorrect ? colors.accent3 : colors.accent2;
              txtColor = isCorrect ? colors.accent3 : colors.accent2;
            }

            return (
              <div
                key={i}
                style={{
                  padding: "20px 28px",
                  borderRadius: 16,
                  background: bg,
                  border: `2px solid ${border}`,
                  fontSize: 30,
                  fontWeight: 600,
                  fontFamily: fonts.body,
                  color: txtColor,
                  textAlign: "center",
                  opacity: prog,
                  transform: `scale(${prog})`,
                }}
              >
                {String.fromCharCode(65 + i)}. {opt}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </VideoContainer>
  );
};

export const Conjugaison: React.FC<{
  verb: VerbData;
  totalDuration: number;
}> = ({ verb, totalDuration }) => {
  const frame = useCurrentFrame();
  const contentFrames = totalDuration - INTRO_F - OUTRO_F;

  if (frame < INTRO_F)
    return (
      <VideoContainer>
        <IntroOverlay type="Conjugaison" icon="📝" />
      </VideoContainer>
    );
  if (frame >= totalDuration - OUTRO_F)
    return (
      <VideoContainer>
        <OutroOverlay />
      </VideoContainer>
    );

  const cf = frame - INTRO_F;
  const pronouns = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

  return (
    <VideoContainer>
      <TopBar label="CONJUGAISON" progress={cf / contentFrames} icon="📝" />
      {verb.audioSrc && (
        <Sequence from={INTRO_F} durationInFrames={contentFrames}>
          <Audio src={staticFile(verb.audioSrc)} volume={0.9} />
        </Sequence>
      )}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
        <div style={{ marginBottom: 20, opacity: interpolate(cf, [0, 15], [0, 1], { extrapolateRight: "clamp" }) }}>
          <LevelPill text={verb.level} />
        </div>
        <div
          style={{
          fontSize: 64,
          fontWeight: 700,
          fontFamily: fonts.heading,
          color: colors.text,
          marginBottom: 8,
          }}
        >
          {verb.infinitive}
        </div>
        <Card style={{ width: "75%", padding: 0 }}>
          {pronouns.map((p, i) => {
            const prog = interpolate(Math.max(0, cf - i * 4), [0, 15], [0, 1], { extrapolateRight: "clamp" });
            return (
              <div
                key={p}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "14px 20px",
                  borderBottom: i < pronouns.length - 1 ? `1px solid ${colors.cardBorder}` : "none",
                  opacity: prog,
                  transform: `translateY(${interpolate(prog, [0, 1], [10, 0])}px)`,
                }}
              >
                <span
                  style={{
                    fontSize: 28,
                    fontWeight: 600,
                    fontFamily: fonts.heading,
                    color: colors.textMuted,
                  }}
                >
                  {p}
                </span>
                <span
                  style={{
                    fontSize: 32,
                    fontWeight: 600,
                    fontFamily: fonts.body,
                    color: colors.accent,
                  }}
                >
                  {verb.present[p]}
                </span>
              </div>
            );
          })}
        </Card>
      </AbsoluteFill>
    </VideoContainer>
  );
};
