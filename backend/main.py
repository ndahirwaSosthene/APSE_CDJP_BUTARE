"""APSE v2 FastAPI Application — CDJP Butare Strategic Planning & MEL Platform."""
from __future__ import annotations
from pathlib import Path
from typing import Any, Dict, Optional
import hashlib
import json
import secrets
import sys

from cryptography.fernet import Fernet
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from pydantic import BaseModel

ROOT_DIR = Path(__file__).resolve().parents[1]
if str(ROOT_DIR / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT_DIR / "backend"))

from engine import Engine, Fault, TODAY
from portable import Accounts, LocalSession, atomic, local_units
from reports import generate
import rbm
import periods


class WebLoginRequest(BaseModel):
    username: str
    password: str


def _json_response(status: int, payload: Any, filename: Optional[str] = None) -> Response:
    raw = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
    }
    if filename:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return Response(
        content=raw,
        status_code=status,
        media_type="application/json; charset=utf-8",
        headers=headers,
    )


def _binary_response(
    status: int, data: bytes, mime: str, filename: Optional[str] = None
) -> Response:
    if (mime.startswith("text/") or mime == "application/json") and "charset=" not in mime:
        mime += "; charset=utf-8"
    headers = {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
    }
    if filename:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return Response(content=data, status_code=status, media_type=mime, headers=headers)


def create_app(data_dir: Optional[Path] = None, port: int = 8765, no_auth: bool = True) -> FastAPI:
    app = FastAPI(
        title="APSE v2 — CDJP Butare Strategic Planning & MEL Platform",
        version="2.0.0",
        docs_url="/api/docs",
    )

    folder = Path(data_dir or (ROOT_DIR / "data" / "runtime_store"))
    folder.mkdir(parents=True, exist_ok=True)
    key_file = folder / "no_auth.key"
    if key_file.exists():
        keys = json.loads(key_file.read_text(encoding="utf-8"))
    else:
        keys = {
            "encryption": Fernet.generate_key().decode("ascii"),
            "audit": secrets.token_hex(32),
        }
        atomic(key_file, json.dumps(keys).encode("utf-8"))

    accounts = Accounts(folder, keys["encryption"])
    if not accounts.path.exists():
        atomic(accounts.path, accounts.crypto.encrypt(b"{}"))

    # Seed default Web GUI accounts if none exist yet
    if not accounts.users:
        units_seed = local_units()
        par01_path = next(
            (u["path"] for u in units_seed if u.get("sourceCode") == "PAR-01"),
            "/LocalRoot01",
        )
        par03_path = next(
            (u["path"] for u in units_seed if u.get("sourceCode") == "PAR-03"),
            "/LocalRoot01",
        )
        par10_path = next(
            (u["path"] for u in units_seed if u.get("sourceCode") == "PAR-10"),
            "/LocalRoot01",
        )
        par24_path = next(
            (u["path"] for u in units_seed if u.get("sourceCode") == "PAR-24"),
            "/LocalRoot01",
        )
        default_pw = "apse2026_butare"
        accounts.add("mel_diocese", default_pw, ["APSE_MEL"], ["/LocalRoot01"])
        accounts.add(
            "coord_diocese",
            default_pw,
            ["APSE_COORDINATION", "APSE_DIRECTION"],
            ["/LocalRoot01"],
        )
        accounts.add("cpjp_gakoma", default_pw, ["APSE_CPJP"], [par01_path])
        accounts.add("cpjp_save", default_pw, ["APSE_CPJP"], [par03_path])
        accounts.add("cpjp_butare", default_pw, ["APSE_CPJP"], [par10_path])
        accounts.add("cpjp_kibeho", default_pw, ["APSE_CPJP"], [par24_path])
        accounts.add("ccjp_field", default_pw, ["APSE_CCJP"], [par01_path])

    units = local_units()
    instance_id = hashlib.sha256(keys["encryption"].encode("utf-8")).hexdigest()[:12]
    sessions = LocalSession(accounts, units, instance_id, no_auth=no_auth)
    engine = Engine(
        str(folder / "apse.sqlite"),
        keys["encryption"].encode("utf-8"),
        keys["audit"].encode("utf-8"),
    )

    app.state.engine = engine
    app.state.sessions = sessions
    app.state.accounts = accounts
    app.state.units = units
    app.state.public_origin = f"http://127.0.0.1:{port}"

    async def _check_csrf_and_parse_json(request: Request) -> Dict[str, Any]:
        if request.headers.get("X-APSE-Client") != "web":
            raise Fault(403, "client_header_required")
        origin = (request.headers.get("Origin") or "").rstrip("/")
        host = request.headers.get("Host", "")
        allowed_origins = {app.state.public_origin}
        if host:
            allowed_origins.add("http://" + host)
            allowed_origins.add("https://" + host)
        if not origin or origin not in allowed_origins:
            raise Fault(403, "origin_denied")
        if not request.headers.get("Content-Type", "").startswith("application/json"):
            raise Fault(415, "json_required")
        raw = await request.body()
        if len(raw) > 15 * 1024 * 1024:
            raise Fault(413, "body_limit")
        try:
            body = json.loads(raw.decode("utf-8")) if raw else {}
        except ValueError:
            raise Fault(400, "invalid_json")
        if not isinstance(body, dict):
            raise Fault(400, "object_required")
        return body

    def _current_user(request: Request) -> Dict[str, Any]:
        u = sessions.identity(dict(request.headers))
        u["units"] = [
            x
            for x in units
            if any(x["path"] == p or x["path"].startswith(p + "/") for p in u["paths"])
        ]
        return u

    @app.api_route(
        "/apse-service/{rest_of_path:path}",
        methods=["OPTIONS"],
        include_in_schema=False,
    )
    async def handle_options(rest_of_path: str):
        return _json_response(405, {"error": "cors_disabled"})

    @app.get("/apse-service/health")
    @app.get("/api/health")
    async def get_health():
        return _json_response(200, {"status": "up", "version": "2.0.0"})

    @app.get("/apse-service/audit")
    @app.get("/api/audit")
    async def get_audit(request: Request):
        try:
            user = _current_user(request)
            if not set(user["roles"]) & {"APSE_DIRECTION", "APSE_AUDITOR"}:
                raise Fault(403, "auditor_required")
            return _json_response(200, engine.verify_audit())
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/v1/bootstrap")
    @app.get("/api/v1/bootstrap")
    async def get_v1_bootstrap(
        request: Request,
        parish: Optional[str] = None,
        period: Optional[str] = None,
        axis: Optional[str] = None,
    ):
        try:
            user = _current_user(request)
            data = engine.v1_bootstrap(user, parish, period, axis)
            return _json_response(200, data)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/persona")
    @app.post("/api/v1/persona")
    async def post_v1_persona(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.v1_set_persona(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/auth/login")
    @app.post("/api/v1/auth/login")
    @app.post("/local/login")
    async def post_web_login(request: Request):
        try:
            raw = await request.body()
            body = json.loads(raw.decode("utf-8")) if raw else {}
            name = str(body.get("username") or "").strip()
            password = str(body.get("password") or "")
            token, status = sessions.login(name, password)
            if not token:
                return _json_response(
                    status,
                    {
                        "ok": False,
                        "error": "rate_limited" if status == 429 else "login_failed",
                        "details": "Too many failed attempts (5 max/min)"
                        if status == 429
                        else "Invalid username or password (default: apse2026_butare)",
                    },
                )
            user = _current_user(request)
            persona_result = None
            try:
                persona_result = engine.v1_set_persona(user, {"persona_key": name})
            except Exception:
                pass
            resp = _json_response(
                200,
                {
                    "ok": True,
                    "username": name,
                    "persona": persona_result,
                },
            )
            resp.set_cookie(
                key="apse_local",
                value=token,
                httponly=True,
                samesite="strict",
                max_age=28800,
                path="/",
            )
            return resp
        except Exception:
            return _json_response(400, {"ok": False, "error": "invalid_login"})

    @app.post("/apse-service/v1/auth/logout")
    @app.post("/api/v1/auth/logout")
    @app.post("/local/logout")
    async def post_web_logout():
        resp = _json_response(200, {"ok": True})
        resp.delete_cookie("apse_local", path="/")
        return resp

    @app.post("/apse-service/v1/tasks")
    @app.post("/api/v1/tasks")
    async def post_v1_tasks(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(201, engine.v1_create_task(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/logs")
    @app.post("/api/v1/logs")
    async def post_v1_logs(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(201, engine.v1_submit_log(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/review")
    @app.post("/api/v1/review")
    async def post_v1_review(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.v1_review_log(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/v1/export")
    @app.get("/api/v1/export")
    async def get_v1_export(
        request: Request,
        type: str = "impact_summary",
        format: str = "csv",
        preset: str = "natural",
        language: str = "en",
        parish: Optional[str] = None,
    ):
        try:
            user = _current_user(request)
            data, mime, fname = engine.v1_export(
                user, type, format, preset, language, parish
            )
            return _binary_response(200, data, mime, fname)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/import")
    @app.post("/api/v1/import")
    async def post_v1_import(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.v1_import_csv(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    # Static Frontend Routes
    frontend_dir = ROOT_DIR / "frontend"

    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/api/apps/apse/operations.html", status_code=303)

    @app.get("/index.html", include_in_schema=False)
    @app.get("/operations.html", include_in_schema=False)
    @app.get("/api/apps/apse/operations.html", include_in_schema=False)
    async def serve_html():
        return FileResponse(
            frontend_dir / "index.html",
            media_type="text/html; charset=utf-8",
            headers={
                "Cache-Control": "no-store",
                "X-Content-Type-Options": "nosniff",
                "Referrer-Policy": "no-referrer",
            },
        )

    @app.get("/styles/main.css", include_in_schema=False)
    @app.get("/v1.css", include_in_schema=False)
    @app.get("/api/apps/apse/v1.css", include_in_schema=False)
    async def serve_css():
        return FileResponse(
            frontend_dir / "styles" / "main.css",
            media_type="text/css; charset=utf-8",
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )

    @app.get("/js/{filename}", include_in_schema=False)
    @app.get("/api/apps/apse/{filename}", include_in_schema=False)
    async def serve_js(filename: str):
        mapping = {
            "core.js": frontend_dir / "js" / "core.js",
            "vault.js": frontend_dir / "js" / "vault.js",
            "i18n.js": frontend_dir / "js" / "i18n.js",
            "v1.js": frontend_dir / "js" / "app.js",
            "app.js": frontend_dir / "js" / "app.js",
        }
        target = mapping.get(filename)
        if not target or not target.exists():
            return _json_response(404, {"error": "not_found"})
        return FileResponse(
            target,
            media_type="application/javascript; charset=utf-8",
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )

    return app
