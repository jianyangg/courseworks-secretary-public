from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from api.index import app
from courseworks_secretary.web.auth import verify_password
from courseworks_secretary.web.setup import configure_web_secrets


class PasswordSetupTests(unittest.TestCase):
    def test_example_has_no_password_or_secrets(self):
        path = Path(__file__).resolve().parent.parent / ".env.example"
        values = dict(
            line.split("=", 1)
            for line in path.read_text().splitlines()
            if line and not line.startswith("#")
        )
        for key in ("AUTH_PASSWORD_HASH", "SESSION_SECRET", "CRON_SECRET",
                    "COURSEWORKS_API_TOKEN", "BLOB_READ_WRITE_TOKEN"):
            self.assertEqual(values[key], "", key)

    def test_unconfigured_installation_cannot_log_in(self):
        with patch("api.index.setting", return_value=""):
            client = TestClient(app, base_url="https://testserver")
            response = client.post("/api/login", json={"password": "any-password"})
        self.assertEqual(response.status_code, 503)
        self.assertNotIn("courseworks_session", response.cookies)

    def test_each_installation_uses_its_owners_password_and_fresh_secrets(self):
        with tempfile.TemporaryDirectory() as directory:
            installations = []
            for name in ("first", "second"):
                path = Path(directory) / name
                with patch("courseworks_secretary.web.setup.getpass.getpass",
                           side_effect=["owner-chosen-password"] * 2):
                    configure_web_secrets(path)
                values = dict(line.split("=", 1) for line in path.read_text().splitlines())
                self.assertTrue(verify_password("owner-chosen-password", values["AUTH_PASSWORD_HASH"]))
                self.assertFalse(verify_password("different-password", values["AUTH_PASSWORD_HASH"]))
                self.assertEqual(path.stat().st_mode & 0o777, 0o600)
                installations.append(values)
            for key in ("AUTH_PASSWORD_HASH", "SESSION_SECRET", "CRON_SECRET"):
                self.assertNotEqual(installations[0][key], installations[1][key], key)

    def test_invalid_password_does_not_replace_existing_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            original = "COURSEWORKS_API_TOKEN=synthetic-token\n"
            path.write_text(original)
            for passwords in (["short", "short"], ["chosen-password", "different-password"]):
                with patch("courseworks_secretary.web.setup.getpass.getpass", side_effect=passwords):
                    with self.assertRaises(ValueError):
                        configure_web_secrets(path)
                self.assertEqual(path.read_text(), original)
