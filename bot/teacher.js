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
const OUTPUT_DIR = path.join(PROJECT_ROOT, "output");

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

function loadJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function saveJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

function loadProgress() {
  if (!fs.existsSync(PROGRESS_FILE)) {
    return { phase: 1, phase1_index: 0, current_day: 0, published_videos: [], last_publish_date: null };
  }
  return loadJSON(PROGRESS_FILE);
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
  const hashtags = "#FrenchFlow #LearnFrench #Francais #الفرنسية #تعلم_الفرنسية";
  switch (type) {
    case "MotDuJour":
      return `🇫🇷 Mot du jour: ${data.french}\n📖 ${data.arabic}\n💬 ${data.example}\n\n${hashtags}`;
    case "PhraseDuJour":
      return `🇫🇷 Phrase du jour: ${data.example}\n📖 ${data.example_ar}\n\n${hashtags}`;
    case "Grammaire":
      return `🇫🇷 Leçon de grammaire: ${data.title}\n📖 ${data.title_ar}\n\n${hashtags}`;
    case "Quiz":
      return `🇫🇷 Quiz du jour!\n❓ ${data.question}\n\n${hashtags}`;
    case "Conjugaison":
      return `🇫🇷 Conjugaison: ${data.infinitive}\n📖 ${data.arabic}\n\n${hashtags}`;
    default:
      return `${hashtags}`;
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
    const FormData = (await import("form-data")).default;
    const form = new FormData();
    form.append("source", fs.createReadStream(videoPath));
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

// Phase 2: render + publish daily curriculum
async function runPhase2(progress, pageId, accessToken) {
  log("📚 Phase 2: Daily curriculum publishing");

  const today = new Date().toISOString().split("T")[0];
  if (progress.last_publish_date === today) {
    log("✅ Already published today's lesson");
    return;
  }

  const curriculum = loadJSON(CURRICULUM_FILE);
  const words = loadJSON(WORDS_FILE);
  const grammar = loadJSON(GRAMMAR_FILE);
  const verbs = loadJSON(VERBS_FILE);

  if (progress.current_day >= curriculum.days.length) {
    log("🎉 All ${curriculum.days.length} days completed!");
    return;
  }

  const dayData = curriculum.days[progress.current_day];
  log(`📖 Day ${dayData.day}/${curriculum.days.length} - ${dayData.theme} (${dayData.level})`);

  const wordMap = {};
  const grammarMap = {};
  const verbMap = {};
  words.forEach((w) => (wordMap[w.id] = w));
  grammar.forEach((g) => (grammarMap[g.id] = g));
  verbs.forEach((v) => (verbMap[v.id] = v));

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const renderResults = [];

  for (const activity of dayData.activities) {
    let compositionId, props, outputFile;
    const durations = {
      MotDuJour: 12.5,
      PhraseDuJour: 14.5,
      Grammaire: 17.5,
      Quiz: 15.5,
      Conjugaison: 17.5,
    };

    switch (activity.type) {
      case "MotDuJour": {
        const word = wordMap[activity.word_id];
        if (!word) { log(`  ⚠️ Word ${activity.word_id} not found`); continue; }
        compositionId = "MotDuJour";
        props = { word, totalDuration: Math.round(durations.MotDuJour * 30) };
        outputFile = `day${dayData.day}_mot.mp4`;
        break;
      }
      case "PhraseDuJour": {
        const word = wordMap[activity.word_id];
        if (!word) continue;
        compositionId = "PhraseDuJour";
        props = { word, totalDuration: Math.round(durations.PhraseDuJour * 30) };
        outputFile = `day${dayData.day}_phrase.mp4`;
        break;
      }
      case "Grammaire": {
        const g = grammarMap[activity.grammar_id];
        if (!g) continue;
        compositionId = "Grammaire";
        props = { grammar: g, totalDuration: Math.round(durations.Grammaire * 30) };
        outputFile = `day${dayData.day}_grammaire.mp4`;
        break;
      }
      case "Quiz": {
        const word = wordMap[activity.word_id];
        if (!word) continue;
        compositionId = "Quiz";
        props = {
          quiz: {
            question: `ما هي ترجمة "${word.french}"؟`,
            options: activity.options,
            correctIndex: activity.correct,
          },
          totalDuration: Math.round(durations.Quiz * 30),
        };
        outputFile = `day${dayData.day}_quiz.mp4`;
        break;
      }
      case "Conjugaison": {
        const verb = verbMap[activity.verb_id];
        if (!verb) continue;
        compositionId = "Conjugaison";
        props = { verb, totalDuration: Math.round(durations.Conjugaison * 30) };
        outputFile = `day${dayData.day}_conjugaison.mp4`;
        break;
      }
    }

    if (!compositionId) continue;

    const ok = renderVideo(compositionId, props, outputFile);
    const videoPath = path.join(OUTPUT_DIR, outputFile);

    if (ok && fs.existsSync(videoPath)) {
      const desc = buildDescription(activity.type, props[Object.keys(props)[0]] || {});
      const published = await publishToFacebook(videoPath, desc, pageId, accessToken);
      renderResults.push({
        type: activity.type,
        file: outputFile,
        published,
        date: today,
      });
      await sleep(5000);
    }
  }

  progress.current_day += 1;
  progress.published_videos.push(...renderResults);
  progress.last_publish_date = today;
  saveJSON(PROGRESS_FILE, progress);
  log(`✅ Day ${dayData.day} done! ${renderResults.filter((r) => r.published).length}/5 published`);
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

  log("✨ Done!");
}

main().catch((err) => {
  log(`💥 Fatal error: ${err.message}`);
  process.exit(1);
});
