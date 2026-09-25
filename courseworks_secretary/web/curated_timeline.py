import re
from datetime import datetime, time
from typing import Any, Dict, Iterable, List
from urllib.parse import urlparse
from zoneinfo import ZoneInfo


EASTERN = ZoneInfo("America/New_York")


def curated_tasks(guide: Dict[str, Any]) -> List[Dict[str, Any]]:
    tasks: List[Dict[str, Any]] = []
    for course in guide.get("courses") or []:
        for section in course.get("sections") or []:
            for item in section.get("items") or []:
                tasks.extend(_tasks_for_item(course, item, section=section))
        for meeting in course.get("meetings") or []:
            task = _task_for_meeting(course, meeting)
            if task:
                tasks.append(task)
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
        tasks.append(
            {
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
                "links": _source_links(occurrence.get("links") or item.get("links")),
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


def _task_for_meeting(
    course: Dict[str, Any], meeting: Dict[str, Any]
) -> Dict[str, Any] | None:
    start_time = meeting.get("startTime")
    due = _due_at(meeting.get("date"), start_time)
    if due is None:
        return None
    location = meeting.get("location") or "Location TBD"
    return {
        "title": "Class · {}".format(location),
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
        "timeLabel": _time_range(start_time, meeting.get("endTime")),
        "url": _safe_source_url(course.get("courseUrl") or course.get("sourceUrl")),
        "sourceLabel": "Class schedule",
        "kind": "meeting",
    }


def _time_range(start_time: str, end_time: Any) -> str:
    if not isinstance(end_time, str):
        return start_time
    start_suffix = start_time.rsplit(" ", 1)[-1]
    end_suffix = end_time.rsplit(" ", 1)[-1]
    compact_start = start_time.rsplit(" ", 1)[0] if start_suffix == end_suffix else start_time
    return "{}–{}".format(compact_start, end_time)


def _due_at(value: Any, time_label: str) -> datetime | None:
    if not isinstance(value, str):
        return None
    try:
        due_date = datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None
    due_time = time(23, 59)
    try:
        due_time = datetime.strptime(time_label, "%I:%M %p").time()
    except ValueError:
        pass
    return datetime.combine(due_date, due_time, tzinfo=EASTERN)


def _safe_source_url(value: Any) -> str | None:
    if not isinstance(value, str):
        return None
    parsed = urlparse(value)
    return value if parsed.scheme == "https" and parsed.hostname else None


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
