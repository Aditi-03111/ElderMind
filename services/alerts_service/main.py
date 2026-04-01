from __future__ import annotations

from datetime import datetime, timezone
from uuid import uuid4

import httpx
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from twilio.rest import Client as TwilioClient

from .config import settings


app = FastAPI(title="ElderMind Alerts Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_origins == "*" else settings.cors_allow_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "alerts"}


async def _persist_alert(user_id: str, alert: dict):
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            await client.post(f"{settings.data_service_url}/alerts/{user_id}", json=alert)
        except Exception:
            pass


@app.post("/sos")
async def sos(payload: dict):
    user_id = payload.get("user_id") or "demo"
    reason = payload.get("reason") or "SOS pressed"
    severity = 90
    alert = {
        "id": str(uuid4()),
        "type": "sos",
        "severity": severity,
        "time_created": datetime.now(timezone.utc).isoformat(),
        "message": reason,
        "user_id": user_id,
        "location": payload.get("location"),
    }
    await _persist_alert(user_id, alert)

    # Twilio is stubbed unless credentials exist.
    sent_to = []
    if settings.twilio_account_sid and settings.twilio_auth_token and settings.twilio_from_phone:
        try:
            client = TwilioClient(settings.twilio_account_sid, settings.twilio_auth_token)
            msg = client.messages.create(
                from_=settings.twilio_from_phone,
                to=(payload.get("to") or "").strip() or "+91-9999999999",
                body=f"ElderMind SOS: {reason} (severity {severity})",
            )
            sent_to.append(f"twilio:{msg.sid}")
        except Exception:
            sent_to.append("twilio_error")
    else:
        sent_to.append("stub")

    return {
        "status": "success",
        "alerts_sent_to": sent_to,
        "timestamp": alert["time_created"],
        "severity": severity,
        "message": "SOS received by alerts service.",
    }

