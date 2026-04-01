from __future__ import annotations

from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from .config import settings
from .emotion import infer_emotion_from_audio_bytes
from .gemini_client import gemini_generate_text
from .groq_client import groq_chat_completion
from .markers import parse_markers
from .prompt_loader import load_system_prompt
from .stt import transcribe_audio_bytes
from .tavily_client import tavily_search
from .tts import synthesize_mp3
from .weather_client import fetch_openweather_summary
from .vedastro_client import fetch_tithi_festival


app = FastAPI(title="ElderMind AI Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_origins == "*" else settings.cors_allow_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Path(settings.media_dir).mkdir(parents=True, exist_ok=True)
app.mount("/media", StaticFiles(directory=settings.media_dir), name="media")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "ai"}


def _lang_for_user(user_id: str) -> str:
    # demo default
    return "en"

def _fallback_reply(user_text: str) -> str:
    t = (user_text or "").lower()
    if any(k in t for k in ["alone", "akela", "lonely", "miss", "sad"]):
        return "Akela lag raha hai na? Main yahin hoon — thodi baat karein. [MOOD_LOG: low]"
    if any(k in t for k in ["head", "chakra", "headache"]):
        return "Arre, sar dard hai na? Thoda aaram karo aur paani pi lo. [HEALTH_LOG: headache]"
    if any(k in t for k in ["fall", "chest", "emergency", "sos"]):
        return "Theek hai, main aapke saath hoon. Main caregiver ko bata deta hoon. [ALERT: urgent]"
    return "Haan, main sun raha hoon. Aap araam se boliye."


@app.post("/voice")
async def voice(request: Request):
    """
    AI pipeline endpoint.
    Currently uses TEXT path; audio is accepted but STT is not enabled yet (optional heavy deps).
    """
    user_id = "demo"
    text: str | None = None
    audio: UploadFile | None = None
    lat: float | None = None
    lon: float | None = None

    ctype = (request.headers.get("content-type") or "").lower()
    if "application/json" in ctype:
        body = await request.json()
        user_id = str(body.get("user_id") or user_id)
        text = body.get("text")
        if body.get("lat") is not None and body.get("lon") is not None:
            try:
                lat = float(body.get("lat"))
                lon = float(body.get("lon"))
            except Exception:
                lat = None
                lon = None
    else:
        form = await request.form()
        user_id = str(form.get("user_id") or user_id)
        text = form.get("text")
        audio = form.get("audio") if isinstance(form.get("audio"), UploadFile) else None
        if form.get("lat") is not None and form.get("lon") is not None:
            try:
                lat = float(str(form.get("lat")))
                lon = float(str(form.get("lon")))
            except Exception:
                lat = None
                lon = None

    user_text = (text or "").strip()
    audio_bytes: bytes | None = None
    emotion_label = "neutral"
    if audio is not None:
        try:
            audio_bytes = await audio.read()
        except Exception:
            audio_bytes = None

    if not user_text and audio_bytes:
        try:
            stt = await transcribe_audio_bytes(audio_bytes, filename=audio.filename)
            user_text = (stt.text or "").strip()
        except Exception:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Audio provided but STT not enabled. Install Whisper or send text."},
            )

    if audio_bytes:
        try:
            emo = await infer_emotion_from_audio_bytes(audio_bytes)
            emotion_label = emo.label or "neutral"
        except Exception:
            emotion_label = "neutral"
    if not user_text:
        return JSONResponse(status_code=400, content={"status": "error", "message": "Missing text"})

    base_prompt = load_system_prompt()
    if not base_prompt:
        base_prompt = "You are ElderMind. Be warm. Max 2 sentences."

    # Geo-aware context injection (per prompt.md placeholders)
    weather_summary = "unknown"
    festival_today = ""
    tithi_today = ""
    if settings.openweather_api_key and lat is not None and lon is not None:
        try:
            wx = await fetch_openweather_summary(api_key=settings.openweather_api_key, lat=lat, lon=lon, lang="en")
            weather_summary = wx.summary
        except Exception:
            weather_summary = "unknown"

    if lat is not None and lon is not None:
        try:
            cal = await fetch_tithi_festival(
                base_url=settings.vedastro_base_url,
                lat=lat,
                lon=lon,
                tz_offset=settings.default_tz_offset,
                ayanamsa=settings.vedastro_ayanamsa,
            )
            festival_today = cal.festival
            tithi_today = cal.tithi
        except Exception:
            festival_today = ""
            tithi_today = ""

    # lightweight tool hint: if Tavily configured, we can fetch 1-2 sources for “webby” queries
    tool_context = ""
    if settings.tavily_api_key and any(k in user_text.lower() for k in ["weather", "news", "latest", "today", "price"]):
        results = await tavily_search(settings.tavily_api_key, user_text, max_results=3)
        snippets = []
        for r in results[:3]:
            snippets.append(f"- {r.get('title','')}: {r.get('content','')[:240]} ({r.get('url','')})")
        if snippets:
            tool_context = "\n\nWEB_CONTEXT:\n" + "\n".join(snippets)

    injected_context = "\n\nCURRENT_STATUS:\n"
    injected_context += f"Weather: {weather_summary}\n"
    injected_context += f"Festival Today: {festival_today}\n"
    injected_context += f"Tithi Today: {tithi_today}\n"

    system = base_prompt + injected_context + tool_context + "\n\nRULE: Reply in max 2 sentences. Use silent markers [HEALTH_LOG: x] [MOOD_LOG: y] when relevant."

    raw = ""
    if settings.groq_api_key:
        try:
            raw = await groq_chat_completion(settings.groq_api_key, model=settings.groq_model, system=system, user=user_text)
        except Exception:
            raw = ""
    else:
        raw = ""

    if not raw and settings.gemini_api_key:
        try:
            raw = await gemini_generate_text(api_key=settings.gemini_api_key, model=settings.gemini_model, system=system, user=user_text)
        except Exception:
            raw = ""

    if not raw:
        raw = _fallback_reply(user_text)
    parsed = parse_markers(raw)

    lang = _lang_for_user(user_id)
    mp3_name = synthesize_mp3(parsed.cleaned_text or raw, lang="en" if lang == "en" else "hi", out_dir=settings.media_dir)
    audio_url = f"{settings.base_url}/media/{mp3_name}"

    # Persist conversation + extracted logs (best-effort)
    try:
        async with __import__("httpx").AsyncClient(timeout=10) as client:  # avoid new dependency import patterns
            await client.post(
                f"{settings.data_service_url}/conversations/{user_id}",
                json={
                    "ts": datetime.now(timezone.utc).isoformat(),
                    "text_input": user_text,
                    "ai_response": parsed.cleaned_text or raw,
                    "mood": (parsed.mood_logs[-1] if parsed.mood_logs else "okay"),
                    "emotion": emotion_label,
                    "health_logs": parsed.health_logs,
                    "mood_logs": parsed.mood_logs,
                    "alerts": parsed.alerts,
                    "context": {"weather": weather_summary, "festival": festival_today, "tithi": tithi_today},
                },
            )
            for a in parsed.alerts:
                await client.post(
                    f"{settings.data_service_url}/alerts/{user_id}",
                    json={
                        "time_created": datetime.now(timezone.utc).isoformat(),
                        "type": "ai_marker",
                        "message": a,
                        "severity": 75,
                    },
                )
    except Exception:
        pass

    return {
        "status": "success",
        "text": parsed.cleaned_text or raw,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "mood": (parsed.mood_logs[-1] if parsed.mood_logs else "okay"),
        "emotion": emotion_label,
        "alert_sent": bool(parsed.alerts),
        "alert_severity": 75 if parsed.alerts else 0,
        "logs": {
            "health": parsed.health_logs,
            "mood": parsed.mood_logs,
            "alerts": parsed.alerts,
        },
        "audio_url": audio_url,
    }

