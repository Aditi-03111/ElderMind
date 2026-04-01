from __future__ import annotations

from pathlib import Path
from uuid import uuid4

from gtts import gTTS


def synthesize_mp3(text: str, *, lang: str, out_dir: str) -> str:
    Path(out_dir).mkdir(parents=True, exist_ok=True)
    fname = f"tts_{uuid4().hex}.mp3"
    path = Path(out_dir) / fname
    tts = gTTS(text=text, lang=lang, slow=False)
    tts.save(str(path))
    return fname

