from __future__ import annotations

import os
from datetime import datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI


GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000")

app = FastAPI(title="ElderMind Scheduler Service", version="0.1.0")
sched = AsyncIOScheduler()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scheduler", "running": sched.running}


async def _poke_checkin():
    # demo: create a check-in “voice” turn using text
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(f"{GATEWAY_URL}/voice", data={"user_id": "demo", "text": "Kaise ho?"})


@app.on_event("startup")
async def _startup():
    # Demo schedule: every 2 minutes (instead of every 2 hours) so you can see it working quickly.
    sched.add_job(_poke_checkin, "interval", minutes=2, id="checkin_demo")
    sched.start()


@app.on_event("shutdown")
async def _shutdown():
    if sched.running:
        sched.shutdown(wait=False)

