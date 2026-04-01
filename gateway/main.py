from __future__ import annotations

from typing import Any

import httpx
from fastapi import FastAPI, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .config import settings


app = FastAPI(title="ElderMind Gateway", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_origins == "*" else settings.cors_allow_origins.split(","),
    # We don't use cookie-based auth; disabling credentials makes wildcard CORS safe for local dev.
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "gateway"}


async def _proxy_json(method: str, url: str, *, json: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=60) as client:
        res = await client.request(method, url, json=json)
        res.raise_for_status()
        return res.json()


@app.post("/voice")
async def voice(request: Request):
    """
    Public voice endpoint.
    Proxies to ai_service. Accepts text and/or audio.
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

    if audio is not None:
        async with httpx.AsyncClient(timeout=120) as client:
            files = {"audio": (audio.filename or "audio.webm", await audio.read(), audio.content_type or "application/octet-stream")}
            data = {"user_id": user_id}
            if text:
                data["text"] = text
            if lat is not None and lon is not None:
                data["lat"] = str(lat)
                data["lon"] = str(lon)
            res = await client.post(f"{settings.ai_service_url}/voice", data=data, files=files)
            res.raise_for_status()
            return res.json()
    payload: dict[str, Any] = {"user_id": user_id, "text": text}
    if lat is not None and lon is not None:
        payload["lat"] = lat
        payload["lon"] = lon
    return await _proxy_json("POST", f"{settings.ai_service_url}/voice", json=payload)


@app.post("/sos")
async def sos(payload: dict):
    return await _proxy_json("POST", f"{settings.alerts_service_url}/sos", json=payload)


@app.get("/medicine/{user_id}")
async def medicines(user_id: str):
    return await _proxy_json("GET", f"{settings.data_service_url}/medicine/{user_id}")


@app.post("/medicine/{med_id}/confirm")
async def confirm_medicine(med_id: str, payload: dict):
    return await _proxy_json("POST", f"{settings.data_service_url}/medicine/{med_id}/confirm", json=payload)


@app.get("/dashboard/{caregiver_id}")
async def dashboard(caregiver_id: str):
    return await _proxy_json("GET", f"{settings.data_service_url}/dashboard/{caregiver_id}")


@app.get("/report/weekly/{user_id}")
async def weekly(user_id: str):
    return await _proxy_json("GET", f"{settings.data_service_url}/report/weekly/{user_id}")

