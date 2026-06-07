import sys, asyncio
import edge_tts


VOICES = ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"]


async def main():
    raw = sys.stdin.buffer.read().decode("utf-8").strip()
    outpath = sys.argv[1]
    voice = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else ""
    rate = sys.argv[3] if len(sys.argv) > 3 else "+0%"
    pitch = sys.argv[4] if len(sys.argv) > 4 else "+0Hz"
    if not voice:
        voice = VOICES[hash(raw) % len(VOICES)]
    tts = edge_tts.Communicate(raw, voice, rate=rate, pitch=pitch)
    await tts.save(outpath)


if __name__ == "__main__":
    asyncio.run(main())
