from __future__ import annotations

import os
from dataclasses import dataclass


def _env(name: str, default: str | None = None) -> str | None:
    v = os.getenv(name)
    if v is None:
        return default
    v = v.strip()
    return v if v else default


@dataclass(frozen=True)
class AISettings:
    port: int = int(_env("AI_SERVICE_PORT", "8001") or "8001")
    cors_allow_origins: str = _env("CORS_ALLOW_ORIGINS", "*") or "*"

    groq_api_key: str | None = _env("GROQ_API_KEY")
    groq_model: str = _env("GROQ_MODEL", "llama-3.1-70b-versatile") or "llama-3.1-70b-versatile"

    tavily_api_key: str | None = _env("TAVILY_API_KEY")

    gemini_api_key: str | None = _env("GEMINI_API_KEY")
    gemini_model: str = _env("GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"

    openweather_api_key: str | None = _env("OPENWEATHER_API_KEY")
    vedastro_base_url: str = _env("VEDASTRO_BASE_URL", "https://api.vedastro.org") or "https://api.vedastro.org"
    vedastro_ayanamsa: str = _env("VEDASTRO_AYANAMSA", "RAMAN") or "RAMAN"
    default_tz_offset: str = _env("DEFAULT_TZ_OFFSET", "+05:30") or "+05:30"

    media_dir: str = _env("MEDIA_DIR", "backend_media") or "backend_media"
    base_url: str = _env("BASE_URL", "http://127.0.0.1:8010") or "http://127.0.0.1:8010"

    data_service_url: str = _env("DATA_SERVICE_URL", "http://127.0.0.1:8002") or "http://127.0.0.1:8002"


settings = AISettings()

