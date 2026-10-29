"""Unified Catalog Loader for APSE v2 (reads data/catalog.json)."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOG_PATH = ROOT / "data" / "catalog.json"
_CACHE = None

def get_catalog():
    global _CACHE
    if _CACHE is None:
        _CACHE = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    return _CACHE
