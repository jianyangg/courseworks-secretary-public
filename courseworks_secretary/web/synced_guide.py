from copy import deepcopy
from datetime import datetime
import re
from typing import Any, Dict, Optional

from courseworks_secretary.source_links import assignment_links, page_links


def add_synced_course_data(
    guide: Dict[str, Any], snapshot: Optional[Dict[str, Any]]
) -> Dict[str, Any]:
    result = deepcopy(guide)
    if not snapshot:
        return result

    for synced_course in snapshot.get("courses") or []:
        guide_course = _matching_course(result, synced_course)
        if not guide_course:
            continue
        linked_assignments = [
            item
            for assignment in synced_course.get("assignments") or []
            if (item := _linked_assignment_item(assignment)) is not None
        ]
        if linked_assignments:
            guide_course["sections"].append(
                {"label": "Linked assignment resources", "items": linked_assignments}
            )
        linked_pages = [
            item
            for page in synced_course.get("pages") or []
            if (item := _linked_page_item(page)) is not None
        ]
        if linked_pages:
            guide_course["sections"].append(
                {"label": "Linked page resources", "items": linked_pages}
            )
        announcements = synced_course.get("announcements") or []
        if announcements:
            items = [_announcement_item(item) for item in announcements]
            items.sort(key=lambda item: item.get("postedAt") or "", reverse=True)
            guide_course["sections"].append(
                {"label": "Synced announcements", "items": items}
            )
    return result


def _linked_page_item(page: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    links = page_links(page.get("html_url"), page.get("links"))
    if not links:
        return None
    return {
        "date": "Page",
        "title": page.get("title") or "Untitled page",
        "detail": "Open the CourseWorks page and its linked resources.",
        "links": links,
    }


def _linked_assignment_item(assignment: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    links = assignment_links(assignment.get("html_url"), assignment.get("external_links"))
    if not links:
        return None
    due_at = assignment.get("due_at")
    return {
        "date": _date_label(due_at) if due_at else "Undated",
        "title": assignment.get("name") or "Untitled assignment",
        "typeLabel": "Assignment",
        "detail": "Open the assignment and its linked resource.",
        "links": links,
    }


def _matching_course(
    guide: Dict[str, Any], synced_course: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    candidates = {
        _key(synced_course.get("name")),
        _key(synced_course.get("course_code")),
    }
    candidates.discard("")
    for course in guide.get("courses") or []:
        guide_keys = {
            _key(course.get("title")),
            _key(course.get("shortTitle")),
            _key(course.get("colorKey")),
        }
        if candidates & guide_keys:
            return course
    return None


def _announcement_item(announcement: Dict[str, Any]) -> Dict[str, Any]:
    posted_at = announcement.get("posted_at")
    return {
        "date": _date_label(posted_at),
        "postedAt": posted_at,
        "title": announcement.get("title") or "Untitled announcement",
        "detail": announcement.get("message_text") or "No announcement text was provided.",
        "sourceLabel": "CourseWorks announcement",
        "sourceUrl": announcement.get("html_url"),
    }


def _date_label(value: Any) -> str:
    if not isinstance(value, str):
        return "Date unavailable"
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00")).strftime("%b %-d")
    except ValueError:
        return "Date unavailable"


def _key(value: Any) -> str:
    if not isinstance(value, str):
        return ""
    without_term = re.sub(r"\bfa\s*\d{4}\b", "", value, flags=re.IGNORECASE)
    return re.sub(r"[^a-z0-9]+", "", without_term.lower())
