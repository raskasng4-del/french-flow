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

const FPS = 30;

const sampleWord = {
  id: 1,
  french: "Bonjour",
  arabic: "صباح الخير",
  level: "A1",
  example: "Bonjour, comment allez-vous ?",
  example_ar: "صباح الخير، كيف حالكم؟",
};

const sampleGrammar = {
  id: 1,
  title: "Les articles définis",
  title_ar: "أدوات التعريف",
  level: "A1",
  explanation:
    "في الفرنسية، هناك أدوات تعريف: le (مذكر), la (مؤنث), les (جمع). تستخدم قبل الاسم لتحديده.",
  examples: ["Le livre est sur la table.", "La maison est grande.", "Les enfants jouent."],
};

const sampleVerb = {
  id: 1,
  infinitive: "Être",
  arabic: "يكون",
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
        durationInFrames={Math.round(17.5 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          grammar: sampleGrammar,
          totalDuration: Math.round(17.5 * FPS),
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
            question: 'Quelle est la traduction de "Bonjour" ?',
            options: ["مساء الخير", "صباح الخير", "تصبح على خير", "وداعاً"],
            correctIndex: 1,
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
        component={FrenchShorts}
        durationInFrames={Math.round(18 * FPS)}
        fps={FPS}
        width={1080}
        height={1920}
        defaultProps={{
          title: "تعلم اللغة الفرنسية 🇫🇷",
          phrases: [
            { french: "arrête de parler", arabic: "توقف عن الكلام", audioSrc: "audio/phrase_1.mp3" },
            { french: "je suis fatigué", arabic: "أنا متعب", audioSrc: "audio/phrase_2.mp3" },
            { french: "où est la gare ?", arabic: "أين المحطة؟", audioSrc: "audio/phrase_3.mp3" },
            { french: "combien ça coûte ?", arabic: "بكم هذا؟", audioSrc: "audio/phrase_4.mp3" },
            { french: "je ne comprends pas", arabic: "أنا لا أفهم", audioSrc: "audio/phrase_5.mp3" },
          ],
          durationPerItem: 3,
        }}
      />
    </>
  );
};
