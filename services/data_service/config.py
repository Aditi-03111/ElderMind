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
class DataSettings:
    port: int = int(_env("DATA_SERVICE_PORT", "8002") or "8002")
    cors_allow_origins: str = _env("CORS_ALLOW_ORIGINS", "*") or "*"
    data_dir: str = _env("DATA_DIR", "data_store") or "data_store"
    firebase_project_id: str | None = _env("FIREBASE_PROJECT_ID")
    firebase_service_account_path: str | None = _env("FIREBASE_SERVICE_ACCOUNT_PATH")


settings = DataSettings()

