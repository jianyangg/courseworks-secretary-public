"""Read deployed settings from the environment or local private settings."""

import os

from courseworks_secretary.config import ENV_PATH


def setting(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if value or not ENV_PATH.exists():
        return value
    for line in ENV_PATH.read_text(encoding="utf-8").splitlines():
        key, separator, raw_value = line.partition("=")
        if separator and key.strip() == name:
            return raw_value.strip().strip('"').strip("'")
    return ""
