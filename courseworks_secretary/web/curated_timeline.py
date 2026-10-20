import re
from datetime import datetime, time
from typing import Any, Dict, Iterable, List
from urllib.parse import urlparse
from zoneinfo import ZoneInfo

from .task_identity import course_key, guide_record_key
from ..config import TIME_ZONE


EASTERN = ZoneInfo(TIME_ZONE)


def curated_tasks(guide: Dict[str, Any]) -> List[Dict[str, Any]]:
    tasks: List[Dict[str, Any]] = []
    for course in guide.get("courses") or []:
        for section in course.get("sections") or []:
            for item in section.get("items") or []:
                tasks.extend(_tasks_for_item(course, item, section=section))
    return tasks


def _tasks_for_item(
    course: Dict[str, Any],
    item: Dict[str, Any],
    section: Dict[str, Any] | None = None,
) -> Iterable[Dict[str, Any]]:
    occurrences = item.get("occurrences") or [item]
    tasks = []
    for occurrence in occurrences:
        time_label = (
            occurrence.get("deadlineTime")
            or item.get("deadlineTime")
            or "Date only"
        )
        due = _due_at(occurrence.get("dueOn") or item.get("dueOn"), time_label)
        if due is None:
            continue
        source_url = (
            occurrence.get("sourceUrl")
            or item.get("sourceUrl")
            or course.get("sourceUrl")
            or course.get("courseUrl")
        )
        title = occurrence.get("title") or item.get("title") or "Untitled task"
        is_preparation = bool(
            (section and "prepare" in section.get("label", "").lower())
            or re.search(r"\bprepar", title, flags=re.IGNORECASE)
        )
        links = _source_links(occurrence.get("links") or item.get("links"))
        tasks.append(
            {
                "courseKey": course_key(course),
                "recordKey": guide_record_key(course, {**item, **occurrence}, source_url, links),
                "reviewed": True,
                "title": title,
                "course": course.get("title") or course.get("shortTitle") or "Course",
                "courseAliases": [
                    value
                    for value in (
                        course.get("title"),
                        course.get("shortTitle"),
                        course.get("colorKey"),
                    )
                    if value
                ],
                "colorKey": course.get("colorKey") or course.get("title"),
                "due": due,
                "timeLabel": time_label,
                "url": _safe_source_url(source_url),
                "links": links,
                "detail": occurrence.get("detail") or item.get("detail"),
                "deadlineIsDateOnly": _explicit_time(time_label) is None,
                "showInAssessmentOverview": occurrence.get("showInAssessmentOverview", item.get("showInAssessmentOverview", (section or {}).get("showInAssessmentOverview", False))),
                "sourceLabel": (
                    occurrence.get("sourceLabel")
                    or item.get("sourceLabel")
                    or course.get("sourceLabel")
                    or "Course guide"
                ),
                "kind": "task",
                "typeLabel": occurrence.get("typeLabel") or item.get("typeLabel"),
                "isPreparation": is_preparation,
                "isGraded": occurrence.get(
                    "isGraded", item.get("isGraded", (section or {}).get("isGraded"))
                ),
            }
        )
    return tasks


def _due_at(value: Any, time_label: str) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        due_date = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None
    due_time = _explicit_time(time_label) or time(23, 59)
    return datetime.combine(due_date, due_time, tzinfo=EASTERN)


def _explicit_time(time_label: str) -> time | None:
    try:
        return datetime.strptime(time_label, "%I:%M %p").time()
    except ValueError:
        return None


def _safe_source_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    return value if parsed.scheme == "https" and parsed.hostname and not parsed.username and not parsed.password else None


def _source_links(records: Any) -> List[Dict[str, str]]:
    links: List[Dict[str, str]] = []
    for record in records if isinstance(records, list) else []:
        if not isinstance(record, dict):
            continue
        label = record.get("label")
        url = _safe_source_url(record.get("url"))
        if isinstance(label, str) and label.strip() and url:
            links.append({"label": label.strip(), "url": url})
    return links
