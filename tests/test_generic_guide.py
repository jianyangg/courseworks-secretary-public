import unittest

from courseworks_secretary.web.course_guide import build_course_guide


class GenericGuideTests(unittest.TestCase):
    def test_empty_snapshot_has_no_example_courses(self):
        self.assertEqual(build_course_guide({"courses": []})["courses"], [])

    def test_guide_uses_only_the_supplied_snapshot(self):
        snapshot = {
            "generated_at": "2026-01-01T00:00:00+00:00",
            "courses": [{
                "id": 42,
                "name": "Example Course",
                "course_code": "EX101",
                "announcements": [{
                    "title": "Welcome",
                    "message_text": "Example text",
                }],
            }],
        }
        guide = build_course_guide(snapshot)
        self.assertEqual(guide["reviewedAt"], snapshot["generated_at"])
        self.assertEqual([c["title"] for c in guide["courses"]], ["Example Course"])
        self.assertEqual(guide["courses"][0]["sections"][0]["items"][0]["title"], "Welcome")


if __name__ == "__main__":
    unittest.main()
