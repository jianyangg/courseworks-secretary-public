import unittest
from datetime import datetime, timezone

from courseworks_secretary.collector import _assignment, _page, collect_snapshot


class FakeClient:
    def profile(self):
        return {"id": 1, "name": "Student"}

    def active_courses(self):
        return [
            {
                "id": 10,
                "name": "Robotics",
                "course_code": "ROBOTS",
                "term": {
                    "start_at": "2026-09-01T00:00:00Z",
                    "end_at": "2026-12-20T00:00:00Z",
                },
            }
        ]

    def assignments(self, course_id):
        return []

    def announcements(self, course_id, start_date, end_date):
        self.announcement_window = (start_date, end_date)
        return []

    def planner_items(self, course_id, start_date, end_date):
        self.planner_window = (start_date, end_date)
        return [
            {
                "plannable_id": 7,
                "plannable_type": "discussion_topic",
                "plannable_date": "2026-09-24T23:59:00-04:00",
                "html_url": "/courses/10/discussion_topics/7",
                "plannable": {"title": "Respond to project discussion", "todo_date": "2026-09-24T23:59:00-04:00"},
                "planner_override": None,
                "submissions": False,
            }
        ]

    def discussion_topics(self, course_id):
        return [
            {
                "id": 7,
                "title": "Project logistics",
                "message": "Bring your draft.",
                "html_url": "https://courseworks2.columbia.edu/courses/10/discussion_topics/7",
                "posted_at": "2026-09-15T12:00:00Z",
            }
        ]

    def modules(self, course_id):
        return []

    def files(self, course_id):
        return [{"id": 99, "display_name": "Dataset", "url": "https://example.com/download?verifier=secret"}]

    def pages(self, course_id, modules):
        return []


class CollectorTests(unittest.TestCase):
    def test_preserves_safe_page_resource_links_with_human_labels(self):
        page = _page({
            "page_id": 8,
            "title": "Week 2 Prep",
            "body": """
                <p>Read <a href="https://courseworks2.columbia.edu/courses/10/files/20?verifier=secret">Garakani.pdf</a>.</p>
                <p>Play <a href="https://adarkroom.doublespeakgames.com/">A Dark Room</a>.</p>
                <a href="javascript:alert(1)">Unsafe</a>
            """,
        })

        self.assertEqual(page["links"], [
            {
                "label": "Garakani.pdf",
                "url": "https://courseworks2.columbia.edu/courses/10/files/20",
            },
            {
                "label": "A Dark Room",
                "url": "https://adarkroom.doublespeakgames.com/",
            },
        ])

    def test_preserves_external_links_from_assignment_description(self):
        assignment = _assignment({
            "id": 5,
            "description": '<p>Read <a href="https://www.vmock.com/columbiaengineering/login">VMock</a>.</p>',
        })

        self.assertEqual(assignment["external_links"], [
            {"label": "VMock", "url": "https://www.vmock.com/columbiaengineering/login"},
        ])

    def test_collects_structured_planner_work_and_full_term_review_sources(self):
        client = FakeClient()

        snapshot = collect_snapshot(
            client,
            now=datetime(2026, 9, 15, 12, 0, tzinfo=timezone.utc),
        )

        course = snapshot["courses"][0]
        self.assertEqual(client.announcement_window, ("2026-07-03", "2027-01-19"))
        self.assertEqual(client.planner_window, ("2026-07-03", "2027-01-19"))
        self.assertEqual(course["planner_items"][0]["title"], "Respond to project discussion")
        self.assertEqual(course["planner_items"][0]["due_at"], "2026-09-24T23:59:00-04:00")
        self.assertFalse(course["planner_items"][0]["completed"])
        self.assertEqual(course["discussion_topics"][0]["message_text"], "Bring your draft.")
        self.assertEqual(course["files"][0]["html_url"], "https://courseworks2.columbia.edu/courses/10/files/99")
        self.assertNotIn("verifier", str(course["files"]))


if __name__ == "__main__":
    unittest.main()
