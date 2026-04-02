#!/bin/bash
# Single-process start script for Render free tier
# Runs all services + gateway in one dyno using background processes

PORT=${PORT:-8010}

# Internal service ports (not exposed publicly)
AI_PORT=8001
DATA_PORT=8002
ALERTS_PORT=8003
SCHEDULER_PORT=8004

# Point services at each other via localhost
export AI_SERVICE_URL=http://127.0.0.1:$AI_PORT
export DATA_SERVICE_URL=http://127.0.0.1:$DATA_PORT
export ALERTS_SERVICE_URL=http://127.0.0.1:$ALERTS_PORT
export GATEWAY_URL=http://127.0.0.1:$PORT

# Start internal services in background
uvicorn services.data_service.main:app --host 127.0.0.1 --port $DATA_PORT &
uvicorn services.alerts_service.main:app --host 127.0.0.1 --port $ALERTS_PORT &
uvicorn services.ai_service.main:app --host 127.0.0.1 --port $AI_PORT &
uvicorn services.scheduler_service.main:app --host 127.0.0.1 --port $SCHEDULER_PORT &

# Small delay to let internal services bind
sleep 2

# Start gateway on the public PORT (Render routes traffic here)
uvicorn gateway.main:app --host 0.0.0.0 --port $PORT
