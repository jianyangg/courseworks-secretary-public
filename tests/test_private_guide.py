import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from courseworks_secretary.web.course_guide import build_course_guide


class PrivateGuideTests(unittest.TestCase):
    def test_local_private_guide_overrides_generic_guide(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "course-guide.json"
            path.write_text(json.dumps({
                "reviewedAt": "2026-01-01T00:00:00+00:00",
                "courses": [{
                    "id": "personal-course",
                    "title": "My Reviewed Course",
                    "shortTitle": "Reviewed",
                    "colorKey": "EX101",
                    "sections": [],
                }],
            }), encoding="utf-8")
            with patch("courseworks_secretary.web.private_guide.GUIDE_PATH", path):
                with patch("courseworks_secretary.web.private_guide.setting", return_value=""):
                    guide = build_course_guide({"courses": [{"id": 42, "name": "Example", "course_code": "EX101"}]})
        self.assertEqual([item["title"] for item in guide["courses"]], ["My Reviewed Course"])


if __name__ == "__main__":
    unittest.main()
