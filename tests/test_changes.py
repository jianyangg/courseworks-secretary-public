import unittest
from datetime import datetime, timezone

from courseworks_secretary.changes import record_changes
from courseworks_secretary.web.timeline import build_timeline


def snapshot(generated_at, assignments, announcements=(), failed=(), changes=None):
    data = {"generated_at": generated_at, "courses": [{
        "id": 1, "name": "Games", "course_code": "Games",
        "assignments": list(assignments), "announcements": list(announcements),
        "failed_sources": list(failed),
    }]}
    if changes is not None:
        data["changes"] = changes
    return data


def assignment(identifier, due_at, **fields):
    return {"id": identifier, "name": "Homework {}".format(identifier), "due_at": due_at,
            "html_url": "https://courseworks2.columbia.edu/courses/1/assignments/{}".format(identifier), **fields}


class ChangeDetectionTests(unittest.TestCase):
    def kinds(self, current):
        return sorted((change["kind"], change["recordId"]) for change in current["changes"])

    def test_first_sync_reports_nothing(self):
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [assignment(1, "2026-11-05T23:59:00Z")]), None)
        self.assertEqual(current["changes"], [])

    def test_detects_moved_new_and_removed_assignments(self):
        previous = snapshot("2026-11-01T12:00:00Z", [
            assignment(1, "2026-11-05T23:59:00Z"), assignment(2, "2026-11-06T23:59:00Z"),
        ])
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [
            assignment(1, "2026-11-07T23:59:00Z"), assignment(3, None),
        ]), previous)
        self.assertEqual(self.kinds(current), [
            ("due_changed", 1), ("new_assignment", 3), ("removed_assignment", 2),
        ])

    def test_same_instant_in_another_offset_is_not_a_move(self):
        previous = snapshot("2026-11-01T12:00:00Z", [assignment(1, "2026-11-05T23:59:00Z")])
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [assignment(1, "2026-11-05T18:59:00-05:00")]), previous)
        self.assertEqual(current["changes"], [])

    def test_failed_read_is_never_reported_as_removal(self):
        previous = snapshot("2026-11-01T12:00:00Z", [assignment(1, "2026-11-05T23:59:00Z")])
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [], failed=["assignments"]), previous)
        self.assertEqual(current["changes"], [])

    def test_legacy_snapshot_failure_is_read_from_warnings(self):
        previous = snapshot("2026-11-01T12:00:00Z", [])
        del previous["courses"][0]["failed_sources"]
        previous["warnings"] = ["Games: could not read assignments (HTTP 500)"]
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [assignment(1, "2026-11-05T23:59:00Z")]), previous)
        self.assertEqual(current["changes"], [])

    def test_submitted_work_is_not_reported(self):
        previous = snapshot("2026-11-01T12:00:00Z", [assignment(1, "2026-11-05T23:59:00Z", submitted=True)])
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [
            assignment(1, "2026-11-08T23:59:00Z", submitted=True),
        ]), previous)
        self.assertEqual(current["changes"], [])

    def test_only_announcements_posted_after_previous_sync_are_new(self):
        previous = snapshot("2026-11-01T12:00:00Z", [])
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [], announcements=[
            {"id": 8, "title": "Old post entering the window", "posted_at": "2026-10-20T12:00:00Z"},
            {"id": 9, "title": "Room change", "posted_at": "2026-11-01T18:00:00Z"},
        ]), previous)
        self.assertEqual(self.kinds(current), [("new_announcement", 9)])

    def test_recent_changes_survive_a_quiet_refresh_then_expire(self):
        previous = snapshot("2026-11-01T12:00:00Z", [assignment(1, "2026-11-05T23:59:00Z")])
        moved = record_changes(snapshot("2026-11-02T12:00:00Z", [assignment(1, "2026-11-07T23:59:00Z")]), previous)
        refreshed = record_changes(snapshot("2026-11-02T13:00:00Z", [assignment(1, "2026-11-07T23:59:00Z")]), moved)
        self.assertEqual(self.kinds(refreshed), [("due_changed", 1)])
        later = record_changes(snapshot("2026-11-10T12:00:00Z", [assignment(1, "2026-11-07T23:59:00Z")]), refreshed)
        self.assertEqual(later["changes"], [])

    def test_timeline_describes_a_moved_deadline(self):
        previous = snapshot("2026-11-01T12:00:00Z", [assignment(1, "2026-10-27T03:59:00Z")])
        current = record_changes(snapshot("2026-11-02T12:00:00Z", [assignment(1, "2026-10-29T03:59:00Z")]), previous)
        change = build_timeline(current)["changes"][0]
        self.assertEqual(change["label"], "Deadline moved")
        self.assertEqual(change["detail"], "Was Mon Oct 26, 11:59 PM · now Wed Oct 28, 11:59 PM")
        self.assertEqual(change["colorKey"], "Games")


class UndatedWorkTests(unittest.TestCase):
    def build(self, assignments, guide=None):
        return build_timeline({"courses": [{"id": 1, "course_code": "Games", "assignments": assignments}]},
                              now=datetime(2026, 11, 3, tzinfo=timezone.utc), guide=guide)

    def test_unsubmitted_undated_assignments_are_listed(self):
        result = self.build([
            assignment(1, None, points_possible=10),
            assignment(2, None, submitted=True),
            assignment(3, None, lock_at="2026-11-01T00:00:00Z"),
            assignment(4, "2026-11-05T23:59:00Z"),
        ])
        self.assertEqual([task["title"] for task in result["undated"]], ["Homework 1"])
        self.assertTrue(result["undated"][0]["isGraded"])
        self.assertNotIn("recordKey", result["undated"][0])
        self.assertEqual([course["key"] for course in result["courses"]], ["Games"])

    def test_guide_entry_that_dates_the_assignment_replaces_the_undated_row(self):
        guide = {"courses": [{"id": "games", "title": "Games", "colorKey": "Games", "sections": [{"items": [{
            "title": "Homework 1", "dueOn": "2026-11-09", "deadlineTime": "11:59 PM",
            "sourceUrl": "https://courseworks2.columbia.edu/courses/1/assignments/1",
        }]}]}]}
        result = self.build([assignment(1, None)], guide=guide)
        self.assertEqual(result["undated"], [])
        self.assertEqual(result["taskCount"], 1)


if __name__ == "__main__":
    unittest.main()
