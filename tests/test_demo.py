from datetime import datetime, timedelta, timezone
import unittest
from unittest.mock import patch

from courseworks_secretary.web.demo import demo_data
from courseworks_secretary.web.timeline import build_timeline


class DemoTests(unittest.TestCase):
    def test_demo_is_self_contained_and_has_all_core_work_views(self):
        with patch("courseworks_secretary.credentials.load_token", side_effect=AssertionError("Credential access")):
            snapshot, guide = demo_data(datetime(2026, 10, 20, 12, tzinfo=timezone.utc))
            result = build_timeline(snapshot, guide=guide, now=datetime(2026, 10, 20, 12, tzinfo=timezone.utc))
        tasks = [task for group in result["groups"] for task in group["tasks"]]
        self.assertEqual(len(result["courses"]), 3)
        self.assertTrue(any(task["isGraded"] for task in tasks))
        self.assertTrue(any(task["showInAssessmentOverview"] for task in tasks))
        self.assertTrue(any(task["isPreparation"] for task in tasks))
        self.assertTrue(any(task["isLater"] for task in tasks))
        self.assertEqual(snapshot["student"]["name"], "Demo")

    def test_course_briefs_distill_rules_beyond_the_deadline_list(self):
        _, guide = demo_data(datetime(2026, 10, 20, 12, tzinfo=timezone.utc))
        for course in guide["courses"]:
            bullets = [bullet for section in course["sections"] for bullet in section.get("bullets", [])]
            copy = " ".join(bullet["text"] for bullet in bullets)
            self.assertRegex(copy, r"\d+%", course["title"])
            self.assertIn("Submit", copy, course["title"])
            self.assertGreaterEqual(len({bullet.get("url") for bullet in bullets if bullet.get("url")}), 2)
            self.assertFalse(any("dueOn" in bullet for bullet in bullets))

    def test_undated_course_essentials_do_not_become_timeline_tasks(self):
        now = datetime(2026, 10, 20, 12, tzinfo=timezone.utc)
        snapshot, guide = demo_data(now)
        result = build_timeline(snapshot, guide=guide, now=now)
        tasks = [task for group in result["groups"] for task in group["tasks"]]
        self.assertEqual(len(tasks), 7)
        self.assertTrue(guide["isDemo"])

    def test_demo_dates_move_with_the_viewing_date(self):
        now = datetime(2026, 10, 20, 12, tzinfo=timezone.utc)
        first, _ = demo_data(now)
        second, _ = demo_data(now + timedelta(days=90))
        first_date = datetime.fromisoformat(first["courses"][0]["assignments"][0]["due_at"])
        second_date = datetime.fromisoformat(second["courses"][0]["assignments"][0]["due_at"])
        self.assertEqual((second_date.date() - first_date.date()).days, 90)
