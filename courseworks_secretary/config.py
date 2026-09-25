from pathlib import Path


BASE_URL = "https://courseworks2.columbia.edu"
KEYCHAIN_SERVICE = "com.codex.courseworks-secretary"
KEYCHAIN_ACCOUNT = "courseworks-api-token"
WORK_DIR = Path(__file__).resolve().parent.parent / "work" / "courseworks"
ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
SNAPSHOT_PATH = WORK_DIR / "snapshot.json"
BRIEFING_PATH = WORK_DIR / "briefing.md"
