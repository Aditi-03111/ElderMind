from __future__ import annotations

import os
from dataclasses import dataclass


def _get_env(name: str, default: str | None = None) -> str | None:
    v = os.getenv(name)
    if v is None:
        return default
    v = v.strip()
    return v if v else default


@dataclass(frozen=True)
class Settings:
    # Core
    app_env: str = _get_env("APP_ENV", "dev") or "dev"
    cors_allow_origins: str = _get_env("CORS_ALLOW_ORIGINS", "*") or "*"

    # LLM providers
    groq_api_key: str | None = _get_env("GROQ_API_KEY")
    groq_model: str = _get_env("GROQ_MODEL", "llama-3.1-70b-versatile") or "llama-3.1-70b-versatile"

    gemini_api_key: str | None = _get_env("GEMINI_API_KEY")
    gemini_model: str = _get_env("GEMINI_MODEL", "gemini-1.5-flash") or "gemini-1.5-flash"

    tavily_api_key: str | None = _get_env("TAVILY_API_KEY")

    # Optional 3rd party
    openweather_api_key: str | None = _get_env("OPENWEATHER_API_KEY")

    # Firebase (optional)
    firebase_project_id: str | None = _get_env("FIREBASE_PROJECT_ID")
    firebase_service_account_json: str | None = _get_env("FIREBASE_SERVICE_ACCOUNT_JSON")  # raw JSON string
    firebase_service_account_path: str | None = _get_env("FIREBASE_SERVICE_ACCOUNT_PATH")  # file path

    # Twilio (optional)
    twilio_account_sid: str | None = _get_env("TWILIO_ACCOUNT_SID")
    twilio_auth_token: str | None = _get_env("TWILIO_AUTH_TOKEN")
    twilio_from_phone: str | None = _get_env("TWILIO_FROM_PHONE")

    # Media output
    media_dir: str = _get_env("MEDIA_DIR", "backend_media") or "backend_media"
    base_url: str = _get_env("BASE_URL", "http://127.0.0.1:8000") or "http://127.0.0.1:8000"


settings = Settings()

