#!/usr/bin/env python3
"""APSE v2 Application Launcher — FastAPI + Uvicorn Server."""
from __future__ import annotations
from pathlib import Path
import argparse
import threading
import webbrowser
import uvicorn

from backend.config import DATA_DIR, DEFAULT_HOST, DEFAULT_PORT
from backend.main import create_app


def main() -> int:
    parser = argparse.ArgumentParser(
        description="APSE v2 — CDJP Butare Strategic Planning & MEL Platform"
    )
    parser.add_argument(
        "--host",
        default=DEFAULT_HOST,
        help="Bind host (0.0.0.0 for LAN/mobile access)",
    )
    parser.add_argument(
        "--port", type=int, default=DEFAULT_PORT, help="Bind port (default: 8765)"
    )
    parser.add_argument(
        "--data",
        default=str(DATA_DIR / "runtime_store"),
        help="Data directory for SQLite WAL & Fernet key",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Do not auto-open browser on startup",
    )
    parser.add_argument(
        "--no-auth",
        action="store_true",
        default=True,
        help="Start directly in Web GUI mode without CLI passphrase prompt",
    )
    parser.add_argument(
        "--migrate-status",
        action="store_true",
        help="Print current database schema migration version and exit",
    )
    args = parser.parse_args()

    data_dir = Path(args.data)
    data_dir.mkdir(parents=True, exist_ok=True)

    app = create_app(data_dir=data_dir, port=args.port, no_auth=args.no_auth)
    if args.migrate_status:
        import json
        from backend import migrations
        print(json.dumps(migrations.status(app.state.engine.db), indent=2))
        return 0
    url = f"http://127.0.0.1:{args.port}/"
    print(f"APSE LOCAL — {url}", flush=True)

    if not args.no_browser:
        threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
