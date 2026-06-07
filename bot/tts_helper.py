import sys, asyncio, re
import edge_tts


def escape_xml(text):
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def build_ssml(text, voice, rate="+0%", pitch="+0Hz", style="default"):
    parts = re.split(r"(?<=[.!?])\s+", text.strip())
    safe = escape_xml(text)
    prosody_open = f'<prosody rate="{rate}" pitch="{pitch}">'
    prosody_close = "</prosody>"

    if style == "explanation":
        inner = ""
        for i, p in enumerate(parts):
            if p:
                inner += escape_xml(p)
                if i < len(parts) - 1:
                    inner += '<break time="400ms"/>'
        content = f"{prosody_open}{inner}{prosody_close}"

    elif style == "example":
        inner = ""
        for i, p in enumerate(parts):
            if p:
                inner += escape_xml(p)
                if i < len(parts) - 1:
                    inner += '<break time="200ms"/>'
        content = f'{prosody_open}{inner}{prosody_close}'

    elif style == "title":
        content = f'<prosody rate="{rate}" pitch="+8Hz">{safe}</prosody>'

    elif style == "question":
        content = f'<prosody rate="+5%" pitch="+5Hz">{safe}</prosody>'

    else:
        inner = ""
        for i, p in enumerate(parts):
            if p:
                inner += escape_xml(p)
                if i < len(parts) - 1:
                    inner += '<break time="300ms"/>'
        content = f"{prosody_open}{inner}{prosody_close}"

    return f"<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='fr-FR'><voice name='{voice}'>{content}</voice></speak>"


async def main():
    raw = sys.stdin.buffer.read().decode("utf-8").strip()
    outpath = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else None
    rate = sys.argv[3] if len(sys.argv) > 3 else "+0%"
    pitch = sys.argv[4] if len(sys.argv) > 4 else "+0Hz"
    style = sys.argv[5] if len(sys.argv) > 5 else "default"
    if not voice:
        voices = ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"]
        voice = voices[hash(raw) % len(voices)]
    ssml = build_ssml(raw, voice, rate, pitch, style)
    tts = edge_tts.Communicate(ssml)
    await tts.save(outpath)


if __name__ == "__main__":
    asyncio.run(main())
