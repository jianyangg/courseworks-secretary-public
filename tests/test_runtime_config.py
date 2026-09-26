import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from courseworks_secretary.web.runtime_config import setting


class RuntimeConfigTests(unittest.TestCase):
    def test_reads_local_private_settings(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text("SESSION_SECRET=local-value\n", encoding="utf-8")
            with patch("courseworks_secretary.web.runtime_config.ENV_PATH", path):
                with patch.dict(os.environ, {}, clear=True):
                    self.assertEqual(setting("SESSION_SECRET"), "local-value")

    def test_deployment_environment_takes_priority(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / ".env"
            path.write_text("SESSION_SECRET=local-value\n", encoding="utf-8")
            with patch("courseworks_secretary.web.runtime_config.ENV_PATH", path):
                with patch.dict(os.environ, {"SESSION_SECRET": "deployed-value"}):
                    self.assertEqual(setting("SESSION_SECRET"), "deployed-value")


if __name__ == "__main__":
    unittest.main()
