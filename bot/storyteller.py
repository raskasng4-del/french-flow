#!/usr/bin/env python3
"""
Storyteller Bot: Generates 30-minute French story videos.
- Fetches French books from Project Gutenberg
- Splits long books into ~30min parts (4500 words each)
- Generates TTS narration (edge-tts) for one part per run
- Creates scrolling-text video (FFmpeg)
- Publishes to Facebook
"""
import os, sys, json, re, asyncio, subprocess, tempfile, random, textwrap, math
from pathlib import Path
from bs4 import BeautifulSoup

BOT_DIR = Path(__file__).parent
PROJECT_ROOT = BOT_DIR.parent
OUTPUT_DIR = PROJECT_ROOT / "output"
AUDIO_DIR = PROJECT_ROOT / "public" / "audio"
PROGRESS_FILE = BOT_DIR / "story_progress.json"
FONT_PATH = str(BOT_DIR / ".." / ".." / "home" / "abdo" / "my-video" / "Cairo-Bold.ttf")
if not os.path.exists(FONT_PATH):
    FONT_PATH = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

VOICES = ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"]
MAX_WORDS_PER_PART = 4500  # ~30 min of audio

GUTENBERG_SEARCH = "https://www.gutenberg.org/ebooks/search/?query={query}&submit_search=Go"
GUTENBERG_BOOK_URL = "https://www.gutenberg.org/ebooks/{id}"
GUTENBERG_TEXT = "https://www.gutenberg.org/cache/epub/{id}/pg{id}.txt"

os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(AUDIO_DIR, exist_ok=True)

# ─── Progress ─────────────────────────────────────────────────────────────
def load_progress():
    if os.path.exists(PROGRESS_FILE):
        return json.load(open(PROGRESS_FILE))
    return {"current_book": None, "current_part": 0, "finished_books": [], "last_date": None}

def save_progress(p):
    json.dump(p, open(PROGRESS_FILE, "w"), indent=2, ensure_ascii=False)

# ─── Gutenberg Scraper ────────────────────────────────────────────────────
async def get_full_book_text(book_id):
    import aiohttp
    async with aiohttp.ClientSession(headers={"User-Agent": "Mozilla/5.0"}) as session:
        async with session.get(GUTENBERG_TEXT.format(id=book_id)) as resp:
            if resp.status != 200:
                return None, None
            raw = await resp.text(errors="replace")
        async with session.get(GUTENBERG_BOOK_URL.format(id=book_id)) as det_resp:
            det_html = await det_resp.text()
    det_soup = BeautifulSoup(det_html, "lxml")
    title_el = det_soup.select_one("h1")
    title = title_el.get_text(strip=True) if title_el else f"Book {book_id}"
    text = extract_story_text(raw)
    return title, text

async def fetch_new_book(finished_ids):
    import aiohttp
    async with aiohttp.ClientSession(headers={"User-Agent": "Mozilla/5.0"}) as session:
        for attempt in range(30):
            print(f"  🔍 Searching Gutenberg (attempt {attempt+1})...")
            queries = ["fr", "french", "français", "conte", "nouvelle", "roman", "littérature"]
            query = random.choice(queries)
            async with session.get(GUTENBERG_SEARCH.format(query=query)) as resp:
                html = await resp.text()
            soup = BeautifulSoup(html, "lxml")
            book_ids = set()
            for link in soup.select("li.booklink a[href*='/ebooks/']"):
                m = re.search(r'/ebooks/(\d+)', link.get("href", ""))
                if m: book_ids.add(int(m.group(1)))
            if not book_ids:
                continue
            available = [bid for bid in book_ids if bid not in finished_ids]
            if not available:
                continue
            book_id = random.choice(available)
            print(f"  📖 Downloading book #{book_id}...")
            title, text = await get_full_book_text(book_id)
            if text and len(text) > 500:
                words = text.split()
                total_parts = max(1, math.ceil(len(words) / MAX_WORDS_PER_PART))
                print(f"  ✅ '{title}' - {len(words)} words, {total_parts} part(s)")
                return {"id": book_id, "title": title, "text": text, "total_parts": total_parts}
            print(f"  ⚠️  Text too short or unavailable")
            finished_ids.append(book_id)
    return None

def extract_story_text(raw_text):
    text = re.sub(r'(?i).*?\*\*\* START OF (THIS PROJECT GUTENBERG|THE PROJECT GUTENBERG).*?\*\*\*', '', raw_text, count=1, flags=re.DOTALL)
    text = re.sub(r'(?i)\*\*\* END OF (THIS PROJECT GUTENBERG|THE PROJECT GUTENBERG).*', '', text, flags=re.DOTALL)
    lines = []
    for line in text.split('\n'):
        s = line.strip()
        if not s:
            if lines and lines[-1] != '':
                lines.append('')
        elif re.match(r'^(Produced by|Transcribed by|Language:|Release Date:|\[Illustration)', s, re.I):
            continue
        else:
            lines.append(s)
    return '\n'.join(lines).strip()

# ─── Get current part ─────────────────────────────────────────────────────
def get_current_part_text(progress, book):
    words = book["text"].split()
    total = len(words)
    part = progress["current_part"]
    start = part * MAX_WORDS_PER_PART
    end = min(start + MAX_WORDS_PER_PART, total)
    part_words = words[start:end]
    return ' '.join(part_words), part + 1, total

# ─── TTS Generation ───────────────────────────────────────────────────────
async def generate_tts(text, outpath, voice_idx=0):
    voice = VOICES[voice_idx % len(VOICES)]
    proc = await asyncio.create_subprocess_exec(
        "edge-tts", "--voice", voice, "--text", text,
        "--write-media", str(outpath),
        stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
    )
    await proc.wait()
    return os.path.exists(outpath) and os.path.getsize(outpath) > 0

def get_audio_duration(audio_path):
    r = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(audio_path)],
        capture_output=True, text=True
    )
    try: return float(r.stdout.strip())
    except: return 0

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

# ─── Video Generation (FFmpeg) ───────────────────────────────────────────
def create_scrolling_video(text_lines, audio_path, output_path, audio_duration):
    width, height = 1080, 1920
    font_size = 38
    line_height = font_size + 12
    margin_bottom = int(height * 0.15)
    visible_height = height - margin_bottom
    lines_visible = visible_height // line_height

    text_content = '\n'.join(text_lines)
    text_file = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
    text_file.write(text_content)
    text_file.close()

    total_text_height = len(text_lines) * line_height
    scroll_distance = total_text_height + visible_height
    scroll_speed = scroll_distance / audio_duration if audio_duration > 0 else 10

    # Title overlay at top
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c=#0d0d1a:s={width}x{height}:r=30:d={audio_duration}",
        "-i", str(audio_path),
        "-filter_complex",
        f"[0:v]drawtext=textfile={text_file.name}:fontfile={FONT_PATH}:fontsize={font_size}:"
        f"fontcolor=white:bordercolor=black@0.3:borderw=1:"
        f"x=(w-text_w)/2:y=h-{margin_bottom}+{visible_height}-t*{scroll_speed:.2f}:"
        f"line_spacing={line_height-font_size}[v]",
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-preset", "medium", "-crf", "28",
        "-c:a", "aac", "-b:a", "128k",
        "-pix_fmt", "yuv420p", "-shortest",
        str(output_path)
    ]
    print(f"  🎬 Rendering video ({audio_duration:.0f}s, {len(text_lines)} lines)...")
    result = subprocess.run(cmd, capture_output=True, text=True)
    os.unlink(text_file.name)
    if result.returncode != 0:
        print(f"  ❌ FFmpeg error: {result.stderr[-300:]}")
        return False
    return os.path.exists(output_path) and os.path.getsize(output_path) > 1000

# ─── Generate Video for Current Part ──────────────────────────────────────
async def generate_part_video(book, part_num, total_parts, part_text, output_path):
    print(f"\n📖 '{book['title']}' — Partie {part_num}/{total_parts}")

    text_lines = wrap_text(part_text)
    print(f"  📝 {len(text_lines)} lines, {len(part_text.split())} words")

    # Split text into chunks for TTS
    chunks = []
    current = ""
    for line in text_lines:
        if len(current) + len(line) > 2000:
            if current.strip(): chunks.append(current)
            current = line + "\n"
        else:
            current += line + "\n"
    if current.strip(): chunks.append(current)

    print(f"  🔊 Generating {len(chunks)} audio chunks...")
    audio_files = []
    for i, chunk in enumerate(chunks):
        ap = AUDIO_DIR / f"book{book['id']}_p{part_num}_{i}.mp3"
        ok = await generate_tts(chunk.strip(), ap, voice_idx=i)
        if ok:
            audio_files.append(ap)
            print(f"    [{i+1}/{len(chunks)}] ✅")
        else:
            print(f"    [{i+1}/{len(chunks)}] ❌")

    if not audio_files:
        print("  ❌ No audio generated"); return False

    concat_path = AUDIO_DIR / f"book{book['id']}_p{part_num}_full.mp3"
    if len(audio_files) == 1:
        import shutil
        shutil.copy2(audio_files[0], concat_path)
    else:
        lf = tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False, encoding='utf-8')
        for af in audio_files: lf.write(f"file '{af}'\n")
        lf.close()
        subprocess.run(["ffmpeg", "-y", "-f", "concat", "-safe", "0", "-i", lf.name,
                       "-c", "copy", str(concat_path)], capture_output=True)
        os.unlink(lf.name)

    if not os.path.exists(concat_path): return False

    dur = get_audio_duration(concat_path)
    print(f"  ⏱️  Audio: {dur:.0f}s ({dur/60:.1f} min)")
    if dur < 60:
        print("  ⚠️  Audio too short"); return False

    ok = create_scrolling_video(text_lines, concat_path, output_path, dur)
    if ok:
        size = os.path.getsize(output_path) / (1024*1024)
        print(f"  ✅ Video: {size:.1f} MB")
    return ok

# ─── Publish to Facebook ──────────────────────────────────────────────────
async def publish_to_facebook(video_path, title, part_num, total_parts, page_id, access_token):
    if not page_id or not access_token:
        print("  ⚠️ No Facebook credentials, skipping publish"); return False
    import aiohttp
    desc = (
        f"🇫🇷 Histoire du jour - French Flow 📖\n\n"
        f"{title}\n"
        f"Partie {part_num}/{total_parts}\n\n"
        f"Apprenez le français en écoutant des histoires. "
        f"Abonnez-vous pour la suite chaque jour ! 🔔\n\n"
        f"#FrenchFlow #HistoireDuJour #ApprendreLeFrançais #StoryTime"
    )
    async with aiohttp.ClientSession() as session:
        with open(video_path, 'rb') as f:
            data = aiohttp.FormData()
            data.add_field('source', f, filename='story.mp4', content_type='video/mp4')
            data.add_field('description', desc)
            data.add_field('access_token', access_token)
            async with session.post(f'https://graph.facebook.com/v22.0/{page_id}/videos', data=data) as resp:
                result = await resp.json()
                if result.get('id'):
                    print(f"  ✅ Published! ID: {result['id']}")
                    return True
                print(f"  ❌ Facebook error: {result}"); return False

# ─── Entry Point ──────────────────────────────────────────────────────────
async def main():
    page_id = os.environ.get("FB_PAGE_ID")
    access_token = os.environ.get("FB_ACCESS_TOKEN")

    progress = load_progress()
    print(f"🤖 French Flow Storyteller")

    needs_new_book = (
        progress["current_book"] is None or
        progress["current_part"] >= progress["current_book"]["total_parts"]
    )

    if needs_new_book:
        finished = [b["id"] for b in progress.get("finished_books", [])]
        book = await fetch_new_book(finished)
        if not book:
            print("❌ No more books available"); return
        progress["current_book"] = {"id": book["id"], "title": book["title"], "total_parts": book["total_parts"]}
        progress["current_part"] = 0
        progress["book_text"] = book["text"]
    else:
        # Resume current book - reload text or fetch if needed
        bid = progress["current_book"]["id"]
        if "book_text" not in progress:
            print(f"  📖 Re-downloading book #{bid}...")
            _, text = await get_full_book_text(bid)
            if not text: print("❌ Failed to reload book"); return
            progress["book_text"] = text
        book = {**progress["current_book"], "text": progress["book_text"]}

    part_text, part_num, _ = get_current_part_text(progress, book)
    print(f"   Book: '{progress['current_book']['title']}'")
    print(f"   Part: {part_num}/{progress['current_book']['total_parts']}")

    output_path = OUTPUT_DIR / f"story_{book['id']}_p{part_num}.mp4"
    ok = await generate_part_video(book, part_num, book["total_parts"], part_text, output_path)

    if ok:
        pub_ok = await publish_to_facebook(
            output_path, book["title"], part_num, book["total_parts"],
            page_id, access_token
        )
        if pub_ok:
            progress["current_part"] += 1
            progress["last_date"] = str(__import__("datetime").date.today())
            # If book is finished, move it to finished
            if progress["current_part"] >= book["total_parts"]:
                progress.setdefault("finished_books", []).append(progress["current_book"])
                progress["current_book"] = None
                progress.pop("book_text", None)
            save_progress(progress)

    # Cleanup temp audio files
    for f in AUDIO_DIR.glob(f"book{book['id']}_p{part_num}_*.mp3"):
        f.unlink(missing_ok=True)
    print("✨ Done!")

if __name__ == "__main__":
    asyncio.run(main())
