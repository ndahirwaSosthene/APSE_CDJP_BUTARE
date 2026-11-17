"""Unified Catalog Loader for APSE v2 (reads data/catalog.json)."""
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
_CACHE = None

def get_catalog():
    global _CACHE
    if _CACHE is None:
        custom_data_dir = os.environ.get("APSE_DATA_DIR")
        custom_catalog = Path(custom_data_dir) / "catalog.json" if custom_data_dir else None
        if custom_catalog and custom_catalog.exists():
            target_path = custom_catalog
        else:
            default_path = ROOT / "data" / "catalog.json"
            if default_path.exists():
                target_path = default_path
            else:
                target_path = ROOT / "catalog.json"
        _CACHE = json.loads(target_path.read_text(encoding="utf-8"))
    return _CACHE
