from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class STTResult:
    text: str
    language: str | None = None


async def transcribe_audio_bytes(audio_bytes: bytes, *, filename: str | None = None) -> STTResult:
    """
    Optional Whisper STT. Heavy deps are NOT in default requirements.
    If Whisper is not installed, raise RuntimeError so caller can fallback.
    """
    try:
        import whisper  # type: ignore
    except Exception as e:  # pragma: no cover
        raise RuntimeError("Whisper STT not installed") from e

    # Whisper expects a file path; write to a temp file.
    import tempfile
    from pathlib import Path

    suffix = Path(filename or "audio.webm").suffix or ".webm"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as f:
        f.write(audio_bytes)
        tmp = f.name

    # Load a small model by default.
    model = whisper.load_model("base")
    result = model.transcribe(tmp)
    text = (result.get("text") or "").strip()
    lang = result.get("language")
    return STTResult(text=text, language=lang)

