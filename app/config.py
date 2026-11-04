"""Settings, read from .env (copy .env.example to .env)."""

import os
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

MODEL_API_KEY = os.environ.get("MODEL_API_KEY", "")
MODEL_API_BASE_URL = os.environ.get("MODEL_API_BASE_URL") or "https://api.meta.ai/v1"
MODEL = os.environ.get("MODEL_API_MODEL") or "muse-spark-1.3"
# Optional: minimal | low | medium | high | xhigh. Empty = model default.
REASONING_EFFORT = os.environ.get("REASONING_EFFORT", "").strip()

# Pages per transcription call. Smaller = more parallel calls, less risk of truncated output.
CHUNK_PAGES = int(os.environ.get("CHUNK_PAGES", "8"))
MAX_PARALLEL_CALLS = int(os.environ.get("MAX_PARALLEL_CALLS", "4"))
MAX_UPLOAD_MB = int(os.environ.get("MAX_UPLOAD_MB", "50"))

DATA_DIR = ROOT / "data"
UPLOADS = DATA_DIR / "uploads"
LECTURES = DATA_DIR / "lectures"
for _d in (UPLOADS, LECTURES):
    _d.mkdir(parents=True, exist_ok=True)
