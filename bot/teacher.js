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
    return { phase: 1, phase1_index: 0, current_day: 0, day_video_index: 0, published_videos: [], last_publish_date: null };
  }
  const p = loadJSON(PROGRESS_FILE);
  if (p.day_video_index === undefined) p.day_video_index = 0;
  return p;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Phase 1: 22 pre-rendered videos, 5 per day
const PHASE1_VIDEOS = Array.from({ length: 22 }, (_, i) => ({
  type: ["MotDuJour", "PhraseDuJour", "Grammaire", "Quiz", "Conjugaison"][i % 5],
  file: `phase1_video_${i + 1}.mp4`,
  description: `French Flow - Leçon ${i + 1}`,
}));

function buildDescription(type, data) {
  const hashtags = "#FrenchFlow #ApprendreLeFrancais #Francais #LearnFrench #FrenchTeacher";
  switch (type) {
    case "MotDuJour":
      return (
        `🇫🇷 **Mot du jour** - French Flow\n\n` +
        `✨ ${data.french}\n` +
        `💬 ${data.example}\n` +
        `\n💡 **Astuce** : Répétez ce mot 10 fois aujourd'hui dans différents contextes.\n\n${hashtags}`
      );
    case "PhraseDuJour":
      return (
        `🇫🇷 **Phrase du jour** - French Flow\n\n` +
        `🗣 ${data.example}\n` +
        `\n💡 **Astuce** : Essayez d'utiliser cette phrase dans une vraie conversation aujourd'hui !\n\n${hashtags}`
      );
    case "Grammaire":
      return (
        `🇫🇷 **Leçon de grammaire** - French Flow\n\n` +
        `📚 ${data.title}\n\n` +
        `💡 **Astuce** : Écrivez 3 phrases personnelles avec cette règle dans votre cahier.\n\n${hashtags}`
      );
    case "Quiz":
      return (
        `🇫🇷 **Quiz du jour** - French Flow\n\n` +
        `❓ ${data.question}\n` +
        `\n💡 **Astuce** : Mettez pause et répondez avant la fin de la vidéo !\n\n${hashtags}`
      );
    case "Conjugaison": {
      const cTenses = data.passe_compose ? "Présent + Passé composé" : data.imparfait ? "Présent + Imparfait" : "Présent";
      return (
        `🇫🇷 **Conjugaison** - French Flow\n\n` +
        `📝 ${data.infinitive} (${data.level})\n` +
        `🔄 ${cTenses}\n` +
        `\n💡 **Astuce** : Conjuguez ce verbe à voix haute avec tous les pronoms 3 fois.\n\n${hashtags}`
      );
    }
    case "Révision":
      return (
        `🇫🇷 **Révision** - French Flow\n\n` +
        `🔄 ${data.french || data.title || data.infinitive}\n` +
        `\n💡 **Astuce** : La répétition espacée est la clé de la mémorisation à long terme !\n\n${hashtags}`
      );
    case "Dialogue": {
      const dLines = data.lines || [];
      const conversation = dLines.map(l => `${l.speaker === "femme" ? "👩" : "👨"} ${l.name}: ${l.french}`).join("\n");
      return (
        `🇫🇷 **Dialogue** - French Flow\n\n` +
        `💬 ${data.title} (${data.level})\n\n` +
        `${conversation}\n\n` +
        `💡 **Astuce** : Regardez 2 fois — 1x pour comprendre, 1x pour répéter à voix haute.\n\n${hashtags}`
      );
    }
    case "PhraseDuJour":
      return (
        `🇫🇷 **Phrase du jour** - French Flow\n\n` +
        `🗣 ${data.example}\n` +
        `📖 ${data.example_ar}\n` +
        `\n💡 **Astuce** : Essayez d'utiliser cette phrase dans une vraie conversation aujourd'hui !` +
        `\n💡 **نصيحة** : حاول تستعمل هاذ الجملة فمحادثة حقيقية اليوم!\n\n${hashtags}`
      );
    case "Grammaire":
      return (
        `🇫🇷 **Leçon de grammaire** - French Flow\n\n` +
        `📚 ${data.title}\n` +
        `📖 ${data.title_ar}\n\n` +
        `💡 **Astuce** : Écrivez 3 phrases personnelles avec cette règle dans votre cahier.` +
        `\n💡 **نصيحة** : اكتب 3 جمل شخصية بهاد القاعدة فدفترك.\n\n${hashtags}`
      );
    case "Quiz":
      return (
        `🇫🇷 **Quiz du jour** - French Flow\n\n` +
        `❓ ${data.question}\n` +
        `\n💡 **Astuce** : Mettez pause et répondez avant la fin de la vidéo !` +
        `\n💡 **نصيحة** : وقف الفيديو وجاوب قبل ما تشوف الجواب!\n\n${hashtags}`
      );
    case "Conjugaison":
      const tenses = data.passe_compose ? "Présent + Passé composé" : data.imparfait ? "Présent + Imparfait" : "Présent";
      return (
        `🇫🇷 **Conjugaison** - French Flow\n\n` +
        `📝 ${data.infinitive} (${data.level})\n` +
        `📖 ${data.arabic}\n` +
        `🔄 Temps: ${tenses}\n` +
        `\n💡 **Astuce** : Conjuguez ce verbe à voix haute avec tous les pronoms 3 fois.` +
        `\n💡 **نصيحة** : صرف هاذ الفعل بصوت عال مع جميع الضمائر 3 مرات.\n\n${hashtags}`
      );
    case "Révision":
      return (
        `🇫🇷 **Révision** - French Flow\n\n` +
        `🔄 ${data.french || data.title || data.infinitive}\n` +
        `📖 ${data.arabic || data.title_ar || ""}\n` +
        `\n💡 **Astuce** : La répétition espacée est la clé de la mémorisation à long terme !` +
        `\n💡 **نصيحة** : التكرار المتباعد هو مفتاح الحفظ على المدى الطويل!\n\n${hashtags}`
      );
    case "Dialogue":
      const lines = data.lines || [];
      const conversation = lines.map(l => `${l.speaker === "femme" ? "👩" : "👨"} ${l.name}: ${l.french}`).join("\n");
      return (
        `🇫🇷 **Dialogue** - French Flow\n\n` +
        `💬 ${data.title}\n` +
        `📖 ${data.title_ar} (${data.level})\n\n` +
        `${conversation}\n\n` +
        `💡 **Astuce** : Regardez 2 fois — 1x pour comprendre, 1x pour répéter à voix haute.` +
        `\n💡 **نصيحة** : شاهد الحوار مرتين — مرة للفهم ومرة للتكرار بصوت عال.\n\n${hashtags}`
      );
    default:
      return `${hashtags}`;
  }
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
async function renderAndPublish(activity, compositionId, props, outputFile, dayNum, pageId, accessToken, progress, today) {
  const ok = renderVideo(compositionId, props, outputFile);
  const videoPath = path.join(OUTPUT_DIR, outputFile);

  if (ok && fs.existsSync(videoPath)) {
    const desc = buildDescription(activity.type, props[Object.keys(props)[0]] || {});
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
      const qText = `Quelle est la traduction de "${word.french}" ?`;
      return {
        compositionId: "Quiz",
        props: {
          quiz: {
            question: qText,
            options: activity.options,
            correctIndex: activity.correct,
            audioSrc: generateAudioFile(qText, `quiz_${word.id}`),
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

// Phase 2: render + publish daily curriculum (French Flow Method)
async function runPhase2(progress, pageId, accessToken) {
  const today = todayStr();
  const hour = new Date().getHours();
  const batch = process.env.BATCH || (hour < 12 ? "morning" : "evening");
  const isMorning = batch === "morning";
  const phaseLabel = isMorning ? "🔍 Discovery" : "🧠 Reinforcement";
  // Discovery: MotDuJour + Grammaire | Reinforcement: PhraseDuJour + Quiz + Conjugaison
  const startIdx = isMorning ? 0 : 2;
  const count = isMorning ? 2 : 3;

  log(`🎯 ${phaseLabel} - French Flow Method`);

  const curriculum = loadJSON(CURRICULUM_FILE);
  const words = loadJSON(WORDS_FILE);
  const grammar = loadJSON(GRAMMAR_FILE);
  const verbs = loadJSON(VERBS_FILE);

  if (progress.current_day >= curriculum.days.length) {
    log(`🏆 Félicitations! All ${curriculum.days.length} days completed!`);
    return;
  }

  const dayData = curriculum.days[progress.current_day];
  const isReviewDay = dayData.day % 7 === 0;

  // Guard: skip if this batch was already done
  if (progress.day_video_index >= startIdx + count) {
    log(`✅ ${phaseLabel} already done for day ${dayData.day}`);
    return;
  }
  if (progress.day_video_index < startIdx) {
    log(`⏳ ${phaseLabel} not ready yet (waiting for previous batch)`);
    return;
  }

  log(`📚 Day ${dayData.day}/${curriculum.days.length} - ${dayData.theme} (${dayData.level})`);

  // Build lookup maps
  const wordMap = {}, grammarMap = {}, verbMap = {};
  words.forEach((w) => (wordMap[w.id] = w));
  grammar.forEach((g) => (grammarMap[g.id] = g));
  verbs.forEach((v) => (verbMap[v.id] = v));

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  initSRS(progress);
  const durations = { MotDuJour: 12.5, PhraseDuJour: 14.5, Grammaire: 17.5, Quiz: 15.5, Conjugaison: 17.5 };
  const renderResults = [];

  if (isReviewDay) {
    // 🔄 Review day: pull due items from Spaced Repetition
    const dueItems = getDueItems(progress, words, grammar, verbs, 5);
    if (dueItems.length > 0) {
      log(`🔄 Révision: ${dueItems.length} items due for review`);
      const batchItems = dueItems.slice(startIdx, startIdx + count);
      for (const di of batchItems) {
        const baseType = di.category === "words" ? "MotDuJour" : di.category === "grammar" ? "Grammaire" : "Conjugaison";
        const act = { type: baseType, _dayNum: dayData.day };
        if (di.category === "words") act.word_id = di.item.id;
        else if (di.category === "grammar") act.grammar_id = di.item.id;
        else act.verb_id = di.item.id;
        const resolved = getActivityProps(act, wordMap, grammarMap, verbMap, durations);
        if (!resolved) continue;
        const result = await renderAndPublish(act, resolved.compositionId, resolved.props, resolved.outputFile, dayData.day, pageId, accessToken, progress, today);
        if (result) renderResults.push(result);
      }
    } else {
      log(`✅ No items due for review, proceeding with new lesson`);
    }
  }

  // If no review items rendered (or not a review day), do normal curriculum
  if (renderResults.length === 0) {
    const batchActivities = dayData.activities.slice(startIdx, startIdx + count);
    for (const activity of batchActivities) {
      const resolved = getActivityProps(activity, wordMap, grammarMap, verbMap, durations);
      if (!resolved) continue;
      const result = await renderAndPublish(activity, resolved.compositionId, resolved.props, resolved.outputFile, dayData.day, pageId, accessToken, progress, today);
      if (result) renderResults.push(result);
    }
  }

  progress.day_video_index += count;
  progress.published_videos.push(...renderResults);
  progress.last_publish_date = today;

  if (!isMorning) {
    progress.current_day += 1;
    progress.day_video_index = 0;
  }

  saveJSON(PROGRESS_FILE, progress);
  log(`✅ ${phaseLabel} - Day ${dayData.day} complete! ${renderResults.filter((r) => r.published).length}/${count} videos published`);
}

// Generate TTS audio for a phrase if missing
function generateAudio(phrase, index) {
  const AUDIO_DIR = path.join(PROJECT_ROOT, "public", "audio");
  if (!fs.existsSync(AUDIO_DIR)) {
    fs.mkdirSync(AUDIO_DIR, { recursive: true });
  }

  const filename = `phrase_${index}.mp3`;
  const filepath = path.join(AUDIO_DIR, filename);

  // Generate if missing or if phrase has no audioSrc
  if (!phrase.audioSrc || !fs.existsSync(filepath)) {
    phrase.audioSrc = `audio/${filename}`;
    try {
      execSync(`python3 "${path.join(BOT_DIR, "tts_helper.py")}" "${filepath}"`, {
        input: phrase.french,
        timeout: 15000,
        stdio: ["pipe", "pipe", "pipe"],
      });
      log(`    🔊 Generated audio: ${filename}`);
    } catch (err) {
      log(`    ⚠️ TTS failed for "${phrase.french}": ${err.message}`);
    }
  }
}

// Render user phrases as FrenchShorts video (bonus content)
async function renderUserPhrases(pageId, accessToken, progress) {
  if (!fs.existsSync(USER_PHRASES_FILE)) {
    log("ℹ️ No user_phrases.json found, skipping bonus video");
    return;
  }

  const data = loadJSON(USER_PHRASES_FILE);
  if (!data.phrases || data.phrases.length === 0) {
    log("ℹ️ user_phrases.json is empty, skipping bonus video");
    return;
  }

  log(`🎬 Rendering FrenchShorts (${data.phrases.length} phrases): ${data.title}`);

  // Generate audio for each phrase if missing
  data.phrases.forEach((p, i) => generateAudio(p, i + 1));
  saveJSON(USER_PHRASES_FILE, data);

  // Wait for audio files to be ready
  await sleep(2000);

  const today = todayStr();
  const props = { title: data.title, phrases: data.phrases, durationPerItem: 3 };
  const propsJSON = JSON.stringify(props).replace(/"/g, '\\"');
  const outputFile = `french_shorts_${today}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);

  const cmd = `npx remotion render FrenchShorts "${outputPath}" --props="${propsJSON}" --overwrite`;

  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 300000,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048" },
    });

    if (fs.existsSync(outputPath)) {
      log(`  ✅ FrenchShorts rendered (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB)`);
      const desc = `🇫🇷 ${data.title}\n\n${data.phrases.map(p => `• ${p.french}`).join("\n")}\n\n#FrenchFlow #LearnFrench #Francais #FrenchTeacher`;
      const published = await publishToFacebook(outputPath, desc, pageId, accessToken);
      if (published) {
        progress.published_videos.push({
          type: "FrenchShorts",
          file: outputFile,
          published: true,
          date: today,
        });
        saveJSON(PROGRESS_FILE, progress);
        log(`  ✅ FrenchShorts published to Facebook`);
      }
    }
  } catch (err) {
    log(`  ❌ FrenchShorts render failed: ${err.message}`);
  }
}

// Render daily dialogue as bonus video
async function renderDialogue(pageId, accessToken, progress) {
  if (!fs.existsSync(DIALOGUES_FILE)) {
    log("ℹ️ No dialogues.json found, skipping dialogue video");
    return;
  }

  const dialogues = loadJSON(DIALOGUES_FILE);
  if (dialogues.length === 0) {
    log("ℹ️ dialogues.json is empty, skipping dialogue video");
    return;
  }

  const today = todayStr();
  const dayNum = progress.current_day || 1;
  const dialogue = dialogues[(dayNum - 1) % dialogues.length];

  // Generate TTS audio for each dialogue line
  log(`  🔊 Generating TTS for ${dialogue.lines.length} lines...`);
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
          timeout: 15000,
          stdio: ["pipe", "pipe", "pipe"],
        });
        log(`    ✅ ${filename}`);
      } catch (err) {
        log(`    ⚠️ TTS failed: ${err.message}`);
      }
    }
  });
  await sleep(2000);

  const INTRO_F = 45;
  const PER_LINE_F = 80;
  const OUTRO_F = 30;
  const totalDuration = INTRO_F + dialogue.lines.length * PER_LINE_F + OUTRO_F;

  log(`🎬 Rendering Dialogue: "${dialogue.title}" (${dialogue.level})`);

  const outputFile = `dialogue_day${dayNum}.mp4`;
  const outputPath = path.join(OUTPUT_DIR, outputFile);

  const props = { dialogue, totalDuration };
  const propsJSON = JSON.stringify(props).replace(/"/g, '\\"');
  const cmd = `npx remotion render Dialogue "${outputPath}" --props="${propsJSON}" --overwrite`;

  try {
    execSync(cmd, {
      cwd: PROJECT_ROOT,
      stdio: ["pipe", "pipe", "pipe"],
      timeout: 120000,
      env: { ...process.env, NODE_OPTIONS: "--max-old-space-size=2048" },
    });

    if (fs.existsSync(outputPath)) {
      log(`  ✅ Dialogue rendered (${(fs.statSync(outputPath).size / 1024 / 1024).toFixed(1)} MB)`);
      const desc = buildDescription("Dialogue", dialogue);
      const published = await publishToFacebook(outputPath, desc, pageId, accessToken);
      if (published) {
        progress.published_videos.push({
          type: "Dialogue",
          file: outputFile,
          published: true,
          date: today,
        });
        saveJSON(PROGRESS_FILE, progress);
        log(`  ✅ Dialogue published to Facebook`);
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
  log(`🤖 French Flow Bot - Phase ${progress.phase}, Day ${progress.current_day || progress.phase1_index}`);

  if (progress.phase === 1) {
    await runPhase1(progress, pageId, accessToken);
  } else {
    await runPhase2(progress, pageId, accessToken);
  }

  // Bonus: render and publish user phrases as FrenchShorts
  await renderUserPhrases(pageId, accessToken, progress);

  // Bonus: render daily dialogue (communication practice)
  await renderDialogue(pageId, accessToken, progress);

  log("✨ Done!");
}

main().catch((err) => {
  log(`💥 Fatal error: ${err.message}`);
  process.exit(1);
});
