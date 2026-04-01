from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Any
from uuid import uuid4


def _lazy_imports():
    try:
        import matplotlib

        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import rppg

        return plt, rppg
    except Exception as exc:  # pragma: no cover - optional dependency path
        raise RuntimeError(
            "rPPG is not enabled yet. Install open-rppg and matplotlib to use camera wellness checks."
        ) from exc


@lru_cache(maxsize=1)
def _model():
    _, rppg = _lazy_imports()
    return rppg.Model()


def analyze_rppg_video_bytes(video_bytes: bytes, filename: str, media_dir: str) -> dict[str, Any]:
    if not video_bytes:
        raise ValueError("Video file is empty")

    suffix = Path(filename or "input.mp4").suffix or ".mp4"
    media_root = Path(media_dir)
    media_root.mkdir(parents=True, exist_ok=True)
    temp_root = media_root / "_rppg_tmp"
    temp_root.mkdir(parents=True, exist_ok=True)
    video_path = temp_root / f"input-{uuid4().hex}{suffix}"
    video_path.write_bytes(video_bytes)
    try:
        model = _model()
        result = model.process_video(str(video_path))
        raw_bvp, timestamps = model.bvp(raw=True)
    finally:
        try:
            video_path.unlink(missing_ok=True)
        except Exception:
            pass

    if result is None:
        raise ValueError(
            "Could not detect a clear pulse signal from the video. "
            "Please try again with better lighting and keep your face steady."
        )

    bpm = float(result.get("hr") or 0.0)
    sqi = float(result.get("SQI") or 0.0)
    hrv = result.get("hrv") or {}

    raw_bvp = list(raw_bvp) if raw_bvp is not None else []
    timestamps = list(timestamps) if timestamps is not None else []

    plt, _ = _lazy_imports()
    plot_name = f"rppg-{uuid4().hex}.png"
    plot_path = media_root / plot_name

    fig = plt.figure(figsize=(10, 4))
    if len(raw_bvp) > 0 and len(timestamps) > 0:
        plt.plot(timestamps, raw_bvp, color="#E4506D", linewidth=1.4)
    else:
        plt.text(0.5, 0.5, "Insufficient signal data", ha="center", va="center",
                 transform=fig.transFigure, fontsize=14, color="#999")
    plt.title("Bhumi Camera Wellness Check - Raw BVP")
    plt.xlabel("Time (seconds)")
    plt.ylabel("BVP amplitude")
    plt.grid(True, alpha=0.25)
    plt.tight_layout()
    plt.savefig(plot_path, dpi=160)
    plt.close(fig)

    return {
        "bpm": bpm,
        "sqi": sqi,
        "hrv": hrv,
        "raw_bvp": [float(item) for item in raw_bvp],
        "timestamps": [float(item) for item in timestamps],
        "plot_file": plot_name,
    }
