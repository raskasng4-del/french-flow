import sys
from gtts import gTTS

text = sys.stdin.buffer.read().decode("utf-8").strip()
outpath = sys.argv[1]
gTTS(text, lang="fr", slow=False).save(outpath)
