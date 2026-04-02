from __future__ import annotations

import os
from functools import lru_cache
from typing import Literal
from urllib.parse import urlsplit

import httpx
from fastapi import FastAPI

ServiceName = Literal["ai", "data", "alerts", "scheduler"]
_TRUE_VALUES = {"1", "true", "yes", "on"}


def single_process_enabled() -> bool:
    raw = (os.getenv("ELDERMIND_SINGLE_PROCESS") or "").strip().lower()
    return raw in _TRUE_VALUES


@lru_cache(maxsize=None)
def _service_app(service_name: ServiceName) -> FastAPI:
    if service_name == "ai":
        from services.ai_service.main import app

        return app
    if service_name == "data":
        from services.data_service.main import app

        return app
    if service_name == "alerts":
        from services.alerts_service.main import app

        return app
    if service_name == "scheduler":
        from services.scheduler_service.main import app

        return app
    raise ValueError(f"Unsupported service name: {service_name}")


def _local_path(url: str) -> str:
    parsed = urlsplit(url)
    path = parsed.path or "/"
    if parsed.query:
        return f"{path}?{parsed.query}"
    return path


async def service_request(
    service_name: ServiceName | None,
    method: str,
    url: str,
    *,
    timeout: float = 60,
    **kwargs,
) -> httpx.Response:
    if single_process_enabled() and service_name is not None:
        transport = httpx.ASGITransport(app=_service_app(service_name))
        async with httpx.AsyncClient(
            transport=transport,
            base_url=f"http://{service_name}.internal",
            timeout=timeout,
        ) as client:
            return await client.request(method, _local_path(url), **kwargs)

    async with httpx.AsyncClient(timeout=timeout) as client:
        return await client.request(method, url, **kwargs)
