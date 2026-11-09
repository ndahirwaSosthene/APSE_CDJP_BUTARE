"""APSE Unified FastAPI Backend (v2.0 Architecture + v0.9.1 Full Platform Restoration).

Consolidates portable_boot.py, demo_offline.py, and server.py into a single clean
FastAPI application while preserving 100% of the SQLite/Fernet/HMAC engine,
RBAC rules, sync endpoints, v0.9.1 endpoints, and frontend API contracts.
"""
import argparse
import base64
import hashlib
import json
import os
import secrets
import sys
import webbrowser
from pathlib import Path
from typing import Any, Dict, Optional

from cryptography.fernet import Fernet
from fastapi import FastAPI, Request, Response
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
import uvicorn

BACKEND_DIR = Path(__file__).resolve().parent
ROOT_DIR = BACKEND_DIR.parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from engine import Engine, Fault
from portable import Accounts, LocalSession, atomic, local_units, unlock


SECURITY_HEADERS = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
}


def _json_response(status_code: int, payload: Any) -> Response:
    body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
    return Response(
        content=body,
        status_code=status_code,
        media_type="application/json; charset=utf-8",
        headers=dict(SECURITY_HEADERS),
    )


def _binary_response(
    status_code: int,
    data: bytes,
    mime: str,
    filename: Optional[str] = None,
) -> Response:
    headers = dict(SECURITY_HEADERS)
    if filename:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    return Response(
        content=data,
        status_code=status_code,
        media_type=mime,
        headers=headers,
    )


def create_app(
    data_dir: Optional[str] = None,
    port: int = 8766,
    no_auth: bool = True,
) -> FastAPI:
    folder = Path(data_dir or (ROOT_DIR / "portable_data"))
    folder.mkdir(parents=True, exist_ok=True)
    key_file = folder / "no_auth.key"

    if key_file.exists():
        keys = json.loads(key_file.read_text(encoding="utf-8"))
    else:
        keys = {
            "encryption": Fernet.generate_key().decode("utf-8"),
            "audit": secrets.token_hex(32),
        }
        atomic(key_file, json.dumps(keys).encode("utf-8"))

    accounts = Accounts(str(folder), keys["encryption"])
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
    default_accounts = [
        ("mel_diocese", default_pw, ["APSE_MEL"], ["/LocalRoot01"], "MEL Officer (Diocese)", None),
        ("coord_diocese", default_pw, ["APSE_COORDINATION", "APSE_DIRECTION"], ["/LocalRoot01"], "Diocesan Coordinator", None),
        ("director_diocese", default_pw, ["APSE_DIRECTION"], ["/LocalRoot01"], "Diocesan Director", None),
        ("staff_diocese", default_pw, ["APSE_STAFF"], ["/LocalRoot01"], "CDJP Technical Staff", None),
        ("cpjp_gakoma", default_pw, ["APSE_CPJP"], [par01_path], "CPJP Committee (Gakoma)", "PAR-01"),
        ("cpjp_save", default_pw, ["APSE_CPJP"], [par03_path], "CPJP Committee (Save)", "PAR-03"),
        ("cpjp_butare", default_pw, ["APSE_CPJP"], [par10_path], "CPJP Committee (Cathédrale)", "PAR-10"),
        ("cpjp_kibeho", default_pw, ["APSE_CPJP"], [par24_path], "CPJP Committee (Kibeho)", "PAR-24"),
        ("reporter_gakoma", default_pw, ["APSE_PARISH_REPORTER"], [par01_path], "Parish Reporter (Gakoma)", "PAR-01"),
        ("ccjp_field", default_pw, ["APSE_CCJP"], [par01_path], "CCJP Centrale / CEB Field", "PAR-01"),
    ]
    added_seed_accounts = False
    for uname, upass, uroles, upaths, ufullname, upcode in default_accounts:
        if uname not in accounts.users:
            accounts.add(uname, upass, uroles, upaths, full_name=ufullname, parish_code=upcode, save=False)
            added_seed_accounts = True

    # Ensure the 7 v0.9.0 / v0.9.1 offline test credentials from APSE_v090_TEST_Credentials_PRIVATE.md exist
    v090_accounts = [
        ("mel.theophile", "Apse90#Mel!4826", ["APSE_MEL", "APSE_COMMUNICATION", "APSE_STAFF"], ["/LocalRoot01"], "Théophile Habimana (MEL)", None),
        ("direction.janvier", "Apse90#Dir!7391", ["APSE_DIRECTION"], ["/LocalRoot01"], "Abbé Janvier Nduwayezu (Directeur)", None),
        ("coordination.emmanuel", "Apse90#Coord!6154", ["APSE_COORDINATION", "APSE_REVIEWER", "APSE_STAFF"], ["/LocalRoot01"], "Emmanuel Nsabimana (Coordinateur)", None),
        ("finance.marceline", "Apse90#Fin!2947", ["APSE_FINANCE", "APSE_HR", "APSE_STAFF"], ["/LocalRoot01"], "Marceline Mukandayisenga (Finance/RH)", None),
        ("cooperation.ruth", "Apse90#Tech!8302", ["APSE_STAFF", "APSE_REVIEWER"], ["/LocalRoot01"], "Ruth Kamanzi (Coopération)", None),
        ("driver.emmanuel", "Apse90#Drv!5419", ["APSE_STAFF"], ["/LocalRoot01"], "Emmanuel Uwimana (Logistique)", None),
        ("cpjp.test", "Apse90#Cpjp!6738", ["APSE_CPJP", "APSE_PARISH_REPORTER", "APSE_CCJP", "APSE_CEB"], [par01_path], "Comité CPJP Test (Gakoma)", "PAR-01"),
    ]
    for uname, upass, uroles, upaths, ufullname, upcode in v090_accounts:
        if uname not in accounts.users:
            accounts.add(uname, upass, uroles, upaths, full_name=ufullname, parish_code=upcode, save=False)
            added_seed_accounts = True
    if added_seed_accounts:
        accounts.save()

    units = local_units()
    instance_id = hashlib.sha256(keys["encryption"].encode("utf-8")).hexdigest()[:12]
    sessions = LocalSession(accounts, units, instance_id, no_auth=no_auth)
    engine = Engine(
        str(folder / "apse.sqlite"),
        keys["encryption"].encode("utf-8"),
        keys["audit"].encode("utf-8"),
    )
    engine.accounts = accounts

    app = FastAPI(title="CDJP Butare APSE Service", version="0.9.1")
    app.state.engine = engine
    app.state.sessions = sessions
    app.state.accounts = accounts
    app.state.units = units
    app.state.data_dir = str(folder)
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
        forwarded_host = request.headers.get("X-Forwarded-Host", "").split(",")[0].strip()
        if forwarded_host:
            allowed_origins.add("http://" + forwarded_host)
            allowed_origins.add("https://" + forwarded_host)
        env_origins = os.environ.get("APSE_ALLOWED_ORIGINS", "")
        if env_origins:
            for o in env_origins.split(","):
                clean = o.strip().rstrip("/")
                if clean:
                    allowed_origins.add(clean)
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
        if not u.get("authenticated"):
            u["units"] = [
                x
                for x in units
                if any(x["path"] == p or x["path"].startswith(p + "/") for p in u["paths"])
            ]
        return engine._resolve_v1_user(u)

    def _resolve_unit(user: Dict[str, Any], unit_id: Optional[str] = None):
        user_units = user.get("units") or units
        if unit_id:
            found = next((u for u in user_units if u["id"] == unit_id or u.get("sourceCode") == unit_id), None)
            if found:
                return found["id"], found["path"]
        first = user_units[0] if user_units else {"id": "LocalRoot01", "path": "/LocalRoot01"}
        return first["id"], first["path"]

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
        return _json_response(200, {"status": "up", "version": "0.9.1"})

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
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
    ):
        try:
            user = sessions.identity(dict(request.headers))
            if not user.get("authenticated"):
                user["units"] = [
                    x
                    for x in units
                    if any(x["path"] == p or x["path"].startswith(p + "/") for p in u_paths(user))
                ]
            data = engine.v1_bootstrap(user, parish, period, axis, date_from, date_to)
            return _json_response(200, data)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    def u_paths(user):
        return user.get("paths", ["/LocalRoot01"])

    @app.post("/apse-service/v1/persona")
    @app.post("/api/v1/persona")
    async def post_v1_persona(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            sessions.logout(dict(request.headers))
            user = _current_user(request)
            res = engine.v1_set_persona(user, body)
            resp = _json_response(200, res)
            resp.delete_cookie("apse_local", path="/")
            return resp
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
                        else "Invalid username or password",
                    },
                )
            engine._v1_persona_key = name
            persona_result = None
            try:
                user = _current_user(request)
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
    async def post_web_logout(request: Request):
        sessions.logout(dict(request.headers))
        engine._v1_persona_key = "mel_diocese"
        resp = _json_response(200, {"ok": True})
        resp.delete_cookie("apse_local", path="/")
        return resp

    @app.get("/apse-service/v1/accounts")
    @app.get("/api/v1/accounts")
    async def get_v1_accounts(request: Request):
        try:
            user = _current_user(request)
            overview = engine.v091_mel_admin_overview(
                user, limit=25, offset=0, accounts=accounts, data_dir=app.state.data_dir
            )
            return _json_response(200, {
                "accounts": overview.get("local_accounts", []),
                "personas": engine._all_v1_profiles(),
            })
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/accounts")
    @app.post("/api/v1/accounts")
    async def post_v1_accounts(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            if not body.get("action"):
                body["action"] = "CREATE_LOCAL_ACCOUNT"
            res = engine.v091_mel_admin_action(user, body, accounts=accounts)
            return _json_response(200, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

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

    @app.get("/apse-service/v1/system/migrations")
    @app.get("/api/v1/system/migrations")
    async def get_v1_migrations():
        import migrations
        return _json_response(200, migrations.status(engine.db))

    @app.get("/apse-service/v1/sync/status")
    @app.get("/api/v1/sync/status")
    async def get_v1_sync_status(request: Request):
        try:
            user = _current_user(request)
            return _json_response(200, engine.sync_status(user))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/sync/configure")
    @app.post("/api/v1/sync/configure")
    async def post_v1_sync_configure(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.sync_configure(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/sync/run")
    @app.post("/api/v1/sync/run")
    async def post_v1_sync_run(request: Request):
        try:
            await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.sync_run(user))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/v1/sync/receive")
    @app.post("/api/v1/sync/receive")
    async def post_v1_sync_receive(request: Request):
        try:
            token = request.headers.get("X-APSE-Sync-Token", "")
            raw = await request.body()
            body = json.loads(raw.decode("utf-8")) if raw else {}
            return _json_response(200, engine.sync_receive(token, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/v1/sync/changes")
    @app.get("/api/v1/sync/changes")
    async def get_v1_sync_changes(
        request: Request,
        since: int = 0,
        node: str = "",
        schema_version: Optional[int] = None,
    ):
        try:
            token = request.headers.get("X-APSE-Sync-Token", "")
            return _json_response(
                200, engine.sync_changes(token, since, node, schema_version)
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    # =========================================================================
    # ORIGINAL PLATFORM & v0.9.1 ENDPOINTS (/apse-service/... & /api/...)
    # =========================================================================

    @app.get("/apse-service/config")
    @app.get("/api/config")
    async def get_config(request: Request):
        try:
            user = _current_user(request)
            cfg = engine.configuration()
            cfg["user"] = user
            cfg["roleWorkspaces"] = engine.v091_role_workspaces()
            return _json_response(200, cfg)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/records")
    @app.get("/api/records")
    async def get_records(
        request: Request,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        form: Optional[str] = None,
        unit: Optional[str] = None,
        approved: bool = False,
    ):
        try:
            user = _current_user(request)
            rows = engine.listing(user, start, end, form=form or None, unit=unit or None, approved=approved)
            return _json_response(200, {"records": rows})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/records/{record_id}")
    @app.get("/api/records/{record_id}")
    async def get_record_by_id(request: Request, record_id: str):
        try:
            user = _current_user(request)
            return _json_response(200, engine.get(user, record_id))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/records")
    @app.post("/api/records")
    async def post_create_record(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            uid, upath = _resolve_unit(user, body.get("unit"))
            key = str(body.get("requestKey") or ("req-" + uuid.uuid4().hex[:24]))
            event_date = str(body.get("event_date") or "2026-10-25")
            created = engine.create(
                user,
                str(body.get("form") or "F07"),
                uid,
                upath,
                event_date,
                body.get("values") or {},
                key,
            )
            return _json_response(201, created)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.put("/apse-service/records/{record_id}")
    @app.post("/apse-service/records/{record_id}/edit")
    @app.put("/api/records/{record_id}")
    @app.post("/api/records/{record_id}/edit")
    async def put_edit_record(request: Request, record_id: str):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            updated = engine.edit(
                user,
                record_id,
                int(body.get("revision") or 1),
                body.get("values") or {},
                str(body.get("event_date") or "2026-10-25"),
            )
            return _json_response(200, updated)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/records/{record_id}/transition")
    @app.post("/api/records/{record_id}/transition")
    async def post_transition_record(request: Request, record_id: str):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            res = engine.transition(
                user,
                record_id,
                int(body.get("revision") or 1),
                str(body.get("target") or "SUBMITTED"),
                str(body.get("reason") or ""),
            )
            return _json_response(200, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/records/{record_id}/amend")
    @app.post("/api/records/{record_id}/amend")
    async def post_amend_record(request: Request, record_id: str):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            res = engine.amend(user, record_id, str(body.get("reason") or ""))
            return _json_response(201, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/records/{record_id}/close")
    @app.post("/api/records/{record_id}/close")
    async def post_close_record_action(request: Request, record_id: str):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            res = engine.close_action(user, record_id, body)
            return _json_response(200, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/records/{record_id}/evidence")
    @app.post("/api/records/{record_id}/evidence")
    async def post_record_evidence(request: Request, record_id: str):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            mime = str(body.get("mime") or "application/pdf")
            raw_b64 = str(body.get("data_base64") or "")
            data = base64.b64decode(raw_b64) if raw_b64 else b"%PDF-1.4 APSE Evidence"
            res = engine.add_evidence(user, record_id, mime, data)
            return _json_response(201, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/evidence/{evidence_id}")
    @app.get("/api/evidence/{evidence_id}")
    async def get_record_evidence(request: Request, evidence_id: str):
        try:
            user = _current_user(request)
            mime, data = engine.evidence(user, evidence_id)
            return _binary_response(200, data, mime, f"evidence_{evidence_id}")
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/working-drafts")
    @app.get("/api/working-drafts")
    async def get_working_drafts(request: Request, status: str = "ACTIVE"):
        try:
            user = _current_user(request)
            return _json_response(200, {"drafts": engine.draft_listing(user, status)})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/working-drafts")
    @app.post("/api/working-drafts")
    async def post_working_drafts(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            uid, upath = _resolve_unit(user, body.get("unit"))
            if not body.get("id"):
                body["id"] = str(uuid.uuid4())
            return _json_response(200, engine.save_working_draft(user, body, uid, upath))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/working-drafts/action")
    @app.post("/api/working-drafts/action")
    async def post_working_draft_action(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(
                200,
                engine.draft_action(
                    user,
                    str(body.get("id") or ""),
                    int(body.get("revision") or 1),
                    str(body.get("action") or "TRASH"),
                ),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/recycle")
    @app.get("/api/recycle")
    async def get_recycle_bin(request: Request):
        try:
            user = _current_user(request)
            return _json_response(200, {"records": engine.recycle_listing(user)})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/recycle")
    @app.post("/api/recycle")
    async def post_recycle_bin(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(
                200,
                engine.recycle_record(
                    user,
                    str(body.get("id") or ""),
                    int(body.get("revision") or 1),
                    bool(body.get("restore", False)),
                    str(body.get("reason") or ""),
                ),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/planning")
    @app.get("/api/planning")
    async def get_planning_catalog(
        request: Request,
        ap: str = "AP1",
        audience: str = "STAFF",
    ):
        try:
            user = _current_user(request)
            return _json_response(200, engine.planning(user, ap, audience))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/metadata")
    @app.get("/api/metadata")
    async def get_metadata(request: Request):
        try:
            _current_user(request)
            return _json_response(200, engine.metadata())
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/metadata")
    @app.post("/api/metadata")
    async def post_metadata(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            res = engine.put_metadata(
                user,
                str(body.get("category") or ""),
                body.get("entry") or {},
                int(body.get("version") or 0),
                str(body.get("reason") or ""),
            )
            return _json_response(200, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/feedback")
    @app.get("/api/feedback")
    async def get_feedback(request: Request, record: str = ""):
        try:
            user = _current_user(request)
            return _json_response(200, {"feedback": engine.feedback_thread(user, record)})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/feedback")
    @app.post("/api/feedback")
    async def post_feedback(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            res = engine.add_feedback(
                user,
                str(body.get("record") or ""),
                str(body.get("text") or ""),
                str(body.get("recipient") or "AUTHOR"),
                body.get("parent"),
            )
            return _json_response(201, {"feedback": res})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/inbox")
    @app.get("/api/inbox")
    async def get_feedback_inbox(request: Request):
        try:
            user = _current_user(request)
            return _json_response(200, {"inbox": engine.feedback_inbox(user)})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/assistant")
    @app.post("/api/assistant")
    async def post_assistant(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.v091_assistant_and_controls(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/strategy")
    @app.get("/api/strategy")
    async def get_strategy_dashboard(
        request: Request,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        ap: Optional[str] = None,
        axis: Optional[str] = None,
        intervention: Optional[str] = None,
    ):
        try:
            user = _current_user(request)
            return _json_response(
                200,
                engine.strategy_dashboard(user, start, end, ap or None, axis or None, intervention or None),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/portfolio")
    @app.get("/api/portfolio")
    async def get_portfolio_dashboard(
        request: Request,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        project: Optional[str] = None,
        work_type: Optional[str] = None,
        partner: Optional[str] = None,
    ):
        try:
            user = _current_user(request)
            return _json_response(
                200,
                engine.portfolio_dashboard(user, start, end, project or None, work_type or None, partner or None),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/staff-performance")
    @app.get("/api/staff-performance")
    async def get_staff_performance(
        request: Request,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        level: str = "F05",
    ):
        try:
            user = _current_user(request)
            return _json_response(200, engine.staff_performance(user, start, end, level))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/collections")
    @app.get("/api/collections")
    async def get_collections(request: Request):
        try:
            _current_user(request)
            return _json_response(200, {"collections": engine.collection_schemas()})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/collections")
    @app.post("/api/collections")
    async def post_collections(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(201, engine.publish_collection(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/collections/status")
    @app.post("/api/collections/status")
    async def post_collection_status(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(
                200,
                engine.set_collection_active(user, str(body.get("code") or ""), bool(body.get("active", True))),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/edit-permissions")
    @app.post("/api/edit-permissions")
    async def post_grant_edit(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(
                201,
                engine.grant_edit(
                    user,
                    str(body.get("record") or ""),
                    str(body.get("grantee") or ""),
                    int(body.get("revision") or 1),
                    int(body.get("hours") or 24),
                    str(body.get("reason") or ""),
                ),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/edit-permissions/revoke")
    @app.post("/api/edit-permissions/revoke")
    async def post_revoke_edit(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.revoke_edit(user, str(body.get("id") or "")))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/dashboard")
    @app.get("/api/dashboard")
    async def get_ps_dashboard(
        request: Request,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
    ):
        try:
            user = _current_user(request)
            return _json_response(200, engine.dashboard(user, start, end))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/alerts")
    @app.get("/api/alerts")
    async def get_alerts(request: Request):
        try:
            user = _current_user(request)
            return _json_response(200, {"alerts": engine.alerts(user)})
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/alerts/{alert_id}/acknowledge")
    @app.post("/api/alerts/{alert_id}/acknowledge")
    async def post_ack_alert(request: Request, alert_id: str):
        try:
            await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.acknowledge_alert(user, alert_id))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/results-report")
    @app.post("/api/results-report")
    async def post_results_report_preview(request: Request):
        try:
            import rbm
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            start = str(body.get("start") or "2026-09-01")
            end = str(body.get("end") or "2027-08-31")
            lang = str(body.get("language") or "fr")
            unit = body.get("unit") or None
            rows = engine.results_report_rows(user, start, end, unit)
            data = rbm.model(rows, engine.configuration(), start, end, lang, body.get("narrative"))
            return _json_response(200, data)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/report")
    @app.get("/api/report")
    async def get_generated_report(
        request: Request,
        code: str = "R01",
        format: str = "docx",
        language: str = "fr",
        start: str = "2026-09-01",
        end: str = "2027-08-31",
        unit: Optional[str] = None,
    ):
        try:
            import reports
            user = _current_user(request)
            rows = engine.results_report_rows(user, start, end, unit) if code == "R13" else engine.listing(user, start, end, unit=unit, approved=True)
            data, mime = reports.generate(rows, code, language, format, start, end, engine.configuration())
            return _binary_response(200, data, mime, f"APSE_{code}_{language}.{format}")
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/report/freeze")
    @app.post("/api/report/freeze")
    async def post_freeze_report(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            uid, upath = _resolve_unit(user, body.get("unit"))
            res = engine.freeze_report(
                user,
                uid,
                upath,
                str(body.get("code") or "R13"),
                str(body.get("language") or "fr"),
                str(body.get("format") or "docx"),
                str(body.get("start") or "2026-09-01"),
                str(body.get("end") or "2027-08-31"),
                body.get("narrative"),
            )
            return _json_response(201, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/snapshots/{snapshot_id}")
    @app.get("/api/snapshots/{snapshot_id}")
    async def get_frozen_snapshot(request: Request, snapshot_id: str):
        try:
            user = _current_user(request)
            snap = engine.report_snapshot(user, snapshot_id)
            return _binary_response(200, snap["data"], snap["mime"], f"snapshot_{snapshot_id}.{snap['format']}")
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/export/template")
    @app.get("/api/export/template")
    async def get_export_template(
        request: Request,
        form: str = "F07",
        format: str = "xlsx",
        language: str = "fr",
    ):
        try:
            user = _current_user(request)
            data, mime = engine.export_transfer(
                user, form, "2026-09-01", "2031-08-31", None, format, False, True, language, template=True
            )
            return _binary_response(200, data, mime, f"APSE_Template_{form}.{format}")
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/export/data")
    @app.get("/api/export/data")
    async def get_export_data(
        request: Request,
        form: Optional[str] = None,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        unit: Optional[str] = None,
        format: str = "xlsx",
        include_sensitive: bool = False,
        approved: bool = True,
        language: str = "fr",
    ):
        try:
            user = _current_user(request)
            data, mime = engine.export_transfer(
                user, form or None, start, end, unit or None, format, include_sensitive, approved, language, template=False
            )
            return _binary_response(200, data, mime, f"APSE_Data_{form or 'ALL'}.{format}")
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/import/preview")
    @app.post("/api/import/preview")
    async def post_import_preview(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            uid, upath = _resolve_unit(user, body.get("unit"))
            raw = base64.b64decode(body["data_base64"]) if body.get("data_base64") else str(body.get("text") or "").encode("utf-8")
            res = engine.prepare_transfer(
                user,
                str(body.get("form") or "F07"),
                uid,
                upath,
                raw,
                str(body.get("format") or "csv"),
                body.get("mapping"),
            )
            return _json_response(200, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/import/commit")
    @app.post("/api/import/commit")
    async def post_import_commit(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            uid, upath = _resolve_unit(user, body.get("unit"))
            raw = base64.b64decode(body["data_base64"]) if body.get("data_base64") else str(body.get("text") or "").encode("utf-8")
            res = engine.import_transfer(
                user,
                str(body.get("form") or "F07"),
                uid,
                upath,
                raw,
                str(body.get("format") or "csv"),
                body.get("mapping"),
            )
            return _json_response(200, res)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/document-import/preview")
    @app.post("/api/document-import/preview")
    async def post_document_import_preview(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.v091_document_import_preview(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/timesheets")
    @app.get("/api/timesheets")
    async def get_timesheets(
        request: Request,
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        owner: Optional[str] = None,
        include_drafts: bool = False,
    ):
        try:
            user = _current_user(request)
            return _json_response(200, engine.v091_timesheets_list(user, start, end, owner, include_drafts))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/timesheets")
    @app.post("/api/timesheets")
    async def post_timesheets(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(201, engine.v091_timesheets_save(user, body))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/timesheets/export")
    @app.get("/api/timesheets/export")
    async def get_timesheets_export(
        request: Request,
        format: str = "xlsx",
        start: str = "2026-09-01",
        end: str = "2031-08-31",
        owner: Optional[str] = None,
        include_drafts: bool = False,
        language: str = "fr",
    ):
        try:
            user = _current_user(request)
            data, mime, fname = engine.v091_timesheets_export(user, format, start, end, owner, include_drafts, language)
            return _binary_response(200, data, mime, fname)
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/mel-admin")
    @app.get("/api/mel-admin")
    async def get_mel_admin(
        request: Request,
        limit: int = 50,
        offset: int = 0,
        actor: Optional[str] = None,
        action: Optional[str] = None,
    ):
        try:
            user = _current_user(request)
            return _json_response(
                200,
                engine.v091_mel_admin_overview(
                    user, limit, offset, actor, action, accounts=accounts, data_dir=app.state.data_dir
                ),
            )
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.post("/apse-service/mel-admin/action")
    @app.post("/api/mel-admin/action")
    async def post_mel_admin_action(request: Request):
        try:
            body = await _check_csrf_and_parse_json(request)
            user = _current_user(request)
            return _json_response(200, engine.v091_mel_admin_action(user, body, accounts=accounts))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    @app.get("/apse-service/contacts")
    @app.get("/api/contacts")
    async def get_contacts_and_structure(request: Request):
        try:
            user = _current_user(request)
            return _json_response(200, engine.v091_contacts_and_structure(user))
        except Fault as e:
            return _json_response(e.status, {"error": e.code, "details": e.details})

    # Static Frontend Routes
    frontend_dir = ROOT_DIR / "frontend"

    @app.get("/", include_in_schema=False)
    async def root_redirect():
        return RedirectResponse(url="/api/apps/apse/operations.html", status_code=303)

    @app.get("/index.html", include_in_schema=False)
    @app.get("/operations", include_in_schema=False)
    @app.get("/operations.html", include_in_schema=False)
    @app.get("/api/apps/apse/operations", include_in_schema=False)
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

    @app.get("/assets/figma/{filename}", include_in_schema=False)
    @app.get("/api/apps/apse/assets/figma/{filename}", include_in_schema=False)
    async def serve_figma_asset(filename: str):
        safe_name = Path(filename).name
        target = frontend_dir / "assets" / "figma" / safe_name
        if not target.exists():
            return _json_response(404, {"error": "not_found"})
        media_type = "image/svg+xml; charset=utf-8" if safe_name.endswith(".svg") else "image/png"
        return FileResponse(
            target,
            media_type=media_type,
            headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
        )

    @app.get("/core.js", include_in_schema=False)
    async def serve_root_core_js():
        return await serve_js("core.js")

    @app.get("/vault.js", include_in_schema=False)
    async def serve_root_vault_js():
        return await serve_js("vault.js")

    @app.get("/v091_views.js", include_in_schema=False)
    async def serve_root_v091_js():
        return await serve_js("v091_views.js")

    @app.get("/v1.js", include_in_schema=False)
    @app.get("/app.js", include_in_schema=False)
    async def serve_root_v1_js():
        return await serve_js("v1.js")

    @app.get("/js/{filename}", include_in_schema=False)
    @app.get("/api/apps/apse/{filename}", include_in_schema=False)
    async def serve_js(filename: str):
        mapping = {
            "core.js": frontend_dir / "js" / "core.js",
            "vault.js": frontend_dir / "js" / "vault.js",
            "i18n.js": frontend_dir / "js" / "i18n.js",
            "v1.js": frontend_dir / "js" / "app.js",
            "app.js": frontend_dir / "js" / "app.js",
            "v091_views.js": frontend_dir / "js" / "v091_views.js",
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


def main():
    parser = argparse.ArgumentParser(description="CDJP Butare APSE Unified Server")
    parser.add_argument("--data", default=str(ROOT_DIR / "portable_data"))
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8766)
    parser.add_argument("--no-browser", action="store_true")
    parser.add_argument("--no-auth", action="store_true", default=True)
    parser.add_argument("--require-cli-vault", action="store_true")
    args = parser.parse_args()

    if args.require_cli_vault:
        args.no_auth = False

    app = create_app(data_dir=args.data, port=args.port, no_auth=args.no_auth)
    url = f"http://{args.host}:{args.port}/"
    print(f"APSE LOCAL — {url}", flush=True)
    if not args.no_browser:
        webbrowser.open(url)
    uvicorn.run(app, host=args.host, port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
