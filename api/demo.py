"""Demo endpoints are deliberately independent of private account storage."""

from pathlib import Path

from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse

from courseworks_secretary.web.demo import demo_data
from courseworks_secretary.web.timeline import build_timeline


def demo_router(root: Path) -> APIRouter:
    router = APIRouter(prefix="/demo")

    @router.get("")
    def home(request: Request):
        attributes = "data-demo data-preview" if request.query_params.get("preview") == "1" else "data-demo"
        return HTMLResponse((root / "index.html").read_text().replace("<body>", f"<body {attributes}>"))

    @router.get("/api/timeline")
    @router.post("/api/sync")
    def timeline():
        snapshot, guide = demo_data()
        return build_timeline(snapshot, guide=guide)

    @router.get("/api/course-guide")
    def guide():
        return demo_data()[1]

    return router
