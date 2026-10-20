"""Synthetic cross-source cases, suitable for the public release."""

from copy import deepcopy
from datetime import datetime, timezone
import unittest

from courseworks_secretary.web.timeline import build_timeline


NOW = datetime(2026, 10, 20, tzinfo=timezone.utc)
ASSIGNMENT_URL = "https://courseworks2.columbia.edu/courses/100/assignments/200"


class TaskIdentityTests(unittest.TestCase):
    def setUp(self):
        self.snapshot = {"courses": [{
            "id": 100, "name": "Example Course", "course_code": "EX101",
            "assignments": [{
                "id": 200, "name": "Homework 3", "html_url": ASSIGNMENT_URL,
                "due_at": "2026-11-01T23:59:00-05:00", "points_possible": 10,
            }],
        }]}
        self.item = {
            "title": "HW3: graph search", "dueOn": "2026-11-01",
            "deadlineTime": "11:59 PM", "sourceUrl": ASSIGNMENT_URL,
            "isGraded": True,
        }
        self.guide = {"courses": [{
            "id": "example", "title": "Example Course", "shortTitle": "EX101",
            "colorKey": "EX101", "courseUrl": "https://courseworks2.columbia.edu/courses/100",
            "sections": [{"label": "Deadlines", "items": [self.item]}],
        }]}

    def rows(self):
        result = build_timeline(self.snapshot, now=NOW, guide=self.guide)
        return [task for group in result["groups"] for task in group["tasks"]]

    def test_renamed_guide_deadline_merges_by_assignment_source(self):
        self.item["links"] = [{"label": "Instructions", "url": "https://example.edu/hw3"}]
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["title"], "Homework 3")
        self.assertEqual({link["url"] for link in rows[0]["links"]}, {
            ASSIGNMENT_URL, "https://example.edu/hw3",
        })

    def test_revised_canvas_deadline_stays_authoritative_and_reports_conflict(self):
        self.item["dueOn"] = "2026-10-30"
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["dueAt"], "2026-11-01T23:59:00-05:00")
        self.assertTrue(rows[0]["deadlineConflict"])

    def test_submitted_assignment_suppresses_linked_guide_deadline(self):
        self.snapshot["courses"][0]["assignments"][0]["submitted"] = True
        self.assertEqual(self.rows(), [])

    def test_submitted_undated_assignment_still_suppresses_linked_guide_deadline(self):
        self.snapshot["courses"][0]["assignments"][0].update(submitted=True, due_at=None)
        self.assertEqual(self.rows(), [])

    def test_explicit_assignment_reference_works_without_an_assignment_link(self):
        self.item.pop("sourceUrl")
        self.item["canvasAssignmentId"] = 200
        self.assertEqual(len(self.rows()), 1)

    def test_shared_resource_does_not_merge_preparation_with_the_submission(self):
        self.item["title"] = "Prepare for Homework 3"
        rows = self.rows()
        self.assertEqual(len(rows), 2)
        prep = next(task for task in rows if task["isPreparation"])
        self.assertEqual(prep["deadlineAt"], "2026-11-01T23:59:00-05:00")

    def test_submitted_assignment_does_not_delete_independent_preparation(self):
        self.snapshot["courses"][0]["assignments"][0]["submitted"] = True
        self.item["title"] = "Homework 3"
        self.guide["courses"][0]["sections"][0]["label"] = "Prepare before class"
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertTrue(rows[0]["isPreparation"])

    def test_different_assignment_ids_do_not_merge_even_with_identical_titles(self):
        self.item["title"] = "Homework 3"
        self.item["sourceUrl"] = ASSIGNMENT_URL.replace("/200", "/201")
        self.assertEqual(len(self.rows()), 2)

    def test_different_courses_do_not_merge_on_identical_local_ids(self):
        other = deepcopy(self.snapshot["courses"][0])
        other.update(id=101, name="Other Course", course_code="EX102")
        other["assignments"][0]["html_url"] = ASSIGNMENT_URL.replace("/100/", "/101/")
        self.snapshot["courses"].append(other)
        self.assertEqual(len(self.rows()), 2)

    def test_planner_and_assignment_merge_by_identity_even_when_renamed(self):
        self.guide = None
        self.snapshot["courses"][0]["planner_items"] = [{
            "id": 200, "type": "assignment", "title": "HW3",
            "due_at": "2026-11-01T23:59:00-05:00", "html_url": ASSIGNMENT_URL,
        }]
        self.assertEqual(len(self.rows()), 1)

    def test_record_identity_is_stable_across_guide_names(self):
        first = self.rows()[0]
        self.item["title"] = "A much longer description"
        second = self.rows()[0]
        self.assertTrue(first.get("id"))
        self.assertEqual(first["id"], second["id"])

    def test_date_only_preparation_keeps_date_only_deadline_metadata(self):
        self.guide["courses"][0]["sections"][0]["label"] = "Prepare before class"
        self.item.pop("deadlineTime")
        prep = next(task for task in self.rows() if task["isPreparation"])
        self.assertTrue(prep["deadlineIsDateOnly"])

    def test_end_of_day_wording_is_not_exported_as_a_precise_time(self):
        self.snapshot = {"courses": []}
        self.item["deadlineTime"] = "EOD"
        task = self.rows()[0]
        self.assertEqual(task["time"], "EOD")
        self.assertTrue(task["deadlineIsDateOnly"])

    def test_recurring_guide_work_sharing_a_source_keeps_each_occurrence(self):
        self.snapshot["courses"][0]["assignments"][0]["submitted"] = True
        self.item["title"] = "Homework 3"
        self.item["occurrences"] = [{"dueOn": "2026-11-01"}, {"dueOn": "2026-11-08"}]
        rows = self.rows()
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["dueAt"], "2026-11-08T23:59:00-05:00")
        self.snapshot = {"courses": []}
        rows = self.rows()
        self.assertEqual(len(rows), 2)
        self.assertNotEqual(rows[0]["id"], rows[1]["id"])


if __name__ == "__main__":
    unittest.main()
