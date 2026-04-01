# ElderMind Backend (FastAPI)

## Run locally

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
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

