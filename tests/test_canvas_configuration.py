import os
from pathlib import Path
import subprocess
import sys
import unittest


class CanvasConfigurationTests(unittest.TestCase):
    def test_host_and_timezone_apply_to_collection_and_timeline(self):
        script = '''
from datetime import datetime, timezone
from courseworks_secretary.config import BASE_URL, TIME_ZONE
from courseworks_secretary.collector import _file
from courseworks_secretary.source_links import safe_courseworks_url
from courseworks_secretary.web.timeline import build_timeline
assert BASE_URL == "https://campus.example.edu"
assert TIME_ZONE == "Asia/Singapore"
assert _file({"id": 2}, 1)["html_url"] == BASE_URL + "/courses/1/files/2"
assert safe_courseworks_url(BASE_URL + "/courses/1")
assert safe_courseworks_url("https://courseworks2.columbia.edu/courses/1") is None
result = build_timeline({"courses": [{"id": 1, "name": "Example", "assignments": [{"id": 2, "name": "Report", "due_at": "2026-10-21T20:00:00Z"}]}]}, now=datetime(2026, 10, 20, tzinfo=timezone.utc))
assert result["timeZone"] == "Asia/Singapore"
assert result["groups"][0]["date"] == "2026-10-22"
'''
        result = subprocess.run([sys.executable, "-c", script], cwd=Path(__file__).resolve().parents[1],
            env={**os.environ, "CANVAS_BASE_URL": "https://campus.example.edu", "CANVAS_TIMEZONE": "Asia/Singapore", "PYTHONDONTWRITEBYTECODE": "1"},
            capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
