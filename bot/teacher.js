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
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

const ACTIVITY_TYPES = ["MotDuJour", "Grammaire", "PhraseDuJour", "Quiz", "Conjugaison"];
const INTERACTIVE_QUESTIONS = [
  "Écrivez votre réponse dans les commentaires ! 👇",
  "Quelle est votre réponse ? Commentez ! 💬",
  "Partagez votre phrase dans les commentaires ! ✍️",
  "À vous ! Dites-nous en commentaire. 🗣",
  "Entraînez-vous à voix haute et commentez ! 🎯",
  "Quiz ! Réfléchissez et répondez en commentaire. 🤔",
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
  const map = { MotDuJour: "words", PhraseDuJour: "words", Grammaire: "grammar", Quiz: "words", Conjugaison: "verbs" };
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
  const hashtags = "#FrenchFlow #ApprendreLeFrancais #Francais #LearnFrench #FrenchTeacher";
  let desc = "";
  switch (type) {
    case "MotDuJour":
      desc = `🇫🇷 **Mot du jour** - French Flow\n\n✨ ${data.french}\n💬 ${data.example}`;
      break;
    case "PhraseDuJour":
      desc = `🇫🇷 **Phrase du jour** - French Flow\n\n🗣 ${data.example}\n📖 ${data.example_ar || ""}`;
      break;
    case "Grammaire":
      desc = `🇫🇷 **Leçon de grammaire** - French Flow\n\n📚 ${data.title}\n📖 ${data.title_ar || ""}`;
      break;
    case "Quiz":
      desc = `🇫🇷 **Quiz du jour** - French Flow\n\n❓ ${data.question}`;
      break;
    case "Conjugaison":
      const tenses = data.passe_compose ? "Présent + Passé composé" : data.imparfait ? "Présent + Imparfait" : "Présent";
      desc = `🇫🇷 **Conjugaison** - French Flow\n\n📝 ${data.infinitive} (${data.level})\n📖 ${data.arabic || ""}\n🔄 ${tenses}`;
      break;
    case "Révision":
      desc = `🇫🇷 **Révision** - French Flow\n\n🔄 ${data.french || data.title || data.infinitive}\n📖 ${data.arabic || data.title_ar || ""}`;
      break;
    case "Dialogue": {
      const dLines = data.lines || [];
      const conversation = dLines.map(l => `${l.speaker === "femme" ? "👩" : "👨"} ${l.name}: ${l.french}`).join("\n");
      desc = `🇫🇷 **Dialogue** - French Flow\n\n💬 ${data.title} (${data.level})\n📖 ${data.title_ar || ""}\n\n${conversation}`;
      break;
    }
    default:
      desc = `🇫🇷 **French Flow**`;
  }
  if (question) desc += `\n\n❓ **${question}**\n${INTERACTIVE_QUESTIONS[Math.floor(Math.random() * INTERACTIVE_QUESTIONS.length)]}`;
  return desc + `\n\n${hashtags}`;
}

// Generate TTS audio for a text, returns audio path
function generateAudioFile(text, name) {
  const AUDIO_DIR = path.join(PROJECT_ROOT, "public", "audio");
  if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });
  const filename = `${name}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);
  if (!fs.existsSync(filepath)) {
    try {
      execSync(`python3 "${path.join(BOT_DIR, "tts_helper.py")}" "${filepath}"`, {
        input: text,
        timeout: 15000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      log(`  🔊 Generated: ${name}.mp3`);
    } catch (err) {
      log(`  ⚠️ TTS failed for "${text.slice(0, 30)}": ${err.message}`);
    }
  }
  return `audio/${filename}`;
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

function getActivityProps(activity, wordMap, grammarMap, verbMap, durations) {
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
      g.audioSrc = generateAudioFile(`${g.title}. ${g.explanation}`, `grammar_${g.id}`);
      return {
        compositionId: "Grammaire",
        props: { grammar: g, totalDuration: Math.round(durations.Grammaire * 30) },
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
      verb.audioSrc = generateAudioFile(verb.infinitive, `verb_${verb.id}`);
      return {
        compositionId: "Conjugaison",
        props: { verb, totalDuration: Math.round(durations.Conjugaison * 30) },
        outputFile: `day${activity._dayNum}_conjugaison.mp4`,
      };
    }
    default:
      return null;
  }
}

// Generate interactive question based on activity type
function generateQuestion(activity, wordMap, grammarMap, verbMap) {
  const questions = {
    MotDuJour: (w) => `Connaissez-vous un autre mot lié à "${w.french}" ?`,
    PhraseDuJour: (w) => `Pouvez-vous créer une phrase similaire avec "${w.french}" ?`,
    Grammaire: (g) => `Pouvez-vous donner un autre exemple pour cette règle : "${g.title}" ?`,
    Quiz: () => `Avez-vous trouvé la bonne réponse ?`,
    Conjugaison: (v) => `Pouvez-vous conjuguer "${v.infinitive}" au futur proche ?`,
    Dialogue: () => `Qu'avez-vous compris de ce dialogue ?`,
    Révision: () => `Avez-vous mémorisé ce mot ?`,
  };
  const fn = questions[activity.type] || questions.Révision;
  let data = {};
  if (activity.word_id) data = wordMap[activity.word_id] || {};
  else if (activity.grammar_id) data = grammarMap[activity.grammar_id] || {};
  else if (activity.verb_id) data = verbMap[activity.verb_id] || {};
  return fn(data);
}

// Run one video per hour, cycling through curriculum then generating new combos
async function runHourly(progress, pageId, accessToken) {
  const today = todayStr();
  const curriculum = loadJSON(CURRICULUM_FILE);
  const words = loadJSON(WORDS_FILE);
  const grammar = loadJSON(GRAMMAR_FILE);
  const verbs = loadJSON(VERBS_FILE);

  const wordMap = {}, grammarMap = {}, verbMap = {};
  words.forEach(w => wordMap[w.id] = w);
  grammar.forEach(g => grammarMap[g.id] = g);
  verbs.forEach(v => verbMap[v.id] = v);

  // Flatten curriculum
  const allActivities = [];
  for (const day of curriculum.days) {
    for (const a of day.activities) {
      a._dayNum = day.day;
      allActivities.push(a);
    }
  }

  initSRS(progress);
  const durations = { MotDuJour: 12.5, PhraseDuJour: 14.5, Grammaire: 17.5, Quiz: 15.5, Conjugaison: 17.5, Dialogue: 20 };

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
    const typeIdx = genIdx % 6;
    const cyclePos = Math.floor(genIdx / 6);

    if (typeIdx === 5) {
      // Every 6th video: Dialogue
      const dialogues = loadJSON(DIALOGUES_FILE);
      if (dialogues.length > 0) {
        const d = dialogues[genIdx % dialogues.length];
        await renderDialogueVideo(d, pageId, accessToken, progress, today, wordMap, grammarMap, verbMap);
        progress.generated_count++;
        progress.last_publish_date = today;
        saveJSON(PROGRESS_FILE, progress);
        return;
      }
    }

    const type = ACTIVITY_TYPES[typeIdx];
    const wordList = words, grammarList = grammar, verbList = verbs;

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
    }
    log(`🎯 [Gen ${genIdx + 1}] ${activity.type}`);
  }

  const resolved = getActivityProps(activity, wordMap, grammarMap, verbMap, durations);
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

  const question = generateQuestion(activity, wordMap, grammarMap, verbMap);
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
async function renderDialogueVideo(dialogue, pageId, accessToken, progress, today, wordMap, grammarMap, verbMap) {
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
          timeout: 15000, stdio: ["pipe", "pipe", "pipe"],
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
      const question = generateQuestion({ type: "Dialogue" }, wordMap, grammarMap, verbMap);
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
