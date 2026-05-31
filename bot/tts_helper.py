import sys, asyncio
import edge_tts

async def main():
    text = sys.stdin.buffer.read().decode("utf-8").strip()
    outpath = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 else None
    rate = sys.argv[3] if len(sys.argv) > 3 else "+0%"
    pitch = sys.argv[4] if len(sys.argv) > 4 else "+0Hz"
    if not voice:
        voices = ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"]
        voice = voices[hash(text) % len(voices)]
    tts = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
    await tts.save(outpath)

asyncio.run(main())
