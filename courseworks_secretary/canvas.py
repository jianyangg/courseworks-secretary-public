from typing import Any, Dict, List

from .http import CanvasRequestError


class CanvasClient:
    def __init__(self, transport):
        self.transport = transport

    def profile(self) -> Dict[str, Any]:
        return self.transport.get_one("/api/v1/users/self/profile")

    def active_courses(self) -> List[Dict[str, Any]]:
        courses = self.transport.get_all(
            "/api/v1/courses",
            [
                ("enrollment_state", "active"),
                ("state[]", "available"),
                ("include[]", "term"),
                ("include[]", "syllabus_body"),
            ],
        )
        return [
            course
            for course in courses
            if not course.get("access_restricted_by_date", False)
        ]

    def assignments(self, course_id: int) -> List[Dict[str, Any]]:
        return self.transport.get_all(
            "/api/v1/courses/{}/assignments".format(course_id),
            [
                ("include[]", "submission"),
                ("include[]", "all_dates"),
                ("order_by", "due_at"),
            ],
        )

    def announcements(
        self, course_id: int, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        return self.transport.get_all(
            "/api/v1/courses/{}/discussion_topics".format(course_id),
            [
                ("only_announcements", "true"),
                ("order_by", "recent_activity"),
            ],
        )

    def planner_items(
        self, course_id: int, start_date: str, end_date: str
    ) -> List[Dict[str, Any]]:
        return self.transport.get_all(
            "/api/v1/planner/items",
            [
                ("context_codes[]", "course_{}".format(course_id)),
                ("start_date", start_date),
                ("end_date", end_date),
            ],
        )

    def files(self, course_id: int) -> List[Dict[str, Any]]:
        return self.transport.get_all("/api/v1/courses/{}/files".format(course_id))

    def discussion_topics(self, course_id: int) -> List[Dict[str, Any]]:
        return self.transport.get_all(
            "/api/v1/courses/{}/discussion_topics".format(course_id),
            [("include[]", "all_dates"), ("order_by", "recent_activity")],
        )

    def modules(self, course_id: int) -> List[Dict[str, Any]]:
        modules = self.transport.get_all(
            "/api/v1/courses/{}/modules".format(course_id),
            [("include[]", "items"), ("include[]", "content_details")],
        )
        for module in modules:
            if module.get("items") is None:
                module["items"] = self.transport.get_all(
                    "/api/v1/courses/{}/modules/{}/items".format(
                        course_id, module["id"]
                    ),
                    [("include[]", "content_details")],
                )
        return modules

    def pages(
        self, course_id: int, modules: List[Dict[str, Any]] = None
    ) -> List[Dict[str, Any]]:
        try:
            pages = self.transport.get_all(
                "/api/v1/courses/{}/pages".format(course_id),
                [("sort", "updated_at"), ("order", "desc")],
            )
        except CanvasRequestError:
            pages = self._module_pages(modules or [])
        detailed = []
        for page in pages:
            if page.get("published", True):
                detailed.append(
                    self.transport.get_one(
                        "/api/v1/courses/{}/pages/{}".format(
                            course_id, page["url"]
                        )
                    )
                )
        return detailed

    @staticmethod
    def _module_pages(modules: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        pages = []
        seen = set()
        for module in modules:
            for item in module.get("items") or []:
                page_url = item.get("page_url")
                if (
                    item.get("type") == "Page"
                    and item.get("published", True)
                    and page_url
                    and page_url not in seen
                ):
                    pages.append({"url": page_url, "published": True})
                    seen.add(page_url)
        return pages
