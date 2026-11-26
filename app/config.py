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
# Temporary gate for a public deploy until accounts exist. Empty = no gate (local dev).
ACCESS_CODE = os.environ.get("ACCESS_CODE", "").strip()

# Set DATA_DIR to a persistent volume in production (Fly mounts one at /data).
DATA_DIR = Path(os.environ.get("DATA_DIR") or ROOT / "data")
# The built React app (cd web && npm run build). The Docker image builds it; in development Vite serves it.
FRONTEND_DIR = Path(os.environ.get("FRONTEND_DIR") or ROOT / "web" / "dist")
UPLOADS = DATA_DIR / "uploads"
LECTURES = DATA_DIR / "lectures"
for _d in (UPLOADS, LECTURES):
    _d.mkdir(parents=True, exist_ok=True)


def write_atomic(path: Path, data: bytes | str) -> None:
    """Write to a temp file, then rename, so readers never see a half-written file."""
    tmp = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    tmp.write_bytes(data.encode("utf-8") if isinstance(data, str) else data)
    os.replace(tmp, path)
