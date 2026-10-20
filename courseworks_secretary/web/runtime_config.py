"""Read deployed settings from the environment or local private settings."""

from courseworks_secretary.config import ENV_PATH, setting as read_setting


def setting(name: str) -> str:
    return read_setting(name, path=ENV_PATH)
