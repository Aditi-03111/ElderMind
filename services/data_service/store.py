from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from uuid import uuid4

import firebase_admin
from firebase_admin import credentials, firestore


@dataclass(frozen=True)
class StorePaths:
    root: Path

    @property
    def users(self) -> Path:
        return self.root / "users.json"

    @property
    def meds(self) -> Path:
        return self.root / "meds.json"

    @property
    def conv(self) -> Path:
        return self.root / "conversations.json"

    @property
    def alerts(self) -> Path:
        return self.root / "alerts.json"


def _load(path: Path, default: Any) -> Any:
    if not path.exists():
        return default
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return default


def _save(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


class LocalStore:
    def __init__(self, data_dir: str):
        self.paths = StorePaths(Path(data_dir))
        self.paths.root.mkdir(parents=True, exist_ok=True)

        # seed demo data
        if not self.paths.users.exists():
            _save(
                self.paths.users,
                {
                    "demo": {
                        "user_id": "demo",
                        "name": "Ramesh",
                        "age": 72,
                        "language": "en",
                        "region": "karnataka",
                        "city": "tumkur",
                        "wake_time": "07:00",
                        "sleep_time": "21:00",
                        "caregiver_name": "Kiran",
                        "caregiver_phone": "+91-9999999999",
                    }
                },
            )
        if not self.paths.meds.exists():
            _save(
                self.paths.meds,
                {
                    "demo": [
                        {"id": "aspirin", "name": "Aspirin", "dose": "100mg", "times": ["08:00", "20:00"], "instructions": "With water"},
                        {"id": "bp", "name": "BP tablet", "dose": "10mg", "times": ["14:00"], "instructions": "After lunch"},
                    ]
                },
            )
        for p, default in [(self.paths.conv, {"demo": []}), (self.paths.alerts, {"demo": []})]:
            if not p.exists():
                _save(p, default)

    def get_user(self, user_id: str) -> dict:
        return _load(self.paths.users, {}).get(user_id) or _load(self.paths.users, {}).get("demo")

    def list_meds(self, user_id: str) -> list[dict]:
        return _load(self.paths.meds, {}).get(user_id) or []

    def append_conversation(self, user_id: str, item: dict) -> dict:
        data = _load(self.paths.conv, {"demo": []})
        data.setdefault(user_id, [])
        item = {"id": item.get("id") or str(uuid4()), **item}
        data[user_id].append(item)
        _save(self.paths.conv, data)
        return item

    def list_conversations(self, user_id: str, limit: int = 20) -> list[dict]:
        data = _load(self.paths.conv, {"demo": []})
        items = data.get(user_id, [])
        return items[-limit:]

    def append_alert(self, user_id: str, item: dict) -> dict:
        data = _load(self.paths.alerts, {"demo": []})
        data.setdefault(user_id, [])
        item = {"id": item.get("id") or str(uuid4()), **item}
        data[user_id].append(item)
        _save(self.paths.alerts, data)
        return item

    def list_alerts(self, user_id: str, limit: int = 20) -> list[dict]:
        data = _load(self.paths.alerts, {"demo": []})
        return (data.get(user_id, []) or [])[-limit:]


class FirestoreStore:
    """
    Minimal Firestore-backed store that mirrors the LocalStore API used by data_service.
    Collections:
      - users/{user_id}
      - users/{user_id}/conversations/{conv_id}
      - users/{user_id}/alerts/{alert_id}
      - users/{user_id}/meds/{med_id} (optional)
    """

    def __init__(self, *, service_account_path: str, project_id: str | None = None) -> None:
        if not firebase_admin._apps:
            cred = credentials.Certificate(service_account_path)
            firebase_admin.initialize_app(cred, {"projectId": project_id} if project_id else None)
        self.db = firestore.client()

    def _user_doc(self, user_id: str):
        return self.db.collection("users").document(user_id)

    def get_user(self, user_id: str) -> dict:
        doc = self._user_doc(user_id).get()
        if doc.exists:
            data = doc.to_dict() or {}
            data.setdefault("user_id", user_id)
            return data
        # match LocalStore behavior: fallback to demo if missing
        demo = self._user_doc("demo").get()
        if demo.exists:
            data = demo.to_dict() or {}
            data.setdefault("user_id", "demo")
            return data
        return {"user_id": user_id}

    def list_meds(self, user_id: str) -> list[dict]:
        meds = self._user_doc(user_id).collection("meds").stream()
        out: list[dict] = []
        for m in meds:
            d = m.to_dict() or {}
            d.setdefault("id", m.id)
            out.append(d)
        return out

    def append_conversation(self, user_id: str, item: dict) -> dict:
        item = {"id": item.get("id") or str(uuid4()), **item}
        self._user_doc(user_id).collection("conversations").document(item["id"]).set(item)
        return item

    def list_conversations(self, user_id: str, limit: int = 20) -> list[dict]:
        qs = (
            self._user_doc(user_id)
            .collection("conversations")
            .order_by("ts", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        items: list[dict] = []
        for d in qs:
            v = d.to_dict() or {}
            v.setdefault("id", d.id)
            items.append(v)
        items.reverse()
        return items

    def append_alert(self, user_id: str, item: dict) -> dict:
        item = {"id": item.get("id") or str(uuid4()), **item}
        self._user_doc(user_id).collection("alerts").document(item["id"]).set(item)
        return item

    def list_alerts(self, user_id: str, limit: int = 20) -> list[dict]:
        qs = (
            self._user_doc(user_id)
            .collection("alerts")
            .order_by("time_created", direction=firestore.Query.DESCENDING)
            .limit(limit)
            .stream()
        )
        out: list[dict] = []
        for d in qs:
            v = d.to_dict() or {}
            v.setdefault("id", d.id)
            out.append(v)
        out.reverse()
        return out


Store = LocalStore | FirestoreStore

