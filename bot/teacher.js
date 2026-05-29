const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const BOT_DIR = __dirname;
const PROJECT_ROOT = path.resolve(BOT_DIR, "..");
const WORDS_FILE = path.join(BOT_DIR, "words.json");
const GRAMMAR_FILE = path.join(BOT_DIR, "grammar.json");
const VERBS_FILE = path.join(BOT_DIR, "verbs.json");
const CURRICULUM_FILE = path.join(BOT_DIR, "curriculum.json");
const PROGRESS_FILE = path.join(BOT_DIR, "progress.json");
const USER_PHRASES_FILE = path.join(BOT_DIR, "user_phrases.json");
const DIALOGUES_FILE = path.join(BOT_DIR, "dialogues.json");
const IDIOMES_FILE = path.join(BOT_DIR, "idiomes.json");
const CULTURE_FILE = path.join(BOT_DIR, "culture.json");
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

const LEVEL_HASHTAGS = {
  "A1": "#A1Français #Débutant #FrançaisPourTous",
  "A2": "#A2Français #FauxDébutant #ApprendreLeFrançais",
  "B1": "#B1Français #Intermédiaire #FrançaisFacile",
  "B2": "#B2Français #IntermédiaireAvancé #MaîtriseLeFrançais",
  "C1": "#C1Français #Avancé #FrançaisSoutenu",
  "C2": "#C2Français #Expert #FrançaisAvancé",
};
const TYPE_HASHTAGS = {
  "MotDuJour": "#MotDuJour #Vocabulaire",
  "PhraseDuJour": "#PhraseDuJour #Expression",
  "Grammaire": "#Grammaire #LeçonDeGrammaire",
  "Quiz": "#QuizFrançais #Test",
  "Conjugaison": "#Conjugaison #Verbe",
  "Idiome": "#Idiome #ExpressionFrançaise",
  "Culture": "#CultureFrançaise #Civilisation",
  "Dialogue": "#DialogueFrançais #Conversation",
  "Révision": "#Révision #ApprendreLeFrançais",
};

const ACTIVITY_TYPES = ["MotDuJour", "Grammaire", "PhraseDuJour", "Quiz", "Conjugaison", "Idiome", "Culture"];
const VOCAB_EMOJIS = ["🏠", "🚗", "📖", "🐱", "🌸", "🥖", "🍎", "🐶", "🌍", "🎵", "✈️", "🏖️", "🎂", "☕", "👗", "📚", "🎮", "🎨", "💻", "📱", "🔑", "💡", "📷", "👟", "🧥", "👜", "👒", "🧸", "🎈", "🎁", "🕶️", "🌻", "🍕", "🥗", "🍩"];

function getVocabEmoji(word) {
  let hash = 0;
  for (let i = 0; i < word.length; i++) hash = (hash * 31 + word.charCodeAt(i)) | 0;
  return VOCAB_EMOJIS[Math.abs(hash) % VOCAB_EMOJIS.length];
}

const VOCAB_GRID_DESCRIPTION_HOOKS = [
  "Want to expand your French vocabulary? 🚀",
  "Ready to learn some new French words today? 🇫🇷",
  "Boost your French vocabulary with these essential words! 💪",
  "Looking to grow your French word bank? 📚",
  "Master these French words and sound more natural! 🗣️",
];
const VOCAB_GRID_CTAS = [
  "Which word is new for you? Let us know in the comments! 👇",
  "Try using one of these words in a sentence below! 🗣️",
  "Practice these words out loud and tell us which one you like best! 🎯",
  "How many of these words did you already know? Comment below! 💬",
];

const INTERACTIVE_QUESTIONS = [
  "Écrivez votre réponse dans les commentaires ! 👇",
  "Partagez votre réponse dans les commentaires ! 💬",
  "Entraînez-vous à voix haute et commentez ! 🎯",
  "Dites-nous en commentaire ce que vous en pensez ! 🗣",
  "Réfléchissez et répondez en commentaire. 🤔",
  "Pratiquez et écrivez un exemple en commentaire ! ✍️",
];

// Spaced Repetition System
const SRS_INTERVALS = [1, 3, 7, 14, 30];

function todayStr() {
  return new Date().toISOString().split("T")[0];
}

function addDays(dateStr, days) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function initSRS(progress) {
  if (!progress.spaced_repetition) {
    progress.spaced_repetition = { words: {}, grammar: {}, verbs: {} };
  }
}

function trackForReview(progress, type, id) {
  initSRS(progress);
  const today = todayStr();
  const map = { MotDuJour: "words", PhraseDuJour: "words", Grammaire: "grammar", Quiz: "words", Conjugaison: "verbs", Idiome: "words", Culture: "words" };
  const category = map[type];
  if (!category) return;
  const entry = progress.spaced_repetition[category][id];
  if (!entry || entry.next_review <= today) {
    progress.spaced_repetition[category][id] = {
      first_seen: entry?.first_seen || today,
      last_reviewed: today,
      interval: entry ? Math.min(entry.interval * 2, 30) : 1,
      next_review: addDays(today, entry ? Math.min(entry.interval * 2, 30) : 1),
    };
  }
}

function getDueItems(progress, words, grammar, verbs, count) {
  initSRS(progress);
  const today = todayStr();
  const due = [];
  for (const cat of ["words", "grammar", "verbs"]) {
    const pool = cat === "words" ? words : cat === "grammar" ? grammar : verbs;
    for (const [idStr, info] of Object.entries(progress.spaced_repetition[cat])) {
      if (info.next_review <= today) {
        const item = pool.find((i) => i.id === parseInt(idStr));
        if (item) due.push({ category: cat, item, info });
      }
    }
  }
  due.sort((a, b) => a.info.next_review.localeCompare(b.info.next_review));
  return due.slice(0, count);
}

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { curriculum_idx: 0, generated_count: 0, published_videos: [], last_publish_date: null, used_combos: [] };
  }
  const p = loadJSON(PROGRESS_FILE);
  if (p.curriculum_idx === undefined) p.curriculum_idx = 0;
  if (p.generated_count === undefined) p.generated_count = 0;
  if (!p.used_combos) p.used_combos = [];
  return p;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildDescription(type, data, question) {
  const level = data.level || "A1";
  const typeTags = TYPE_HASHTAGS[type] || "#Français";
  const levelTags = LEVEL_HASHTAGS[level] || "#ApprendreLeFrançais";
  const hashtags = `#FrenchFlow #LearnFrench ${typeTags} ${levelTags}`;
  let desc = "";
  switch (type) {
    case "MotDuJour":
      desc = `🇫🇷 **Mot du jour** - French Flow\n\n✨ ${data.french}\n💬 ${data.example}`;
      break;
    case "PhraseDuJour":
      desc = `🇫🇷 **Phrase du jour** - French Flow\n\n🗣 ${data.example}`;
      break;
    case "Grammaire":
      desc = `🇫🇷 **Leçon de grammaire** - French Flow\n\n📚 ${data.title}`;
      break;
    case "Quiz":
      desc = `🇫🇷 **Quiz du jour** - French Flow\n\n❓ ${typeof data === "string" ? data : data.question}`;
      break;
    case "Conjugaison":
      const tenses = data.passe_compose ? "Présent + Passé composé" : data.imparfait ? "Présent + Imparfait" : "Présent";
      desc = `🇫🇷 **Conjugaison** - French Flow\n\n📝 ${data.infinitive} (${data.level})\n🔄 ${tenses}`;
      break;
    case "Idiome":
      desc = `🇫🇷 **Idiome du jour** - French Flow\n\n🗣 ${data.expression}\n💡 ${data.meaning}\n✏️ ${data.example}`;
      break;
    case "Culture":
      desc = `🇫🇷 **Culture française** - French Flow\n\n📖 ${data.title}`;
      break;
    case "Révision":
      desc = `🇫🇷 **Révision** - French Flow\n\n🔄 ${data.french || data.title || data.infinitive || data.expression}`;
      break;
    case "Dialogue": {
      const dLines = data.lines || [];
      const conversation = dLines.map(l => `${l.speaker === "femme" ? "👩" : "👨"} ${l.name}: ${l.french}`).join("\n");
      desc = `🇫🇷 **Dialogue** - French Flow\n\n💬 ${data.title} (${data.level})\n\n${conversation}`;
      break;
    }
    default:
      desc = `🇫🇷 **French Flow**`;
  }
  if (question) desc += `\n\n❓ **${question}**\n${INTERACTIVE_QUESTIONS[Math.floor(Math.random() * INTERACTIVE_QUESTIONS.length)]}`;
  return desc + `\n\n${hashtags}`;
}

function buildVocabGridDescription() {
  const hook = VOCAB_GRID_DESCRIPTION_HOOKS[Math.floor(Math.random() * VOCAB_GRID_DESCRIPTION_HOOKS.length)];
  const cta = VOCAB_GRID_CTAS[Math.floor(Math.random() * VOCAB_GRID_CTAS.length)];
  const hashtags = "#FrenchFlow #LearnFrench #FrenchVocabulary #FrenchWords #StudyFrench #FrenchForBeginners";
  return `${hook}\n\nHere are 6 essential French words for you to practice today. Listen, repeat, and try using them in sentences!\n\n${cta}\n\n${hashtags}`;
}

// Generate TTS audio for a text, returns audio path
function generateAudioFile(text, name, voice) {
  const AUDIO_DIR = path.join(PROJECT_ROOT, "public", "audio");
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const filename = `${name}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);
  if (!fs.existsSync(filepath)) {
    try {
      let cmd = `python3 "${path.join(BOT_DIR, "tts_helper.py")}" "${filepath}"`;
      if (voice) cmd += ` "${voice}"`;
      execSync(cmd, {
        input: text,
        timeout: 30000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      log(`  🔊 Generated: ${name}.mp3`);
    } catch (err) {
      log(`  ⚠️ TTS failed for "${text.slice(0, 30)}": ${err.message}`);
    }
  }
  return `audio/${filename}`;
}

// Call LLM via OpenCode Zen API — returns text or null on failure
async function callLLM(userPrompt, systemPrompt = "You are a French teacher.", model = "claude-sonnet-4") {
  const apiKey = process.env.ZEN_API_KEY;
  if (!apiKey) return null;
  try {
    const response = await fetch("https://opencode.ai/zen/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 1500,
        temperature: 0.7,
      }),
    });
    if (!response.ok) {
      log(`  ⚠️ LLM API error: ${response.status}`);
      return null;
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || null;
  } catch (err) {
    log(`  ⚠️ LLM call failed: ${err.message}`);
    return null;
  }
}

// Render a Remotion composition to video
function renderVideo(compositionId, props, outputFile) {
  const outputPath = path.join(OUTPUT_DIR, outputFile);
  log(`  🎬 Rendering ${compositionId} -> ${outputFile}`);

  const propsJSON = JSON.stringify(props).replace(/"/g, '\\"');
  const cmd = `npx remotion render ${compositionId} "${outputPath}" --props="${propsJSON}" --overwrite`;

  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048" },
    });
    return true;
  } catch (err) {
    log(`  ❌ Render failed: ${err.message}`);
    return false;
  }
}

// Publish video to Facebook
async function publishToFacebook(videoPath, description, pageId, accessToken) {
  if (!pageId || !accessToken) {
    log("  ⚠️ No Facebook credentials, skipping publish");
    return false;
  }

  log(`  📤 Publishing to Facebook...`);
  const url = `https://graph.facebook.com/v22.0/${pageId}/videos`;

  try {
    const videoBuffer = fs.readFileSync(videoPath);
    const blob = new Blob([videoBuffer], { type: "video/mp4" });
    const form = new FormData();
    form.append("source", blob, path.basename(videoPath));
    form.append("description", description);
    form.append("access_token", accessToken);

    const response = await fetch(url, { method: "POST", body: form });
    const result = await response.json();

    if (result.id) {
      log(`  ✅ Published! Video ID: ${result.id}`);
      return true;
    } else {
      log(`  ❌ Facebook error: ${JSON.stringify(result)}`);
      return false;
    }
  } catch (err) {
    log(`  ❌ Publish failed: ${err.message}`);
    return false;
  }
}

// Phase 1: publish pre-rendered videos
async function runPhase1(progress, pageId, accessToken) {
  log("📦 Phase 1: Publishing pre-rendered videos");

  const today = new Date().toISOString().split("T")[0];
  if (progress.last_publish_date === today && progress.phase === 1) {
    log("✅ Already published today");
    return;
  }

  // Auto-skip Phase 1 if no pre-rendered videos exist
  const firstVideo = path.join(OUTPUT_DIR, PHASE1_VIDEOS[0].file);
  if (!fs.existsSync(firstVideo)) {
    log("⚠️ No pre-rendered videos found. Skipping Phase 1 → Phase 2");
    progress.phase = 2;
    progress.current_day = 1;
    saveJSON(PROGRESS_FILE, progress);
    await runPhase2(progress, pageId, accessToken);
    return;
  }

  if (progress.phase1_index >= PHASE1_VIDEOS.length) {
    log("🎉 Phase 1 complete! Moving to Phase 2");
    progress.phase = 2;
    progress.current_day = 1;
    saveJSON(PROGRESS_FILE, progress);
    await runPhase2(progress, pageId, accessToken);
    return;
  }

  const remaining = PHASE1_VIDEOS.length - progress.phase1_index;
  const todayCount = Math.min(5, remaining);
  const todayVideos = PHASE1_VIDEOS.slice(progress.phase1_index, progress.phase1_index + todayCount);

  log(`🎯 Publishing ${todayCount} videos (${progress.phase1_index + 1}-${progress.phase1_index + todayCount}/22)`);

  for (const video of todayVideos) {
    const videoPath = path.join(OUTPUT_DIR, video.file);
    if (!fs.existsSync(videoPath)) {
      log(`  ⚠️ Missing: ${video.file}, skipping`);
      continue;
    }

    const success = await publishToFacebook(videoPath, video.description, pageId, accessToken);
    if (success) {
      progress.published_videos.push({
        file: video.file,
        type: video.type,
        date: today,
      });
    }
    await sleep(3000);
  }

  progress.phase1_index += todayCount;
  progress.last_publish_date = today;
  saveJSON(PROGRESS_FILE, progress);
  log(`✅ Phase 1: ${progress.phase1_index}/${PHASE1_VIDEOS.length} videos published`);
}

// Render a single activity and track it for spaced repetition
async function renderAndPublish(activity, compositionId, props, outputFile, pageId, accessToken, progress, today, question) {
  const ok = renderVideo(compositionId, props, outputFile);
  const videoPath = path.join(OUTPUT_DIR, outputFile);

  if (ok && fs.existsSync(videoPath)) {
    const desc = buildDescription(activity.type, props[Object.keys(props)[0]] || {}, question);
    const published = await publishToFacebook(videoPath, desc, pageId, accessToken);

    // Track for spaced repetition
    const id = activity.word_id || activity.grammar_id || activity.verb_id;
    if (id) trackForReview(progress, activity.type, id);

    await sleep(5000);
    return { type: activity.type, file: outputFile, published, date: today };
  }
  return null;
}

async function getActivityProps(activity, wordMap, grammarMap, verbMap, durations) {
  switch (activity.type) {
    case "MotDuJour": {
      const word = wordMap[activity.word_id];
      if (!word) return null;
      word.audioSrc = generateAudioFile(word.french, `word_${word.id}`);
      word.exampleAudioSrc = generateAudioFile(word.example, `example_${word.id}`);
      return {
        compositionId: "MotDuJour",
        props: { word, totalDuration: Math.round(durations.MotDuJour * 30) },
        outputFile: `day${activity._dayNum}_mot.mp4`,
      };
    }
    case "PhraseDuJour": {
      const word = wordMap[activity.word_id];
      if (!word) return null;
      word.phraseAudioSrc = generateAudioFile(word.example, `phrase_${word.id}`);
      return {
        compositionId: "PhraseDuJour",
        props: { word, totalDuration: Math.round(durations.PhraseDuJour * 30) },
        outputFile: `day${activity._dayNum}_phrase.mp4`,
      };
    }
    case "Grammaire": {
      const g = grammarMap[activity.grammar_id];
      if (!g) return null;
      const MALE_VOICE = "fr-FR-RemyMultilingualNeural";

      // Try to generate explanation + examples with LLM
      let explanation = g.explanation;
      let examples = g.examples;
      const llmSystem = "You are an expert French teacher. Return ONLY valid JSON with no markdown formatting or extra text.";
      const llmPrompt = `Generate a French grammar explanation for "${g.title}" at ${g.level} level.
Return JSON:
{"explanation": "concise explanation in French (2-3 sentences)", "examples": ["example 1", "example 2", "example 3"]}`;
      const llmRaw = await callLLM(llmPrompt, llmSystem);
      if (llmRaw) {
        try {
          const parsed = JSON.parse(llmRaw);
          if (parsed.explanation) explanation = parsed.explanation;
          if (parsed.examples && Array.isArray(parsed.examples)) examples = parsed.examples;
          log(`  🤖 LLM generated grammar: "${g.title}"`);
        } catch (e) {
          log(`  ⚠️ LLM JSON parse failed, using static data: ${e.message.slice(0, 50)}`);
        }
      }

      // Split explanation into sentences
      const rawSentences = explanation.split(/\.\s+/).filter(s => s.trim().length > 0);
      const sentences = rawSentences.map((s, i) => {
        const trimmed = s.trim();
        return i < rawSentences.length - 1 || explanation.endsWith(".") ? trimmed + "." : trimmed;
      });

      // Build lines: title first, then explanation sentences, then examples
      const lines = [
        { text: g.title, type: "title" },
        ...sentences.map(s => ({ text: s, type: "explanation" })),
        ...examples.map(s => ({ text: s, type: "example" })),
      ];

      // Generate per-line audio with male voice, measure durations, build timeline
      const timeline = [];
      let totalFrames = 0;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const audioPath = generateAudioFile(line.text, `grammar_${g.id}_line_${i}`, MALE_VOICE);
        const audioFull = path.join(PROJECT_ROOT, "public", audioPath);
        let dur = 1.5;
        try {
          const out = execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFull}"`,
            { timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
          );
          dur = parseFloat(out.toString().trim()) || 1.5;
        } catch (e) {
          dur = 1.5;
        }
        const durFrames = Math.max(1, Math.ceil(dur * 30));
        timeline.push({
          lineIndex: i,
          startFrame: totalFrames,
          durationInFrames: durFrames,
          audioSrc: audioPath,
        });
        totalFrames += durFrames;
      }

      g.lines = lines;
      g.timeline = timeline;

      return {
        compositionId: "Grammaire",
        props: { grammar: g, totalDuration: totalFrames },
        outputFile: `day${activity._dayNum}_grammaire.mp4`,
      };
    }
    case "Quiz": {
      const word = wordMap[activity.word_id];
      if (!word) return null;
      const allWords = Object.values(wordMap);
      const distractors = allWords
        .filter(w => w.id !== word.id && w.level === word.level)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3)
        .map(w => w.french);
      while (distractors.length < 3) distractors.push("???");
      const allOptions = [word.french, ...distractors].sort(() => Math.random() - 0.5);
      const correctIndex = allOptions.indexOf(word.french);
      const qText = "Quel est ce mot ?";
      return {
        compositionId: "Quiz",
        props: {
          quiz: {
            question: qText,
            options: allOptions,
            correctIndex,
            audioSrc: generateAudioFile(word.french, `quiz_word_${word.id}`),
          },
          totalDuration: Math.round(durations.Quiz * 30),
        },
        outputFile: `day${activity._dayNum}_quiz.mp4`,
      };
    }
    case "Conjugaison": {
      const verb = verbMap[activity.verb_id];
      if (!verb) return null;
      const tense = verb.present ? "present" : verb.passe_compose ? "passe_compose" : "imparfait";
      const conjugations = verb[tense];
      if (!conjugations) return null;
      const pronounOrder = ["je", "tu", "il/elle", "nous", "vous", "ils/elles"];

      // Generate per-pronoun audio for karaoke timeline AND a single full audio for verb.audioSrc
      const timeline = [];
      let totalFrames = 0;
      const fullParts = [];
      for (const pronoun of pronounOrder) {
        const conj = conjugations[pronoun];
        if (!conj) continue;
        const text = `${verb.infinitive}. ${pronoun} ${conj}`;
        const name = `conj_${verb.id}_${tense}_${pronoun}`;
        const audioPath = generateAudioFile(text, name);
        const audioFull = path.join(PROJECT_ROOT, "public", audioPath);
        let dur = 1.5;
        try {
          const out = execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFull}"`,
            { timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
          );
          dur = parseFloat(out.toString().trim()) || 1.5;
        } catch (e) {
          dur = 1.5;
        }
        const durFrames = Math.max(1, Math.ceil(dur * 30));
        timeline.push({
          pronoun,
          conjugation: conj,
          audioSrc: audioPath,
          startFrame: totalFrames,
          durationInFrames: durFrames,
        });
        totalFrames += durFrames;
        fullParts.push(`${pronoun} ${conj}`);
      }
      if (timeline.length === 0) return null;

      // Set verb.audioSrc for the Conjugaison component (single full audio)
      const fullText = `${verb.infinitive}. ${fullParts.join(", ")}`;
      verb.audioSrc = generateAudioFile(fullText, `conj_${verb.id}_${tense}_full`);

      return {
        compositionId: "Conjugaison",
        props: { verb, tense, timeline, totalDuration: totalFrames },
        outputFile: `day${activity._dayNum}_conjugaison.mp4`,
      };
    }
    case "Idiome": {
      const idiom = idiomMap[activity.idiome_id];
      if (!idiom) return null;
      const word = {
        french: idiom.expression,
        example: idiom.example,
        level: idiom.level,
        audioSrc: generateAudioFile(idiom.expression, `idiome_${idiom.id}`),
        exampleAudioSrc: generateAudioFile(idiom.example, `idiome_ex_${idiom.id}`),
      };
      return {
        compositionId: "MotDuJour",
        props: { word, totalDuration: Math.round(durations.Idiome * 30) },
        outputFile: `gen_idiome_${idiom.id}.mp4`,
      };
    }
    case "Culture": {
      const culture = cultureMap[activity.culture_id];
      if (!culture) return null;
      const grammar = {
        title: culture.title,
        explanation: culture.summary,
        level: culture.level,
        examples: [culture.detail],
        audioSrc: generateAudioFile(`${culture.title}. ${culture.summary}`, `culture_${culture.id}`),
      };
      return {
        compositionId: "Grammaire",
        props: { grammar, totalDuration: Math.round(durations.Culture * 30) },
        outputFile: `gen_culture_${culture.id}.mp4`,
      };
    }
    default:
      return null;
  }
}

// Generate interactive question based on activity type
function generateQuestion(activity, wordMap, grammarMap, verbMap, idiomMap, cultureMap) {
  const questions = {
    MotDuJour: (w) => `Connaissez-vous un autre mot lié à "${w.french}" ?`,
    PhraseDuJour: (w) => `Pouvez-vous créer une phrase similaire avec "${w.french}" ?`,
    Grammaire: (g) => `Pouvez-vous donner un autre exemple pour cette règle : "${g.title}" ?`,
    Quiz: () => `Avez-vous trouvé la bonne réponse ?`,
    Conjugaison: (v) => `Pouvez-vous conjuguer "${v.infinitive}" au futur proche ?`,
    Idiome: (i) => `Pouvez-vous utiliser "${i.expression}" dans une phrase ?`,
    Culture: (c) => `Que savez-vous d'autre sur "${c.title}" ?`,
    Dialogue: () => `Qu'avez-vous compris de ce dialogue ?`,
    Révision: () => `Avez-vous mémorisé ce mot ?`,
  };
  const fn = questions[activity.type] || questions.Révision;
  let data = {};
  if (activity.word_id) data = wordMap[activity.word_id] || {};
  else if (activity.grammar_id) data = grammarMap[activity.grammar_id] || {};
  else if (activity.verb_id) data = verbMap[activity.verb_id] || {};
  else if (activity.idiome_id) data = idiomMap[activity.idiome_id] || {};
  else if (activity.culture_id) data = cultureMap[activity.culture_id] || {};
  return fn(data);
}

// Run one video per hour, cycling through curriculum then generating new combos
async function runHourly(progress, pageId, accessToken) {
  const today = todayStr();
  const curriculum = loadJSON(CURRICULUM_FILE);
  const words = loadJSON(WORDS_FILE);
  const grammar = loadJSON(GRAMMAR_FILE);
  const verbs = loadJSON(VERBS_FILE);
  const idiomes = fs.existsSync(IDIOMES_FILE) ? loadJSON(IDIOMES_FILE) : [];
  const cultures = fs.existsSync(CULTURE_FILE) ? loadJSON(CULTURE_FILE) : [];

  const wordMap = {}, grammarMap = {}, verbMap = {}, idiomMap = {}, cultureMap = {};
  words.forEach(w => wordMap[w.id] = w);
  grammar.forEach(g => grammarMap[g.id] = g);
  verbs.forEach(v => verbMap[v.id] = v);
  idiomes.forEach(i => idiomMap[i.id] = i);
  cultures.forEach(c => cultureMap[c.id] = c);

  // Flatten curriculum
  const allActivities = [];
  for (const day of curriculum.days) {
    for (const a of day.activities) {
      a._dayNum = day.day;
      allActivities.push(a);
    }
  }

  initSRS(progress);
  const durations = { MotDuJour: 12.5, PhraseDuJour: 14.5, Grammaire: 17.5, Quiz: 15.5, Conjugaison: 17.5, Idiome: 15, Culture: 18, Dialogue: 20 };

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let activity;
  let isGenerated = false;

  if (progress.curriculum_idx < allActivities.length) {
    // Phase 1: sequential curriculum (first 1825 hours = ~76 days)
    activity = { ...allActivities[progress.curriculum_idx] };
    log(`📚 [${progress.curriculum_idx + 1}/${allActivities.length}] ${activity.type} - Day ${activity._dayNum}`);
  } else {
    // Phase 2: generator mode - cycle with new combinations
    isGenerated = true;
    const genIdx = progress.generated_count;
    const cycleLen = ACTIVITY_TYPES.length + 2; // 7 types + Dialogue + VocabularyGrid = 9
    const typeIdx = genIdx % cycleLen;
    const cyclePos = Math.floor(genIdx / cycleLen);

    if (typeIdx === ACTIVITY_TYPES.length) {
      // Dialogue slot
      const dialogues = loadJSON(DIALOGUES_FILE);
      if (dialogues.length > 0) {
        const d = dialogues[genIdx % dialogues.length];
        await renderDialogueVideo(d, pageId, accessToken, progress, today, wordMap, grammarMap, verbMap, idiomMap, cultureMap);
        progress.generated_count++;
        progress.last_publish_date = today;
        saveJSON(PROGRESS_FILE, progress);
        return;
      }
    }

    if (typeIdx === ACTIVITY_TYPES.length + 1) {
      // VocabularyGrid slot
      await renderVocabGridVideo(pageId, accessToken, progress, today, wordMap);
      progress.generated_count++;
      progress.last_publish_date = today;
      saveJSON(PROGRESS_FILE, progress);
      return;
    }

    const type = ACTIVITY_TYPES[typeIdx];
    const wordList = words, grammarList = grammar, verbList = verbs, idiomList = idiomes, cultureList = cultures;

    switch (type) {
      case "MotDuJour":
      case "PhraseDuJour":
      case "Quiz": {
        const wordId = wordList[cyclePos % wordList.length].id;
        activity = { type, word_id: wordId, _dayNum: 0 };
        break;
      }
      case "Grammaire": {
        const gId = grammarList[cyclePos % grammarList.length].id;
        activity = { type, grammar_id: gId, _dayNum: 0 };
        break;
      }
      case "Conjugaison": {
        const vId = verbList[cyclePos % verbList.length].id;
        activity = { type, verb_id: vId, _dayNum: 0 };
        break;
      }
      case "Idiome": {
        const iId = idiomList[cyclePos % idiomList.length].id;
        activity = { type, idiome_id: iId, _dayNum: 0 };
        break;
      }
      case "Culture": {
        const cId = cultureList[cyclePos % cultureList.length].id;
        activity = { type, culture_id: cId, _dayNum: 0 };
        break;
      }
    }
    log(`🎯 [Gen ${genIdx + 1}] ${activity.type}`);
  }

  const resolved = await getActivityProps(activity, wordMap, grammarMap, verbMap, durations);
  if (!resolved) {
    log(`❌ Could not resolve activity`);
    if (progress.curriculum_idx < allActivities.length) {
      progress.curriculum_idx++;
    } else {
      progress.generated_count++;
    }
    saveJSON(PROGRESS_FILE, progress);
    return;
  }

  const question = generateQuestion(activity, wordMap, grammarMap, verbMap, idiomMap, cultureMap);
  const result = await renderAndPublish(
    activity, resolved.compositionId, resolved.props, resolved.outputFile,
    pageId, accessToken, progress, today, question
  );

  if (result) {
    progress.published_videos.push(result);
  }

  if (progress.curriculum_idx < allActivities.length) {
    progress.curriculum_idx++;
  } else {
    progress.generated_count++;
  }

  progress.last_publish_date = today;
  saveJSON(PROGRESS_FILE, progress);
  log(`✨ Video ${progress.curriculum_idx + progress.generated_count} published!`);
}

// Render a dialogue video
async function renderDialogueVideo(dialogue, pageId, accessToken, progress, today, wordMap, grammarMap, verbMap, idiomMap, cultureMap) {
  log(`🎬 Rendering Dialogue: "${dialogue.title}" (${dialogue.level})`);

  const AUDIO_DIR = path.join(PROJECT_ROOT, "public", "audio");
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

  dialogue.lines.forEach((line, i) => {
    const filename = `dialogue_${dialogue.id}_${i}.mp3`;
    const filepath = path.join(AUDIO_DIR, filename);
    line.audioSrc = `audio/${filename}`;
    if (!fs.existsSync(filepath)) {
      try {
        execSync(`python3 "${path.join(BOT_DIR, "tts_helper.py")}" "${filepath}"`, {
          input: line.french,
          timeout: 30000, stdio: ["pipe", "pipe", "pipe"],
        });
      } catch (err) {
        log(`  ⚠️ TTS failed: ${err.message}`);
      }
    }
  });
  await sleep(2000);

  const INTRO_F = 45, PER_LINE_F = 80, OUTRO_F = 30;
  const totalDuration = INTRO_F + dialogue.lines.length * PER_LINE_F + OUTRO_F;
  const outputFile = `dialogue_h${String(new Date().getHours()).padStart(2, '0')}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);

  const props = { dialogue, totalDuration };
  const propsJSON = JSON.stringify(props).replace(/"/g, '\\"');
  const cmd = `npx remotion render Dialogue "${outputPath}" --props="${propsJSON}" --overwrite`;

  try {
    execSync(cmd, { cwd: PROJECT_ROOT, stdio: ["pipe", "pipe", "pipe"], timeout: 120000,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048" } });
    if (fs.existsSync(outputPath)) {
      const question = generateQuestion({ type: "Dialogue" }, wordMap, grammarMap, verbMap, idiomMap, cultureMap);
      const desc = buildDescription("Dialogue", dialogue, question);
      const published = await publishToFacebook(outputPath, desc, pageId, accessToken);
      if (published) {
        progress.published_videos.push({ type: "Dialogue", file: outputFile, published: true, date: today });
        log(`  ✅ Dialogue published`);
      }
    }
  } catch (err) {
    log(`  ❌ Dialogue render failed: ${err.message}`);
  }
}

// Render a VocabularyGrid video
async function renderVocabGridVideo(pageId, accessToken, progress, today, wordMap) {
  log(`🎬 Rendering VocabularyGrid`);

  // Pick 6 random words
  const wordList = Object.values(wordMap);
  const shuffled = [...wordList].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, 6);

  const words = [];
  const timeline = [];
  let totalFrames = 0;

  for (let i = 0; i < selected.length; i++) {
    const w = selected[i];
    const audioPath = generateAudioFile(w.french, `vocab_grid_${i}_${Date.now()}`);
    const audioFull = path.join(PROJECT_ROOT, "public", audioPath);
    let dur = 1.5;
    try {
      const out = execSync(
        `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFull}"`,
        { timeout: 5000, stdio: ["pipe", "pipe", "pipe"] },
      );
      dur = parseFloat(out.toString().trim()) || 1.5;
    } catch (e) {
      dur = 1.5;
    }
    const durFrames = Math.max(1, Math.ceil(dur * 30));
    words.push({
      french: w.french,
      english: w.level,
      emoji: getVocabEmoji(w.french),
      audioSrc: audioPath,
    });
    timeline.push({
      wordIndex: i,
      startFrame: totalFrames,
      durationInFrames: durFrames,
      audioSrc: audioPath,
    });
    totalFrames += durFrames;
  }

  await sleep(2000);

  const outputFile = `vocab_grid_h${String(new Date().getHours()).padStart(2, "0")}.mp4`;
  const props = { title: "Vocabulaire Essentiel", words, timeline, totalDuration: totalFrames };
  const ok = renderVideo("VocabularyGrid", props, outputFile);

  if (ok) {
    const videoPath = path.join(OUTPUT_DIR, outputFile);
    if (fs.existsSync(videoPath)) {
      const desc = buildVocabGridDescription();
      const published = await publishToFacebook(videoPath, desc, pageId, accessToken);
      if (published) {
        progress.published_videos.push({ type: "VocabularyGrid", file: outputFile, published: true, date: today });
        log(`  ✅ VocabularyGrid published`);
      }
    }
  }
}

// Main
async function main() {
  const pageId = process.env.FB_PAGE_ID;
  const accessToken = process.env.FB_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    log("❌ Missing FB_PAGE_ID or FB_ACCESS_TOKEN environment variables");
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const progress = loadProgress();
  const total = progress.curriculum_idx + progress.generated_count;
  log(`🤖 French Flow Hourly - ${total} videos published so far`);

  await runHourly(progress, pageId, accessToken);

  log("✨ Done!");
}

main().catch((err) => {
  log(`💥 Fatal error: ${err.message}`);
  process.exit(1);
});
