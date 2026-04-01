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
class AlertsSettings:
    port: int = int(_env("ALERTS_SERVICE_PORT", "8003") or "8003")
    cors_allow_origins: str = _env("CORS_ALLOW_ORIGINS", "*") or "*"

    twilio_account_sid: str | None = _env("TWILIO_ACCOUNT_SID")
    twilio_auth_token: str | None = _env("TWILIO_AUTH_TOKEN")
    twilio_from_phone: str | None = _env("TWILIO_FROM_PHONE")
    meta_whatsapp_token: str | None = _env("META_WHATSAPP_TOKEN")
    meta_whatsapp_phone_number_id: str | None = _env("META_WHATSAPP_PHONE_NUMBER_ID")
    meta_whatsapp_version: str = _env("META_WHATSAPP_VERSION", "v21.0") or "v21.0"

    data_service_url: str = _env("DATA_SERVICE_URL", "http://127.0.0.1:8002") or "http://127.0.0.1:8002"


settings = AlertsSettings()
