from __future__ import annotations

import os
from datetime import datetime

import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI


GATEWAY_URL = os.getenv("GATEWAY_URL", "http://127.0.0.1:8000")
DEMO_FAST_SCHEDULE = os.getenv("DEMO_FAST_SCHEDULE", "1") == "1"

app = FastAPI(title="ElderMind Scheduler Service", version="0.1.0")
sched = AsyncIOScheduler()


@app.get("/health")
async def health():
    return {"status": "ok", "service": "scheduler", "running": sched.running}


async def _poke_checkin():
    # check-in “voice” turn using text (gateway proxies to ai_service)
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(f"{GATEWAY_URL}/voice", data={"user_id": "demo", "text": "Kaise ho?"})


async def _morning_greeting():
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(f"{GATEWAY_URL}/voice", data={"user_id": "demo", "text": "Jai Shri Ram! Good morning. Kaise neend aayi?"})


async def _cultural_prompt():
    async with httpx.AsyncClient(timeout=20) as client:
        await client.post(f"{GATEWAY_URL}/voice", data={"user_id": "demo", "text": "Ek sundar doha sunna chahenge?"})


async def _weekly_report_ping():
    async with httpx.AsyncClient(timeout=20) as client:
        await client.get(f"{GATEWAY_URL}/report/weekly/demo")


@app.on_event("startup")
async def _startup():
    # In demo mode, schedules run fast so you can observe flows.
    # In real mode, use cron-like schedules.
    if DEMO_FAST_SCHEDULE:
        sched.add_job(_poke_checkin, "interval", minutes=2, id="checkin_demo")
        sched.add_job(_cultural_prompt, "interval", minutes=5, id="cultural_demo")
        sched.add_job(_weekly_report_ping, "interval", minutes=7, id="weekly_demo")
        sched.add_job(_morning_greeting, "interval", minutes=11, id="morning_demo")
    else:
        sched.add_job(_poke_checkin, "interval", hours=2, id="checkin_2h")
        sched.add_job(_cultural_prompt, "cron", hour=15, minute=0, id="cultural_3pm")
        sched.add_job(_weekly_report_ping, "cron", day_of_week="mon", hour=9, minute=0, id="weekly_mon")
        sched.add_job(_morning_greeting, "cron", hour=7, minute=0, id="morning_7am")
    sched.start()


@app.on_event("shutdown")
async def _shutdown():
    if sched.running:
        sched.shutdown(wait=False)

