import unittest

from courseworks_secretary.web import private_guide
from courseworks_secretary.web.effort import parse_effort
from courseworks_secretary.web.timeline import build_timeline

COURSE_URL = "https://courseworks2.columbia.edu/courses/77"


def _snapshot(*assignments):
    return {"courses": [{"id": 77, "course_code": "EX101", "assignments": list(assignments)}]}


def _assignment(identifier, name, due="2026-11-10T23:59:00-05:00", **extra):
    return {"id": identifier, "name": name, "due_at": due,
            "html_url": f"{COURSE_URL}/assignments/{identifier}", **extra}


def _guide(course_extra=None, items=None):
    return {"reviewedAt": "2026-11-01T12:00:00-04:00", "courses": [{
        "title": "Example", "colorKey": "EX101", "canvasCourseId": 77,
        "sections": [{"label": "Deadlines", "items": items or []}], **(course_extra or {}),
    }]}


def _tasks(result):
    return {task["title"]: task for group in result["groups"] for task in group["tasks"]}


class EffortParsingTests(unittest.TestCase):
    def test_accepts_hours_with_a_basis(self):
        self.assertEqual(parse_effort({"hours": 2.5, "basis": " Two short proofs "}), {"hours": 2.5, "basis": "Two short proofs"})
        self.assertIsNone(parse_effort(None))

    def test_rejects_estimates_that_would_draw_a_misleading_bar(self):
        for value in ({"hours": 0, "basis": "x"}, {"hours": 201, "basis": "x"}, {"hours": True, "basis": "x"},
                      {"hours": "3", "basis": "x"}, {"hours": 3}, {"hours": 3, "basis": "  "}, 3):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_effort(value)


class TimelineEffortTests(unittest.TestCase):
    def test_unestimated_work_has_no_size(self):
        tasks = _tasks(build_timeline(_snapshot(_assignment(1, "Essay")), guide=_guide()))
        self.assertIsNone(tasks["Essay"]["effort"])

    def test_guide_item_estimate_follows_its_canvas_assignment(self):
        guide = _guide(items=[{"title": "Essay (reviewed)", "canvasAssignmentId": 1, "dueOn": "2026-11-10",
                               "effort": {"hours": 4, "basis": "1,500 words"}}])
        tasks = _tasks(build_timeline(_snapshot(_assignment(1, "Essay")), guide=guide))
        self.assertEqual(tasks["Essay"]["effort"], {"hours": 4, "basis": "1,500 words"})

    def test_occurrence_estimate_overrides_the_item_estimate(self):
        guide = _guide(items=[{"title": "Lab", "effort": {"hours": 2, "basis": "Usual lab"}, "occurrences": [
            {"dueOn": "2026-11-10", "title": "Lab 1"},
            {"dueOn": "2026-11-17", "title": "Lab 2", "effort": {"hours": 6, "basis": "Includes a write-up"}},
        ]}])
        tasks = _tasks(build_timeline({"courses": []}, guide=guide))
        self.assertEqual(tasks["Lab 1"]["effort"]["hours"], 2)
        self.assertEqual(tasks["Lab 2"]["effort"]["hours"], 6)

    def test_course_level_estimate_binds_by_assignment_id_including_quiz_aliases(self):
        guide = _guide(course_extra={"effortEstimates": [
            {"canvasAssignmentId": 1, "hours": 1.5, "basis": "Ten short questions"},
        ]})
        snapshot = _snapshot(_assignment(1, "Quiz 3", quiz_id=55), _assignment(2, "Reading"))
        tasks = _tasks(build_timeline(snapshot, guide=guide))
        self.assertEqual(tasks["Quiz 3"]["effort"]["hours"], 1.5)
        self.assertIsNone(tasks["Reading"]["effort"])

    def test_item_estimate_wins_over_course_level_entry(self):
        guide = _guide(
            course_extra={"effortEstimates": [{"canvasAssignmentId": 1, "hours": 1, "basis": "Course-wide"}]},
            items=[{"title": "Essay", "canvasAssignmentId": 1, "dueOn": "2026-11-10",
                    "effort": {"hours": 5, "basis": "Item-specific"}}],
        )
        tasks = _tasks(build_timeline(_snapshot(_assignment(1, "Essay")), guide=guide))
        self.assertEqual(tasks["Essay"]["effort"]["basis"], "Item-specific")


class GuideValidationTests(unittest.TestCase):
    def test_upload_rejects_malformed_or_duplicate_estimates(self):
        bad_guides = [
            _guide(items=[{"title": "Essay", "dueOn": "2026-11-10", "effort": {"hours": -1, "basis": "x"}}]),
            _guide(course_extra={"effortEstimates": [{"hours": 2, "basis": "No id"}]}),
            _guide(course_extra={"effortEstimates": [
                {"canvasAssignmentId": 1, "hours": 2, "basis": "a"}, {"canvasAssignmentId": 1, "hours": 3, "basis": "b"},
            ]}),
        ]
        no_course_id = _guide(course_extra={"effortEstimates": [{"canvasAssignmentId": 1, "hours": 2, "basis": "a"}]})
        del no_course_id["courses"][0]["canvasCourseId"]
        bad_guides.append(no_course_id)
        for guide in bad_guides:
            with self.subTest(guide=guide), self.assertRaises(ValueError):
                private_guide._validated(guide)

    def test_valid_estimates_pass_validation(self):
        guide = _guide(course_extra={"effortEstimates": [{"canvasAssignmentId": 1, "hours": 2, "basis": "a"}]},
                       items=[{"title": "Essay", "dueOn": "2026-11-10", "effort": {"hours": 4, "basis": "b"}}])
        self.assertIs(private_guide._validated(guide), guide)


if __name__ == "__main__":
    unittest.main()
