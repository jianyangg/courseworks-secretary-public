from datetime import datetime, timedelta, timezone
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Callable, Dict, List, Optional, Tuple

from .text import html_to_text
from .source_links import content_links_from_html, external_links_from_html


def collect_snapshot(client, now: Optional[datetime] = None) -> Dict[str, Any]:
    collected_at = now or datetime.now(timezone.utc)
    profile = client.profile()
    warnings: List[str] = []
    def collect_course(raw_course):
        course_id = raw_course["id"]
        activity_start, activity_end = _activity_window(raw_course, collected_at)
        course = {
            "id": course_id,
            "name": raw_course.get("name") or "Untitled course",
            "course_code": raw_course.get("course_code") or "",
            "html_url": raw_course.get("html_url"),
            "term": raw_course.get("term"),
            "syllabus_text": html_to_text(raw_course.get("syllabus_body")),
        }
        course["assignments"] = _safe(
            lambda: [_assignment(item) for item in client.assignments(course_id)],
            [],
            warnings,
            course["name"],
            "assignments",
        )
        course["announcements"] = _safe(
            lambda: [
                _announcement(item)
                for item in client.announcements(
                    course_id, activity_start, activity_end
                )
            ],
            [],
            warnings,
            course["name"],
            "announcements",
        )
        course["planner_items"] = _safe(
            lambda: [
                _planner_item(item)
                for item in client.planner_items(
                    course_id, activity_start, activity_end
                )
            ],
            [],
            warnings,
            course["name"],
            "planner items",
        )
        course["discussion_topics"] = _safe(
            lambda: [
                _discussion_topic(item)
                for item in client.discussion_topics(course_id)
            ],
            [],
            warnings,
            course["name"],
            "discussion topics",
        )
        raw_modules = _safe(
            lambda: client.modules(course_id),
            [],
            warnings,
            course["name"],
            "modules",
        )
        course["modules"] = [_module(item) for item in raw_modules]
        course["pages"] = _safe(
            lambda: [_page(item) for item in client.pages(course_id, raw_modules)],
            [],
            warnings,
            course["name"],
            "pages",
        )
        course["files"] = _safe(
            lambda: [_file(item, course_id) for item in client.files(course_id)],
            [], warnings, course["name"], "files",
        )
        return course

    # Independent read-only requests; bounded fan-out keeps the daily sync cheap
    # and within the production function budget while preserving course order.
    with ThreadPoolExecutor(max_workers=4) as executor:
        courses = list(executor.map(collect_course, client.active_courses()))
    return {
        "generated_at": collected_at.isoformat(),
        "student": {"id": profile.get("id"), "name": profile.get("name")},
        "courses": courses,
        "warnings": warnings,
    }


def _safe(
    operation: Callable[[], Any],
    fallback: Any,
    warnings: List[str],
    course_name: str,
    component: str,
):
    try:
        return operation()
    except Exception as error:
        warnings.append("{}: could not read {} ({})".format(course_name, component, error))
        return fallback


def _assignment(item: Dict[str, Any]) -> Dict[str, Any]:
    submission = item.get("submission") or {}
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "due_at": item.get("due_at"),
        "unlock_at": item.get("unlock_at"),
        "lock_at": item.get("lock_at"),
        "html_url": item.get("html_url"),
        "description_text": html_to_text(item.get("description")),
        "external_links": external_links_from_html(item.get("description")),
        "points_possible": item.get("points_possible"),
        "omit_from_final_grade": item.get("omit_from_final_grade", False),
        "grading_type": item.get("grading_type"),
        "submission_types": item.get("submission_types") or [],
        "submitted": submission.get("workflow_state") in ("submitted", "graded"),
        "submission_state": submission.get("workflow_state"),
        "missing": submission.get("missing", False),
        "late": submission.get("late", False),
    }


def _announcement(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "posted_at": item.get("posted_at"),
        "delayed_post_at": item.get("delayed_post_at"),
        "lock_at": item.get("lock_at"),
        "html_url": item.get("html_url"),
        "message_text": html_to_text(item.get("message")),
        "read_state": item.get("read_state"),
    }


def _planner_item(item: Dict[str, Any]) -> Dict[str, Any]:
    plannable = item.get("plannable") or {}
    override = item.get("planner_override") or {}
    submissions = item.get("submissions") or {}
    return {
        "id": item.get("plannable_id") or plannable.get("id"),
        "type": item.get("plannable_type"),
        "title": (
            plannable.get("title")
            or plannable.get("name")
            or item.get("title")
            or "Untitled planner item"
        ),
        "due_at": _planner_due_at(item, plannable),
        "html_url": item.get("html_url") or plannable.get("html_url"),
        "details_text": html_to_text(
            plannable.get("details")
            or plannable.get("description")
            or plannable.get("message")
        ),
        "external_links": external_links_from_html(
            plannable.get("details")
            or plannable.get("description")
            or plannable.get("message")
        ),
        "completed": bool(
            override.get("marked_complete")
            or submissions.get("submitted")
            or submissions.get("graded")
            or submissions.get("excused")
        ),
    }


def _planner_due_at(item: Dict[str, Any], plannable: Dict[str, Any]):
    explicit_due = (
        plannable.get("todo_date")
        or plannable.get("due_at")
        or (plannable.get("assignment") or {}).get("due_at")
    )
    if explicit_due:
        return explicit_due
    if item.get("plannable_type") in {"discussion_topic", "wiki_page", "announcement"}:
        return None
    return item.get("plannable_date") or plannable.get("start_at")


def _file(item: Dict[str, Any], course_id: int) -> Dict[str, Any]:
    # Persist source links, never signed download URLs or verifier tokens.
    return {
        "id": item.get("id"),
        "display_name": item.get("display_name"),
        "updated_at": item.get("updated_at"),
        "content_type": item.get("content-type"),
        "html_url": "https://courseworks2.columbia.edu/courses/{}/files/{}".format(course_id, item.get("id")),
    }


def _discussion_topic(item: Dict[str, Any]) -> Dict[str, Any]:
    assignment = item.get("assignment") or {}
    return {
        "id": item.get("id"),
        "title": item.get("title"),
        "posted_at": item.get("posted_at"),
        "last_reply_at": item.get("last_reply_at"),
        "due_at": assignment.get("due_at"),
        "html_url": item.get("html_url"),
        "message_text": html_to_text(item.get("message")),
        "read_state": item.get("read_state"),
        "unread_count": item.get("unread_count"),
    }


def _activity_window(
    course: Dict[str, Any], now: datetime
) -> Tuple[str, str]:
    term = course.get("term") or {}
    start = _parse_datetime(term.get("start_at")) or now - timedelta(days=180)
    end = _parse_datetime(term.get("end_at")) or now + timedelta(days=365)
    return (
        (start - timedelta(days=60)).date().isoformat(),
        (end + timedelta(days=30)).date().isoformat(),
    )


def _parse_datetime(value: Any) -> Optional[datetime]:
    if not isinstance(value, str):
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _module(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "id": item.get("id"),
        "name": item.get("name"),
        "unlock_at": item.get("unlock_at"),
        "state": item.get("state"),
        "items": [
            {
                "id": module_item.get("id"),
                "title": module_item.get("title"),
                "type": module_item.get("type"),
                "html_url": module_item.get("html_url"),
                "completion_requirement": module_item.get("completion_requirement"),
                "content_details": module_item.get("content_details"),
            }
            for module_item in item.get("items") or []
        ],
    }


def _page(item: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "page_id": item.get("page_id"),
        "title": item.get("title"),
        "updated_at": item.get("updated_at"),
        "html_url": item.get("html_url"),
        "body_text": html_to_text(item.get("body")),
        "links": content_links_from_html(item.get("body")),
    }
