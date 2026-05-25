#!/usr/bin/env python3
"""
Storyteller Bot v2 — 3 content formats with rotation.
Generates and publishes videos to Facebook.

Formats:
  A — Grammar Quiz  (from grammar.json)
  B — Storytelling   (Gutenberg book parts)
  C — Vocabulary WOTD (from words.json)

Rotation: A→B→C→A→B→C across 6 daily slots
"""
import os, sys, json, re, asyncio, subprocess, tempfile, random, textwrap, math, shutil
from pathlib import Path

BOT_DIR = Path(__file__).parent
PROJECT_ROOT = BOT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "output"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio"
TEMP_DIR = PROJECT_ROOT / "temp"
PROGRESS_FILE = BOT_DIR / "story_progress.json"
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

PEXELS_API_URL = "https://api.pexels.com/videos/search"
TEMP_VIDEOS = []

VOICES = ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"]

# 6 daily slots: which format each slot produces
SLOT_FORMATS = ["grammar_quiz", "storytelling", "vocabulary_wotd",
                "grammar_quiz", "storytelling", "vocabulary_wotd"]

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)


def load_json(path):
    return json.load(open(path, encoding="utf-8"))


def load_progress():
    if os.path.exists(PROGRESS_FILE):
        return json.load(open(PROGRESS_FILE))
    return {
        "slot": 0,
        "current_book": None,
        "current_part": 0,
        "finished_books": [],
        "last_date": None,
        "used_words": [],
        "used_grammar": [],
    }


def save_progress(p):
    json.dump(p, open(PROGRESS_FILE, "w"), indent=2, ensure_ascii=False)


async def generate_tts(text, outpath, voice_idx=0):
    voice = VOICES[voice_idx % len(VOICES)]
    proc = await asyncio.create_subprocess_exec(
        "edge-tts", "--voice", voice, "--text", text,
        "--write-media", str(outpath),
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    return os.path.exists(outpath) and os.path.getsize(outpath) > 0


def get_audio_duration(path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(path)],
        capture_output=True, text=True,
    )
    try:
        return float(r.stdout.strip())
    except:
        return 0


def wrap_text(text, width=40):
    paragraphs = text.split('\n')
    wrapped = []
    for p in paragraphs:
        p = p.strip()
        if not p:
            wrapped.append('')
        elif re.match(r'^[A-Z\sÀ-ÖØ-Ý]{5,}$', p) and len(p) < 60:
            wrapped.append(p)
        else:
            wrapped.extend(textwrap.wrap(p, width=width))
    return wrapped


def compress_video(input_path, output_path):
    """Compress video to under 50MB using targeted bitrate."""
    size_mb = os.path.getsize(input_path) / (1024 * 1024)
    if size_mb <= 50:
        print(f"  ✅ Already {size_mb:.0f} MB, no compression needed")
        if input_path != output_path:
            os.replace(input_path, output_path)
        return True

    base_name = Path(output_path).stem
    tmp_dir = Path(output_path).parent

    # Try progressively lower bitrates until under 50MB
    for bitrate in [500, 300, 200, 100]:
        out = tmp_dir / f"{base_name}_b{bitrate}.mp4"
        cmd = [
            "ffmpeg", "-y",
            "-i", str(input_path),
            "-c:v", "libx264", "-crf", "28", "-preset", "medium",
            "-b:v", f"{bitrate}k",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            str(out),
        ]
        print(f"  🗜️ Trying {bitrate}k bitrate...")
        subprocess.run(cmd, capture_output=True, text=True)
        if out.exists():
            ns = os.path.getsize(out) / (1024 * 1024)
            print(f"     → {ns:.0f} MB")
            if ns <= 50:
                os.replace(out, output_path)
                print(f"  ✅ Compressed {size_mb:.0f} MB → {ns:.0f} MB")
                return True
            out.unlink(missing_ok=True)

    # Fallback: keep best attempt
    best = tmp_dir / f"{base_name}_b200.mp4"
    if best.exists():
        os.replace(best, output_path)
    print(f"  ⚠️ Best effort: {os.path.getsize(output_path) / (1024*1024):.0f} MB")
    return True


def get_pexels_video(query, api_key):
    """Fetch a background video from Pexels based on keyword, download to TEMP_DIR."""
    import requests
    headers = {"Authorization": api_key}
    params = {"query": query, "per_page": 1, "orientation": "portrait", "size": "medium"}
    try:
        resp = requests.get(PEXELS_API_URL, headers=headers, params=params, timeout=15)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("videos"):
            print(f"  ⚠️ No Pexels video for '{query}'")
            return None
        video = data["videos"][0]
        video_url = None
        for f in video.get("video_files", []):
            if f.get("quality") in ("hd", "sd") and f.get("width", 9999) <= 1920:
                video_url = f["link"]
                break
        if not video_url:
            video_url = video["video_files"][0]["link"]
        os.makedirs(TEMP_DIR, exist_ok=True)
        dst = TEMP_DIR / f"pexels_{video['id']}.mp4"
        r = requests.get(video_url, stream=True, timeout=30)
        with open(dst, "wb") as f:
            for chunk in r.iter_content(8192):
                f.write(chunk)
        sz = os.path.getsize(dst) / 1024 / 1024
        print(f"  🎬 Pexels '{query}': {sz:.0f} MB")
        TEMP_VIDEOS.append(dst)
        return str(dst)
    except Exception as e:
        print(f"  ⚠️ Pexels error: {e}")
        return None


def get_video_keyword(fmt, data):
    """Derive a keyword for Pexels search from the content."""
    if fmt == "grammar_quiz":
        return f"{data.get('title', 'grammaire')} français"
    elif fmt == "storytelling":
        return f"{data.get('title', 'histoire')} livre"
    elif fmt == "vocabulary_wotd":
        return f"{data.get('french', 'mot')} vocabulaire français"
    return "français"


def create_scrolling_video(text_lines, audio_path, output_path, audio_duration, title=None, background_video=None):
    w, h = 1080, 1920
    font_size = 38
    line_height = font_size + 12
    margin_bottom = int(h * 0.15)
    visible_height = h - margin_bottom
    lines_visible = visible_height // line_height

    if title:
        header = f"[CENTER]{title}[/CENTER]\n" + "\n" + "\n".join(text_lines)
        text_lines = header.split('\n')

    text_content = '\n'.join(text_lines)
    tf = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    tf.write(text_content)
    tf.close()

    total_text_height = len(text_lines) * line_height
    scroll_distance = total_text_height + visible_height
    scroll_speed = scroll_distance / audio_duration if audio_duration > 0 else 10

    if background_video:
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1", "-i", background_video,
            "-i", str(audio_path),
            "-filter_complex",
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=decrease,crop={w}:{h},"
            f"drawtext=textfile={tf.name}:fontfile={FONT}:fontsize={font_size}:"
            f"fontcolor=white:bordercolor=black@0.5:borderw=1:"
            f"x=(w-text_w)/2:y=h-{margin_bottom}+{visible_height}-t*{scroll_speed:.2f}:"
            f"line_spacing={line_height - font_size}[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "28",
            "-c:a", "aac", "-b:a", "128k",
            "-pix_fmt", "yuv420p", "-shortest",
            str(output_path),
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c=#0d0d1a:s={w}x{h}:r=30:d={audio_duration}",
            "-i", str(audio_path),
            "-filter_complex",
            f"[0:v]drawtext=textfile={tf.name}:fontfile={FONT}:fontsize={font_size}:"
            f"fontcolor=white:bordercolor=black@0.3:borderw=1:"
            f"x=(w-text_w)/2:y=h-{margin_bottom}+{visible_height}-t*{scroll_speed:.2f}:"
            f"line_spacing={line_height - font_size}[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "28",
            "-c:a", "aac", "-b:a", "128k",
            "-pix_fmt", "yuv420p", "-shortest",
            str(output_path),
        ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    os.unlink(tf.name)
    if r.returncode != 0:
        print(f"  ❌ FFmpeg: {r.stderr[-300:]}")
        return False
    return os.path.exists(output_path) and os.path.getsize(output_path) > 1000


def create_static_video(text_lines, audio_path, output_path, audio_duration, title=None, background_video=None):
    w, h = 1080, 1920
    font_size = 48
    line_height = font_size + 16
    total_lines = len(text_lines)
    if title:
        total_lines += 2
    total_height = total_lines * line_height
    y_pos = max((h - total_height) // 2, 50)

    text_content = '\n'.join(text_lines)
    if title:
        text_content = f"{title}\n\n{text_content}"
    tf = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    tf.write(text_content)
    tf.close()

    if background_video:
        cmd = [
            "ffmpeg", "-y",
            "-stream_loop", "-1", "-i", background_video,
            "-i", str(audio_path),
            "-filter_complex",
            f"[0:v]scale={w}:{h}:force_original_aspect_ratio=decrease,crop={w}:{h},"
            f"drawtext=textfile={tf.name}:fontfile={FONT}:fontsize={font_size}:"
            f"fontcolor=white:bordercolor=black@0.5:borderw=2:"
            f"x=(w-text_w)/2:y={y_pos}:line_spacing={line_height - font_size}[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "28",
            "-c:a", "aac", "-b:a", "128k",
            "-pix_fmt", "yuv420p", "-shortest",
            str(output_path),
        ]
    else:
        cmd = [
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", f"color=c=#1a1a2e:s={w}x{h}:r=30:d={audio_duration}",
            "-i", str(audio_path),
            "-filter_complex",
            f"[0:v]drawtext=textfile={tf.name}:fontfile={FONT}:fontsize={font_size}:"
            f"fontcolor=white:bordercolor=black@0.3:borderw=2:"
            f"x=(w-text_w)/2:y={y_pos}:line_spacing={line_height - font_size}[v]",
            "-map", "[v]", "-map", "1:a",
            "-c:v", "libx264", "-preset", "medium", "-crf", "28",
            "-c:a", "aac", "-b:a", "128k",
            "-pix_fmt", "yuv420p", "-shortest",
            str(output_path),
        ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    os.unlink(tf.name)
    if r.returncode != 0:
        print(f"  ❌ FFmpeg: {r.stderr[-300:]}")
        return False
    return os.path.exists(output_path) and os.path.getsize(output_path) > 1000


async def publish_to_fb(video_path, desc, page_id, access_token):
    if not page_id or not access_token:
        print("  ⚠️ No FB credentials"); return False

    compressed = video_path.with_suffix(".compressed.mp4")
    compress_video(video_path, compressed)
    if compressed.exists() and compressed != video_path:
        os.replace(compressed, video_path)

    file_size = os.path.getsize(video_path)
    api_base = f"https://graph.facebook.com/v22.0/{page_id}"
    print(f"  📤 Uploading ({file_size / 1024 / 1024:.0f} MB)...")

    import aiohttp
    async with aiohttp.ClientSession() as session:
        with open(video_path, 'rb') as f:
            data = aiohttp.FormData()
            data.add_field('source', f, filename='video.mp4', content_type='video/mp4')
            data.add_field('description', desc)
            data.add_field('access_token', access_token)
            async with session.post(f'{api_base}/videos', data=data) as resp:
                try:
                    r = await resp.json()
                    if r.get('id'):
                        print(f"  ✅ Published ID: {r['id']}"); return True
                    print(f"  ❌ FB: {r}"); return False
                except:
                    body = await resp.text()
                    print(f"  ❌ FB {resp.status}: {body[:200]}"); return False


# ── Format A: Grammar Quiz ──────────────────────────────────────────────
async def generate_grammar_quiz(progress):
    grammar = load_json(BOT_DIR / "grammar.json")
    used = set(progress.get("used_grammar", []))
    avail = [g for g in grammar if str(g["id"]) not in used]
    if not avail:
        avail = grammar
        progress["used_grammar"] = []
    g = random.choice(avail)
    used.add(str(g["id"]))
    progress["used_grammar"] = list(used)
    save_progress(progress)

    title = f"📝 Grammaire: {g['title']}"
    lines = wrap_text(g.get("explanation", ""), width=45)
    q_text = g.get("question", f"Quelle est la règle de {g['title']} ?")

    tts_text = f"{g['title']}. {g.get('explanation', '')}"
    audio_path = AUDIO_DIR / f"grammar_quiz_{g['id']}.mp3"
    print(f"  🔊 TTS grammar quiz...")
    ok = await generate_tts(tts_text, audio_path, voice_idx=g["id"])
    if not ok:
        print("  ❌ TTS failed"); return None
    dur = get_audio_duration(audio_path)
    if dur < 3:
        print("  ⚠️ Too short"); return None
    print(f"  ⏱️  {dur:.0f}s")

    pexels_key = os.environ.get("PEXELS_API_KEY")
    bg_video = None
    if pexels_key:
        kw = get_video_keyword("grammar_quiz", g)
        bg_video = get_pexels_video(kw, pexels_key)

    output = OUTPUT_DIR / f"grammar_quiz_{g['id']}.mp4"
    ok = create_static_video(lines, audio_path, output, dur, title=title, background_video=bg_video)
    if not ok:
        return None

    size = os.path.getsize(output) / 1024 / 1024
    print(f"  ✅ Grammar Quiz: {size:.1f} MB")
    desc = (
        f"🇫🇷 Quiz de grammaire — French Flow\n\n"
        f"{g['title']}\n{q_text}\n\n"
        f"#FrenchFlow #Grammaire #LearnFrench"
    )
    return output, desc


# ── Format B: Storytelling ──────────────────────────────────────────────
async def generate_storytelling(progress):
    MAX_WORDS_PER_PART = 4500
    GUTENBERG_SEARCH = "https://www.gutenberg.org/ebooks/search/?query={query}&submit_search=Go"
    GUTENBERG_BOOK_URL = "https://www.gutenberg.org/ebooks/{id}"
    GUTENBERG_TEXT = "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt"

    needs_new = (
        progress["current_book"] is None or
        progress["current_part"] >= progress["current_book"]["total_parts"]
    )

    if needs_new:
        import aiohttp
        from bs4 import BeautifulSoup
        finished = [b["id"] for b in progress.get("finished_books", [])]
        async with aiohttp.ClientSession(headers={"User-Agent": "Mozilla/5.0"}) as session:
            for attempt in range(30):
                queries = ["fr", "french", "français", "conte", "nouvelle", "roman", "littérature"]
                query = random.choice(queries)
                async with session.get(GUTENBERG_SEARCH.format(query=query)) as resp:
                    html = await resp.text()
                soup = BeautifulSoup(html, "lxml")
                ids = set()
                for link in soup.select("li.booklink a[href*='/ebooks/']"):
                    m = re.search(r'/ebooks/(\d+)', link.get("href", ""))
                    if m:
                        ids.add(int(m.group(1)))
                avail = [bid for bid in ids if bid not in finished]
                if not avail:
                    continue
                bid = random.choice(avail)
                async with session.get(GUTENBERG_BOOK_URL.format(id=bid)) as dr:
                    dh = await dr.text()
                ds = BeautifulSoup(dh, "lxml")
                te = ds.select_one("h1")
                title = te.get_text(strip=True) if te else f"Book {bid}"
                async with session.get(GUTENBERG_TEXT.format(id=bid)) as tr:
                    if tr.status != 200:
                        continue
                    raw = await tr.text(errors="replace")
                text = re.sub(r'(?i).*?\*\*\* START OF.*?\*\*\*', '', raw, count=1, flags=re.DOTALL)
                text = re.sub(r'(?i)\*\*\* END OF.*', '', text, flags=re.DOTALL)
                text = re.sub(r'^(Produced by|Language:|Release Date:).*', '', text, flags=re.I | re.M)
                text = text.strip()
                if not text or len(text) < 500:
                    continue
                words = text.split()
                total_parts = max(1, math.ceil(len(words) / MAX_WORDS_PER_PART))
                book = {"id": bid, "title": title, "text": text, "total_parts": total_parts}
                break
            else:
                print("  ❌ No books found"); return None
        progress["current_book"] = {"id": book["id"], "title": book["title"], "total_parts": book["total_parts"]}
        progress["current_part"] = 0
        progress["book_text"] = book["text"]
    else:
        book = {**progress["current_book"], "text": progress.get("book_text", "")}
        if not book.get("text"):
            print("  ❌ Book text missing"); return None

    part_num = progress["current_part"] + 1
    words = book["text"].split()
    start = (part_num - 1) * MAX_WORDS_PER_PART
    end = min(start + MAX_WORDS_PER_PART, len(words))
    part_text = ' '.join(words[start:end])
    lines = wrap_text(part_text)
    print(f"  📖 '{book['title']}' — Part {part_num}/{book['total_parts']} ({len(part_text.split())} words)")

    audio_path = AUDIO_DIR / f"story_{book['id']}_p{part_num}.mp3"
    print(f"  🔊 TTS story...")
    chunks = []
    current = ""
    for line in lines:
        if len(current) + len(line) > 2000:
            if current.strip():
                chunks.append(current)
            current = line + "\n"
        else:
            current += line + "\n"
    if current.strip():
        chunks.append(current)

    audio_files = []
    for i, chunk in enumerate(chunks):
        ap = AUDIO_DIR / f"story_{book['id']}_p{part_num}_ch{i}.mp3"
        ok = await generate_tts(chunk.strip(), ap, voice_idx=i)
        if ok:
            audio_files.append(ap)

    if not audio_files:
        print("  ❌ No audio"); return None

    if len(audio_files) == 1:
        import shutil
        shutil.copy2(audio_files[0], audio_path)
    else:
        lf = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False)
        for af in audio_files:
            lf.write(f"file '{af}'\n")
        lf.close()
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lf.name,
                       "-c", "copy", str(audio_path)], capture_output=True)
        os.unlink(lf.name)

    dur = get_audio_duration(audio_path)
    print(f"  ⏱️  {dur:.0f}s ({dur/60:.1f} min)")
    if dur < 60:
        print("  ⚠️ Too short"); return None

    pexels_key = os.environ.get("PEXELS_API_KEY")
    bg_video = None
    if pexels_key:
        kw = get_video_keyword("storytelling", book)
        bg_video = get_pexels_video(kw, pexels_key)

    output = OUTPUT_DIR / f"story_{book['id']}_p{part_num}.mp4"
    ok = create_scrolling_video(lines, audio_path, output, dur, title=f"📖 {book['title']}", background_video=bg_video)
    if not ok:
        return None

    compressed = output.with_suffix(".compressed.mp4")
    compress_video(output, compressed)
    if compressed.exists() and compressed != output:
        os.replace(compressed, output)
    size = os.path.getsize(output) / 1024 / 1024
    print(f"  ✅ Story: {size:.1f} MB")
    desc = (
        f"🇫🇷 Histoire du jour — French Flow\n\n"
        f"{book['title']} — Partie {part_num}/{book['total_parts']}\n\n"
        f"#FrenchFlow #Histoire #LearnFrench"
    )

    progress["current_part"] += 1
    if progress["current_part"] >= book["total_parts"]:
        progress.setdefault("finished_books", []).append(progress["current_book"])
        progress["current_book"] = None
        progress.pop("book_text", None)

    for f in AUDIO_DIR.glob(f"story_{book['id']}_p{part_num}_ch*.mp3"):
        f.unlink(missing_ok=True)

    return output, desc


# ── Format C: Vocabulary WOTD ───────────────────────────────────────────
async def generate_vocabulary_wotd(progress):
    words = load_json(BOT_DIR / "words.json")
    used = set(progress.get("used_words", []))
    avail = [w for w in words if str(w["id"]) not in used]
    if not avail:
        avail = words
        progress["used_words"] = []
    w = random.choice(avail)
    used.add(str(w["id"]))
    progress["used_words"] = list(used)
    save_progress(progress)

    title = f"🌟 Mot du jour: {w['french']}"
    lines = [
        f"{w['french']} ({w.get('article', '')} {w.get('english', '')})",
        f"{w.get('level', 'A1')}",
        "",
        w.get('example', ''),
    ]

    tts_text = f"{w['french']}. {w.get('example', '')}"
    audio_path = AUDIO_DIR / f"wotd_{w['id']}.mp3"
    print(f"  🔊 TTS WOTD...")
    ok = await generate_tts(tts_text, audio_path, voice_idx=w["id"])
    if not ok:
        print("  ❌ TTS failed"); return None
    dur = get_audio_duration(audio_path)
    if dur < 2:
        print("  ⚠️ Too short"); return None
    print(f"  ⏱️  {dur:.0f}s")

    pexels_key = os.environ.get("PEXELS_API_KEY")
    bg_video = None
    if pexels_key:
        kw = get_video_keyword("vocabulary_wotd", w)
        bg_video = get_pexels_video(kw, pexels_key)

    output = OUTPUT_DIR / f"wotd_{w['id']}.mp4"
    ok = create_static_video(lines, audio_path, output, dur, title=title, background_video=bg_video)
    if not ok:
        return None

    size = os.path.getsize(output) / 1024 / 1024
    print(f"  ✅ WOTD: {size:.1f} MB")
    desc = (
        f"🇫🇷 Mot du jour — French Flow\n\n"
        f"🌟 {w['french']}\n"
        f"📖 {w.get('english', '')}\n"
        f"💬 {w.get('example', '')}\n\n"
        f"#FrenchFlow #MotDuJour #LearnFrench #Vocabulaire"
    )
    return output, desc


# ── Main ─────────────────────────────────────────────────────────────────
async def main():
    page_id = os.environ.get("FB_PAGE_ID")
    access_token = os.environ.get("FB_ACCESS_TOKEN")

    progress = load_progress()
    slot = progress.get("slot", 0)
    fmt = SLOT_FORMATS[slot % len(SLOT_FORMATS)]

    print(f"🤖 Storyteller v2 — Slot {slot}: {fmt}")

    result = None
    if fmt == "grammar_quiz":
        result = await generate_grammar_quiz(progress)
    elif fmt == "storytelling":
        result = await generate_storytelling(progress)
    elif fmt == "vocabulary_wotd":
        result = await generate_vocabulary_wotd(progress)

    if result:
        video_path, desc = result
        pub_ok = await publish_to_fb(video_path, desc, page_id, access_token)
        if pub_ok:
            progress["slot"] = (slot + 1) % len(SLOT_FORMATS)
            progress["last_date"] = str(__import__("datetime").date.today())
            save_progress(progress)
            print(f"  ✅ Published! Next slot: {progress['slot']}")
    else:
        print(f"  ❌ Generation failed for {fmt}")

    for f in TEMP_VIDEOS:
        if os.path.exists(f):
            os.unlink(f)

    print("✨ Done!")


if __name__ == "__main__":
    asyncio.run(main())
