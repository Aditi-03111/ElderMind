from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .store import FirestoreStore, LocalStore, Store


app = FastAPI(title="ElderMind Data Service", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.cors_allow_origins == "*" else settings.cors_allow_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store: Store
if settings.firebase_service_account_path:
    store = FirestoreStore(service_account_path=settings.firebase_service_account_path, project_id=settings.firebase_project_id)
else:
    store = LocalStore(settings.data_dir)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "data"}


@app.get("/medicine/{user_id}")
async def get_meds(user_id: str):
    return {"user_id": user_id, "medicines": store.list_meds(user_id), "logs": []}


@app.post("/medicine/{med_id}/confirm")
async def confirm_med(med_id: str, payload: dict):
    user_id = payload.get("user_id") or "demo"
    store.append_conversation(
        user_id,
        {
            "ts": datetime.now(timezone.utc).isoformat(),
            "text_input": f"[medicine_confirm] {med_id}",
            "ai_response": "logged",
            "mood": "okay",
            "emotion": "neutral",
        },
    )
    return {"status": "success", "logged": {"med_id": med_id, "status": "taken"}}


@app.get("/dashboard/{caregiver_id}")
async def dashboard(caregiver_id: str):
    user_id = "demo"
    user = store.get_user(user_id)
    conv = store.list_conversations(user_id, limit=12)
    alerts = store.list_alerts(user_id, limit=20)
    return {
        "caregiver_id": caregiver_id,
        "user": user,
        "recent_conversations": conv,
        "medicine_logs": [],
        "alerts": alerts,
    }


@app.get("/report/weekly/{user_id}")
async def weekly(user_id: str):
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=6)).date()
    end = now.date()
    return {
        "week_start": str(start),
        "week_end": str(end),
        "mood_score": 80,
        "activity_steps_per_day": 4200,
        "medicine_adherence": 95,
        "sleep_hours": 7.5,
        "health_issues": [],
        "recommendations": [
            "10-minute walk after lunch",
            "Drink 1 extra glass of water",
            "Call a friend or family member for 5 minutes",
        ],
    }

