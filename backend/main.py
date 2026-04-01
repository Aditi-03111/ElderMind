from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import uuid4

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class UserProfile(BaseModel):
    user_id: str
    name: str = "Ramesh"
    age: int = 72
    language: str = "en"
    region: str = "karnataka"
    city: str = "tumkur"
    wake_time: str = "07:00"
    sleep_time: str = "21:00"
    caregiver_name: str = "Kiran"
    caregiver_phone: str = "+91-9999999999"


class Medicine(BaseModel):
    id: str
    name: str
    dose: str
    times: list[str]
    instructions: str = ""
    condition: str = ""


class ConversationTurn(BaseModel):
    ts: datetime
    text_input: str
    ai_response: str
    mood: Literal["good", "okay", "low", "anxious"] = "okay"
    emotion: str = "neutral"


class VoiceRequest(BaseModel):
    user_id: str = "demo"
    text: str | None = None
    mood_hint: Literal["good", "okay", "low", "anxious"] | None = None


class VoiceResponse(BaseModel):
    status: Literal["success"]
    text: str
    mood: Literal["good", "okay", "low", "anxious"]
    emotion: str
    timestamp: datetime
    alert_sent: bool = False
    alert_severity: int = 0


class SosRequest(BaseModel):
    user_id: str = "demo"
    reason: str | None = None
    location: dict | None = None


class SosResponse(BaseModel):
    status: Literal["success"]
    alerts_sent_to: list[str]
    timestamp: datetime
    severity: int
    message: str


class MedicineConfirmRequest(BaseModel):
    user_id: str = "demo"
    confirmed_time: str | None = None


class WeeklyReport(BaseModel):
    week_start: str
    week_end: str
    mood_score: int = Field(ge=0, le=100)
    activity_steps_per_day: int
    medicine_adherence: int = Field(ge=0, le=100)
    sleep_hours: float
    health_issues: list[str]
    recommendations: list[str]


app = FastAPI(title="ElderMind Backend", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---- In-memory demo store (swap with Firebase later) ----
DEMO_USER = UserProfile(user_id="demo")

MEDS: dict[str, Medicine] = {
    "aspirin": Medicine(
        id="aspirin",
        name="Aspirin",
        dose="100mg",
        times=["08:00", "20:00"],
        instructions="Take with water",
        condition="Heart health",
    ),
    "bp": Medicine(
        id="bp",
        name="BP tablet",
        dose="10mg",
        times=["14:00"],
        instructions="After lunch",
        condition="Blood pressure",
    ),
    "sugar": Medicine(
        id="sugar",
        name="Sugar tablet",
        dose="5mg",
        times=["20:00"],
        instructions="With food",
        condition="Diabetes",
    ),
}

MED_LOGS: dict[str, list[dict]] = {"demo": []}
CONV: dict[str, list[ConversationTurn]] = {"demo": []}
ALERTS: list[dict] = []


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _gentle_reply(text: str, profile: UserProfile) -> tuple[str, str, str, int, bool]:
    t = (text or "").strip().lower()
    mood: Literal["good", "okay", "low", "anxious"] = "okay"
    emotion = "neutral"
    severity = 0
    alert = False

    if any(k in t for k in ["alone", "akela", "lonely", "miss", "sad"]):
        mood = "low"
        emotion = "sad"
        reply = f"{profile.name} ji, akela lag raha hai na? Main yahin hoon — thodi baat karein."
    elif any(k in t for k in ["head", "chakra", "headache"]):
        mood = "okay"
        emotion = "concerned"
        reply = f"Arre {profile.name} ji, sar dard hai na? Thoda aaram karo aur paani pi lo."
    elif any(k in t for k in ["help", "emergency", "sos", "fall", "chest"]):
        mood = "anxious"
        emotion = "urgent"
        severity = 75
        alert = True
        reply = f"{profile.name} ji, theek hai. Main Kiran ko turant bata deta hoon — aap bas dheere se saans lo."
    elif any(k in t for k in ["medicine", "tablet", "med", "dawa"]):
        mood = "okay"
        emotion = "supportive"
        reply = f"{profile.name} ji, dawa ka schedule dekh lete hain. Aap chahein to main yaad dilaata rahoon."
    else:
        mood = "good"
        emotion = "warm"
        reply = f"Haan {profile.name} ji, main sun raha hoon. Aap araam se boliye — main yahin hoon."

    return reply, mood, emotion, severity, alert


@app.get("/health")
def health():
    return {"status": "ok", "time": _now().isoformat()}


@app.get("/user/{user_id}", response_model=UserProfile)
def get_user(user_id: str):
    return DEMO_USER


@app.get("/medicine/{user_id}")
def get_medicines(user_id: str):
    return {"user_id": user_id, "medicines": list(MEDS.values()), "logs": MED_LOGS.get(user_id, [])[-30:]}


@app.post("/medicine/{med_id}/confirm")
def confirm_medicine(med_id: str, body: MedicineConfirmRequest):
    user_id = body.user_id
    med = MEDS.get(med_id)
    if not med:
        return {"status": "error", "message": "medicine not found"}
    entry = {
        "id": str(uuid4()),
        "med_id": med_id,
        "scheduled_time": None,
        "confirmed_time": body.confirmed_time or _now().isoformat(),
        "status": "taken",
        "created_at": _now().isoformat(),
    }
    MED_LOGS.setdefault(user_id, []).append(entry)
    return {"status": "success", "logged": entry}


@app.post("/voice", response_model=VoiceResponse)
def voice(body: VoiceRequest):
    profile = DEMO_USER
    text = body.text or ""
    reply, mood, emotion, severity, alert = _gentle_reply(text, profile)
    if body.mood_hint:
        mood = body.mood_hint

    turn = ConversationTurn(ts=_now(), text_input=text, ai_response=reply, mood=mood, emotion=emotion)
    CONV.setdefault(body.user_id, []).append(turn)

    if alert:
        ALERTS.append(
            {
                "id": str(uuid4()),
                "type": "voice_trigger",
                "severity": severity,
                "time_created": _now().isoformat(),
                "message": f"Voice indicated urgent need: {text[:120]}",
                "user_id": body.user_id,
            }
        )

    return VoiceResponse(
        status="success",
        text=reply,
        mood=mood,
        emotion=emotion,
        timestamp=_now(),
        alert_sent=alert,
        alert_severity=severity if alert else 0,
    )


@app.post("/sos", response_model=SosResponse)
def sos(body: SosRequest):
    profile = DEMO_USER
    severity = 90
    message = body.reason or "SOS pressed"
    alert = {
        "id": str(uuid4()),
        "type": "sos",
        "severity": severity,
        "time_created": _now().isoformat(),
        "message": message,
        "user_id": body.user_id,
        "location": body.location,
    }
    ALERTS.append(alert)
    return SosResponse(
        status="success",
        alerts_sent_to=[profile.caregiver_phone],
        timestamp=_now(),
        severity=severity,
        message=f"Sent SOS to {profile.caregiver_name}.",
    )


@app.get("/dashboard/{caregiver_id}")
def dashboard(caregiver_id: str):
    user_id = "demo"
    recent_conv = CONV.get(user_id, [])[-12:]
    recent_med = MED_LOGS.get(user_id, [])[-30:]
    recent_alerts = ALERTS[-20:]
    return {
        "caregiver_id": caregiver_id,
        "user": DEMO_USER,
        "recent_conversations": recent_conv,
        "medicine_logs": recent_med,
        "alerts": recent_alerts,
    }


@app.get("/report/weekly/{user_id}", response_model=WeeklyReport)
def weekly_report(user_id: str):
    now = _now()
    start = (now - timedelta(days=6)).date()
    end = now.date()

    conv = CONV.get(user_id, [])
    moods = [t.mood for t in conv[-60:]]
    mood_score = int(
        100
        * (
            (moods.count("good") * 1.0 + moods.count("okay") * 0.75 + moods.count("low") * 0.45 + moods.count("anxious") * 0.35)
            / max(1, len(moods))
        )
    )
    med_logs = MED_LOGS.get(user_id, [])
    medicine_adherence = min(100, 70 + len(med_logs) * 3)

    return WeeklyReport(
        week_start=str(start),
        week_end=str(end),
        mood_score=mood_score,
        activity_steps_per_day=4200,
        medicine_adherence=medicine_adherence,
        sleep_hours=7.5,
        health_issues=[],
        recommendations=[
            "10-minute walk after lunch",
            "Drink 1 extra glass of water",
            "Call a friend or family member for 5 minutes",
        ],
    )

