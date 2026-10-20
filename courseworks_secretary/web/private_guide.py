"""Optional personal guide kept outside the publishable source tree."""

import json
from datetime import datetime
import os
from pathlib import Path
from typing import Any

from courseworks_secretary.config import WORK_DIR
from .runtime_config import setting

GUIDE_PATH = WORK_DIR / "course-guide.json"
BLOB_PATH = "private/course-guide.json"


def load_private_guide() -> dict[str, Any] | None:
    if os.environ.get("BLOB_READ_WRITE_TOKEN"):
        from vercel.blob import BlobClient

        response = BlobClient().get(BLOB_PATH, access="private")
        if response is None:
            return None
        if response.status_code != 200:
            raise RuntimeError("Could not read the private course guide")
        return _validated(json.loads(response.content.decode("utf-8")))
    if not GUIDE_PATH.exists():
        return None
    return _validated(json.loads(GUIDE_PATH.read_text(encoding="utf-8")))


def upload_private_guide(path: Path = GUIDE_PATH) -> None:
    token = setting("BLOB_READ_WRITE_TOKEN")
    if not token:
        raise ValueError("BLOB_READ_WRITE_TOKEN is required to upload the private guide")
    guide = _validated(json.loads(path.read_text(encoding="utf-8")))
    from vercel.blob import BlobClient

    os.environ["BLOB_READ_WRITE_TOKEN"] = token
    BlobClient().put(
        BLOB_PATH,
        json.dumps(guide).encode("utf-8"),
        access="private",
        content_type="application/json",
        overwrite=True,
    )


def _validated(guide: Any) -> dict[str, Any]:
    if not isinstance(guide, dict) or not isinstance(guide.get("courses"), list):
        raise ValueError("Private course guide must have a courses list")
    if not isinstance(guide.get("reviewedAt"), str):
        raise ValueError("Private course guide must have a reviewedAt timestamp")
    try:
        reviewed = datetime.fromisoformat(guide["reviewedAt"].replace("Z", "+00:00"))
        if reviewed.tzinfo is None:
            raise ValueError()
    except ValueError:
        raise ValueError("Private course guide reviewedAt must be an ISO timestamp with a timezone") from None
    for course in guide["courses"]:
        if not isinstance(course, dict) or not isinstance(course.get("title"), str):
            raise ValueError("Each guide course must have a title")
        if not isinstance(course.get("sections"), list):
            raise ValueError("Each guide course must have a sections list")
        for section in course["sections"]:
            if not isinstance(section, dict):
                raise ValueError("Guide sections must be objects")
            for field in ("items", "bullets"):
                if field in section and (not isinstance(section[field], list) or not all(isinstance(item, dict) for item in section[field])):
                    raise ValueError(f"Guide section {field} must be a list of objects")
    return guide
