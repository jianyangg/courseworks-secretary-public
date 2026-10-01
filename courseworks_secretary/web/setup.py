import getpass
import secrets
from pathlib import Path

from ..config import ENV_PATH
from ..private_settings import save_settings
from .auth import hash_password


def configure_web_secrets(path: Path = ENV_PATH) -> None:
    password = getpass.getpass("Choose a dashboard password (at least 8 characters): ")
    confirmation = getpass.getpass("Confirm timeline password: ")
    if password != confirmation:
        raise ValueError("Passwords do not match")
    if len(password) < 8:
        raise ValueError("Password must be at least 8 characters")
    save_settings(
        path,
        {
            "AUTH_PASSWORD_HASH": hash_password(password),
            "SESSION_SECRET": secrets.token_urlsafe(48),
            "CRON_SECRET": secrets.token_urlsafe(32),
        },
    )
