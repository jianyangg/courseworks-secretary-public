from pathlib import Path
import os
from urllib.parse import urlsplit


KEYCHAIN_SERVICE = "com.codex.courseworks-secretary"
KEYCHAIN_ACCOUNT = "courseworks-api-token"
WORK_DIR = Path(__file__).resolve().parent.parent / "work" / "courseworks"
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
SNAPSHOT_PATH = WORK_DIR / "snapshot.json"
BRIEFING_PATH = WORK_DIR / "briefing.md"


def setting(name: str, default: str = "", path: Path | None = None) -> str:
    value = os.environ.get(name, "").strip()
    if value:
        return value
    local_path = path if path is not None else ENV_PATH
    if local_path.exists():
        for line in local_path.read_text(encoding="utf-8").splitlines():
            key, separator, raw = line.partition("=")
            if separator and key.strip() == name:
                return raw.strip().strip('\"').strip("'") or default
    return default


BASE_URL = setting("CANVAS_BASE_URL", "https://courseworks2.columbia.edu").rstrip("/")
_origin = urlsplit(BASE_URL)
if (_origin.scheme != "https" or not _origin.hostname or _origin.username or _origin.password
        or _origin.path or _origin.query or _origin.fragment or _origin.port not in (None, 443)):
    raise ValueError("CANVAS_BASE_URL must be an HTTPS origin, such as https://school.instructure.com")
TIME_ZONE = setting("CANVAS_TIMEZONE", "America/New_York")
