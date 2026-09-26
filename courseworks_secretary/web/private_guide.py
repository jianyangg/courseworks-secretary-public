"""Optional personal guide kept outside the publishable source tree."""

import json
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
    return guide
