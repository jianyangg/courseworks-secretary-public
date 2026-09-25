import getpass
import secrets
from pathlib import Path
from typing import Dict

from ..config import ENV_PATH
from .auth import hash_password


def configure_web_secrets(path: Path = ENV_PATH) -> None:
    password = getpass.getpass("Timeline password: ")
    confirmation = getpass.getpass("Confirm timeline password: ")
    if password != confirmation:
        raise ValueError("Passwords do not match")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    _upsert(
        path,
        {
            "AUTH_PASSWORD_HASH": hash_password(password),
            "SESSION_SECRET": secrets.token_urlsafe(48),
            "CRON_SECRET": secrets.token_urlsafe(32),
        },
    )


def _upsert(path: Path, values: Dict[str, str]) -> None:
    existing = path.read_text(encoding="utf-8").splitlines() if path.exists() else []
    output = []
    remaining = dict(values)
    for line in existing:
        if "=" in line:
            key = line.split("=", 1)[0].strip()
            if key in remaining:
                output.append("{}={}".format(key, remaining.pop(key)))
                continue
        output.append(line)
    output.extend("{}={}".format(key, value) for key, value in remaining.items())
    path.write_text("\n".join(output).rstrip() + "\n", encoding="utf-8")
    path.chmod(0o600)
