import hmac
import os
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse

from courseworks_secretary.web.auth import SESSION_TTL, create_session, verify_password, verify_session
from courseworks_secretary.web.course_guide import build_course_guide
from courseworks_secretary.web.storage import snapshot_store
from courseworks_secretary.web.sync import sync_courseworks
from courseworks_secretary.web.timeline import build_timeline


ROOT = Path(__file__).resolve().parent.parent
SESSION_COOKIE = "courseworks_session"
app = FastAPI(docs_url=None, redoc_url=None, openapi_url=None)


@app.middleware("http")
async def harden_responses(request: Request, call_next):
    response = await call_next(request)
    response.headers["Cache-Control"] = "no-store"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; script-src 'self'; style-src 'self'; "
        "connect-src 'self'; img-src 'self'; frame-ancestors 'none'; "
        "base-uri 'none'; form-action 'self'"
    )
    response.headers["Referrer-Policy"] = "no-referrer"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    return response


@app.get("/")
def home():
    return FileResponse(ROOT / "index.html")


@app.get("/app.css")
def styles():
    return FileResponse(ROOT / "app.css", media_type="text/css")


@app.get("/app.js")
def script():
    return FileResponse(ROOT / "app.js", media_type="text/javascript")


@app.get("/timeline-filters.js")
def timeline_filters_script():
    return FileResponse(ROOT / "timeline-filters.js", media_type="text/javascript")


@app.get("/graded-work.js")
def graded_work_script():
    return FileResponse(ROOT / "graded-work.js", media_type="text/javascript")


@app.get("/calendar-view.js")
def calendar_view_script():
    return FileResponse(ROOT / "calendar-view.js", media_type="text/javascript")


@app.get("/aiken-integration.js")
def aiken_integration_script():
    return FileResponse(ROOT / "aiken-integration.js", media_type="text/javascript")


@app.get("/favicon.svg")
def favicon():
    return FileResponse(ROOT / "favicon.svg", media_type="image/svg+xml")


@app.post("/api/login")
async def login(request: Request):
    configured_hash = os.environ.get("AUTH_PASSWORD_HASH", "")
    session_secret = os.environ.get("SESSION_SECRET", "")
    if not configured_hash or not session_secret:
        raise HTTPException(status_code=503, detail="Authentication is not configured")
    try:
        password = str((await request.json()).get("password", ""))
    except (ValueError, AttributeError):
        password = ""
    if not verify_password(password, configured_hash):
        raise HTTPException(status_code=401, detail="Incorrect password")

    response = JSONResponse({"authenticated": True})
    response.set_cookie(
        SESSION_COOKIE,
        create_session(session_secret),
        max_age=int(SESSION_TTL.total_seconds()),
        httponly=True,
        secure=True,
        samesite="strict",
    )
    return response


@app.post("/api/logout")
def logout():
    response = JSONResponse({"authenticated": False})
    response.delete_cookie(SESSION_COOKIE, path="/")
    return response


@app.get("/api/timeline")
def timeline(request: Request):
    _require_authentication(request)
    snapshot = snapshot_store().load_latest()
    if snapshot is None:
        raise HTTPException(status_code=404, detail="No briefing has been synced yet")
    return build_timeline(snapshot, guide=build_course_guide(snapshot))


@app.get("/api/course-guide")
def course_guide(request: Request):
    _require_authentication(request)
    return build_course_guide(snapshot_store().load_latest())


@app.post("/api/sync")
def sync(request: Request):
    _require_authentication(request)
    try:
        snapshot = sync_courseworks()
        return build_timeline(snapshot, guide=build_course_guide(snapshot))
    except Exception as error:
        raise HTTPException(
            status_code=502,
            detail="CourseWorks sync failed; the last briefing is unchanged",
        ) from error


@app.get("/api/cron")
def cron(request: Request):
    expected = "Bearer " + os.environ.get("CRON_SECRET", "")
    supplied = request.headers.get("authorization", "")
    if expected == "Bearer " or not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")
    try:
        snapshot = sync_courseworks()
        return {"synced": True, "generatedAt": snapshot.get("generated_at")}
    except Exception as error:
        raise HTTPException(status_code=502, detail="CourseWorks sync failed") from error


def _require_authentication(request: Request) -> None:
    secret = os.environ.get("SESSION_SECRET", "")
    token = request.cookies.get(SESSION_COOKIE, "")
    if not secret or not verify_session(token, secret):
        raise HTTPException(status_code=401, detail="Authentication required")
