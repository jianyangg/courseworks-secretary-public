from datetime import datetime, timezone
import unittest

from courseworks_secretary.web.timeline import build_timeline


class PreparationTests(unittest.TestCase):
    def test_reminder_retains_actual_deadline(self):
        guide = {"courses": [{"title": "Example", "sections": [{
            "label": "Prepare before class",
            "items": [{"title": "Read chapter", "dueOn": "2026-10-05", "deadlineTime": "10:00 AM"}],
        }]}]}
        result = build_timeline({"courses": []}, now=datetime(2026, 10, 1, 12, tzinfo=timezone.utc), guide=guide)
        task = next(task for group in result["groups"] for task in group["tasks"])
        self.assertEqual(task["dueAt"], "2026-10-04T19:00:00-04:00")
        self.assertEqual(task["deadlineAt"], "2026-10-05T10:00:00-04:00")
        self.assertIn("4 days left", task["time"])
