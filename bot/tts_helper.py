import sys, asyncio
import edge_tts

async def main():
    text = sys.stdin.buffer.read().decode("utf-8").strip()
    outpath = sys.argv[1]
    if len(sys.argv) > 2:
        voice = sys.argv[2]
    else:
        voices = ["fr-FR-VivienneMultilingualNeural", "fr-FR-RemyMultilingualNeural"]
        voice = voices[hash(text) % len(voices)]
    tts = edge_tts.Communicate(text, voice)
    await tts.save(outpath)

asyncio.run(main())
