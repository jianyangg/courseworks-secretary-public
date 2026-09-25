import os
from pathlib import Path

from .config import ENV_PATH


class MissingCredentialError(RuntimeError):
    pass


def initialize_env_file(path: Path = ENV_PATH) -> None:
    """Create a local, owner-readable token file without replacing its contents."""
    if not path.exists():
        path.write_text("COURSEWORKS_API_TOKEN=\n", encoding="utf-8")
    path.chmod(0o600)


def load_token(path: Path = ENV_PATH) -> str:
    token = os.environ.get("COURSEWORKS_API_TOKEN", "").strip()
    if not token and path.exists():
        token = _read_value(path, "COURSEWORKS_API_TOKEN")
    if not token:
        raise MissingCredentialError(
            "No CourseWorks token is configured. Add COURSEWORKS_API_TOKEN to .env"
        )
    return token


def _read_value(path: Path, key: str) -> str:
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        name, value = line.split("=", 1)
        if name.strip() == key:
            return value.strip().strip('"').strip("'")
    return ""
