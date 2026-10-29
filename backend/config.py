"""Configuration and paths for the APSE v2 FastAPI backend."""
from pathlib import Path
import os

ROOT_DIR = Path(__file__).resolve().parent.parent
DATA_DIR = Path(os.environ.get("APSE_DATA_DIR", str(ROOT_DIR / "data")))
CATALOG_PATH = DATA_DIR / "catalog.json"
FRONTEND_DIR = ROOT_DIR / "frontend"
DEFAULT_DB_PATH = DATA_DIR / "apse.sqlite"

DEFAULT_HOST = os.environ.get("APSE_HOST", "0.0.0.0")
DEFAULT_PORT = int(os.environ.get("APSE_PORT", "8765"))

