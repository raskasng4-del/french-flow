import React from "react";
import { Composition } from "remotion";
import {
  MotDuJour,
  PhraseDuJour,
  Grammaire,
  Quiz,
  Conjugaison,
} from "./DailyLesson";
import { FrenchShorts } from "./FrenchShorts";
import { Dialogue } from "./Dialogue";
import { VocabularyGridComposition } from "./VocabularyGridComposition";

const FPS = 30;

const sampleWord = {
  id: 1,
  french: "Bonjour",
  level: "A1",
  example: "Bonjour, comment allez-vous ?",
};

const sampleGrammar = {
  id: 1,
  title: "Les articles définis",
  level: "A1",
  explanation:
    "Les articles définis (le, la, les) sont utilisés pour parler d'une chose spécifique.",
  examples: ["Le livre est sur la table.", "La maison est grande.", "Les enfants jouent."],
  lines: [
    { text: "Les articles définis", type: "title" as const },
    { text: "Les articles définis (le, la, les) sont utilisés pour parler d'une chose spécifique.", type: "explanation" as const },
    { text: "Le livre est sur la table.", type: "example" as const },
    { text: "La maison est grande.", type: "example" as const },
    { text: "Les enfants jouent.", type: "example" as const },
  ],
  timeline: [
    { lineIndex: 0, startFrame: 0, durationInFrames: 45, audioSrc: "audio/sample_grammar_0.mp3" },
    { lineIndex: 1, startFrame: 45, durationInFrames: 90, audioSrc: "audio/sample_grammar_1.mp3" },
    { lineIndex: 2, startFrame: 135, durationInFrames: 60, audioSrc: "audio/sample_grammar_2.mp3" },
    { lineIndex: 3, startFrame: 195, durationInFrames: 60, audioSrc: "audio/sample_grammar_3.mp3" },
    { lineIndex: 4, startFrame: 255, durationInFrames: 60, audioSrc: "audio/sample_grammar_4.mp3" },
  ],
};

const sampleVerb = {
  id: 1,
  infinitive: "Être",
  level: "A1",
  present: {
    je: "suis",
    tu: "es",
    "il/elle": "est",
    nous: "sommes",
    vous: "êtes",
    "ils/elles": "sont",
  },
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MotDuJour"
        component={MotDuJour}
        durationInFrames={Math.round(12.5 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ word: sampleWord, totalDuration: Math.round(12.5 * FPS) }}
      />
      <Composition
        id="PhraseDuJour"
        component={PhraseDuJour}
        durationInFrames={Math.round(14.5 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{ word: sampleWord, totalDuration: Math.round(14.5 * FPS) }}
      />
      <Composition
        id="Grammaire"
        component={Grammaire}
        durationInFrames={900}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          grammar: sampleGrammar,
          totalDuration: 900,
        }}
      />
      <Composition
        id="Quiz"
        component={Quiz}
        durationInFrames={Math.round(15.5 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          quiz: {
            question: 'Quel est ce mot ?',
            options: ["Bonjour", "Merci", "Ami", "Livre"],
            correctIndex: 0,
          },
          totalDuration: Math.round(15.5 * FPS),
        }}
      />
      <Composition
        id="Conjugaison"
        component={Conjugaison}
        durationInFrames={Math.round(17.5 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          verb: sampleVerb,
          totalDuration: Math.round(17.5 * FPS),
        }}
      />
      <Composition
        id="FrenchShorts"
        component={FrenchShorts as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={Math.round(18 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          title: "French Flow",
          phrases: [
            { french: "Arrête de parler", audioSrc: "audio/phrase_1.mp3" },
            { french: "Je suis fatigué", audioSrc: "audio/phrase_2.mp3" },
            { french: "Où est la gare ?", audioSrc: "audio/phrase_3.mp3" },
            { french: "Combien ça coûte ?", audioSrc: "audio/phrase_4.mp3" },
            { french: "Je ne comprends pas", audioSrc: "audio/phrase_5.mp3" },
          ],
          durationPerItem: 3,
        }}
      />
      <Composition
        id="Dialogue"
        component={Dialogue}
        durationInFrames={Math.round(17.5 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          dialogue: {
            id: 1,
            title: "Se présenter",
            level: "A1",
            lines: [
              { speaker: "homme", name: "Pierre", french: "Bonjour ! Je m'appelle Pierre." },
              { speaker: "femme", name: "Marie", french: "Salut Pierre ! Moi, c'est Marie." },
              { speaker: "homme", name: "Pierre", french: "Enchanté ! Tu es française ?" },
              { speaker: "femme", name: "Marie", french: "Oui, je suis française. Et toi ?" },
              { speaker: "homme", name: "Pierre", french: "Moi aussi ! Je suis de Paris." },
              { speaker: "femme", name: "Marie", french: "Super ! Moi, je suis de Lyon." },
            ],
          },
          totalDuration: Math.round(17.5 * FPS),
        }}
      />
      <Composition
        id="VocabularyGrid"
        component={VocabularyGridComposition as unknown as React.ComponentType<Record<string, unknown>>}
        durationInFrames={600}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          title: "Vocabulaire Essentiel",
          words: [
            { french: "Bonjour", english: "A1", emoji: "👋", audioSrc: "audio/placeholder.mp3" },
          ],
          timeline: [{ wordIndex: 0, startFrame: 0, durationInFrames: 90, audioSrc: "audio/placeholder.mp3" }],
          totalDuration: 600,
          bgMusicSrc: "bg-music.mp3",
        }}
      />
    </>
  );
};
