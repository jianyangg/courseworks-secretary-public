"""Enter a CourseWorks token directly in the user's terminal."""

import getpass
from pathlib import Path
import warnings

from .config import ENV_PATH
from .private_settings import save_settings


def configure_token(path: Path = ENV_PATH) -> None:
    print("Paste your CourseWorks access code here, then press Enter. It will stay hidden.")
    with warnings.catch_warnings():
        warnings.simplefilter("error", getpass.GetPassWarning)
        try:
            token = getpass.getpass("CourseWorks access code: ").strip()
        except getpass.GetPassWarning as error:
            raise ValueError("Open an interactive terminal to enter your access code privately") from error
    if not token or any(character in token for character in "\r\n"):
        raise ValueError("Enter a non-empty access code on one line")
    save_settings(path, {"COURSEWORKS_API_TOKEN": token})
