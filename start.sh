#!/bin/sh
# Start uvicorn with Railway's PORT environment variable
exec uvicorn app:app --host 0.0.0.0 --port ${PORT:-8000}
