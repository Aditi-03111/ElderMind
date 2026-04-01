# ElderMind Backend (FastAPI)

## Run locally

```bash
cd backend
python -V
# Recommended: Python 3.12 or 3.13 (FastAPI + Pydantic v2).
#
# If you are on Python 3.14, `pydantic-core` may require Rust/Cargo to compile.

python -m venv venv
# Windows PowerShell:
venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Health check:

- `http://localhost:8000/health`

## Endpoints (implemented)

- `POST /voice` (text in → gentle response out)
- `GET /medicine/{user_id}`
- `POST /medicine/{med_id}/confirm`
- `POST /sos`
- `GET /dashboard/{caregiver_id}`
- `GET /report/weekly/{user_id}`

This backend is currently an **in-memory demo store** (matches the architecture but without Firebase/Twilio yet).

