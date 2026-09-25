from datetime import datetime, timedelta, timezone
import re
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from courseworks_secretary.source_links import assignment_links, safe_courseworks_url
from courseworks_secretary.web.curated_timeline import curated_tasks


EASTERN = ZoneInfo("America/New_York")
WINDOW = timedelta(days=21)
ACTIONABLE_PLANNER_TYPES = {
    "assignment",
    "assessment_request",
    "discussion_topic",
    "peer_review_sub_assignment",
    "planner_note",
    "quiz",
    "sub_assignment",
}


def build_timeline(
    snapshot: Dict[str, Any], now: Optional[datetime] = None, guide: Optional[Dict[str, Any]] = None
) -> Dict[str, Any]:
    current = now or datetime.now(timezone.utc)
    tasks: List[Dict[str, Any]] = []
    for course in snapshot.get("courses") or []:
        course_label = _clean_title(
            course.get("course_code") or course.get("name") or "Course"
        )
        for assignment in course.get("assignments") or []:
            due = _parse_date(assignment.get("due_at"))
            if assignment.get("submitted") or due is None:
                continue
            source_url = safe_courseworks_url(assignment.get("html_url"))
            tasks.append(
                {
                    "title": _clean_title(
                        assignment.get("name") or "Untitled assignment"
                    ),
                    "course": course_label,
                    "courseAliases": [course_label],
                    "colorKey": course_label,
                    "due": due,
                    "url": source_url,
                    "links": assignment_links(source_url, assignment.get("external_links")),
                    "sourceLabel": "CourseWorks",
                    "kind": "task",
                    "typeLabel": "Assignment",
                    "isGraded": (
                        _has_points(assignment.get("points_possible"))
                        and not assignment.get("omit_from_final_grade")
                        and assignment.get("grading_type") != "not_graded"
                    ),
                }
            )
        for planner_item in course.get("planner_items") or []:
            due = _parse_date(planner_item.get("due_at"))
            planner_type = planner_item.get("type")
            if (
                planner_item.get("completed")
                or due is None
                or planner_type == "announcement"
            ):
                continue
            is_meeting = planner_type == "calendar_event"
            if not is_meeting and planner_type not in ACTIONABLE_PLANNER_TYPES:
                continue
            source_url = safe_courseworks_url(planner_item.get("html_url"))
            candidate = {
                "title": _clean_title(
                    planner_item.get("title") or "Untitled planner item"
                ),
                "course": course_label,
                "courseAliases": [course_label],
                "colorKey": course_label,
                "due": due,
                "url": source_url,
                "links": assignment_links(source_url, planner_item.get("external_links")),
                "sourceLabel": (
                    "CourseWorks calendar" if is_meeting else "CourseWorks planner"
                ),
                "kind": "meeting" if is_meeting else "task",
                "typeLabel": _planner_type_label(planner_type),
                "isGraded": False,
            }
            matching = _matching_task(candidate, tasks)
            if matching is not None:
                _merge_links(matching, candidate)
            else:
                tasks.append(candidate)
    if guide:
        for curated in curated_tasks(guide):
            matching = _matching_task(curated, tasks)
            if matching is not None:
                _merge_links(matching, curated)
                if curated.get("isGraded") is not None:
                    matching["isGraded"] = curated["isGraded"] is True
                continue
            tasks.append(curated)
    tasks.sort(key=_timeline_sort_key)

    groups: List[Dict[str, Any]] = []
    for task in tasks:
        local_due = task["due"].astimezone(EASTERN)
        date_key = local_due.date().isoformat()
        if not groups or groups[-1]["date"] != date_key:
            groups.append(
                {
                    "date": date_key,
                    "dateLabel": local_due.strftime("%b %-d"),
                    "weekday": local_due.strftime("%A"),
                    "state": _state(task["due"], current),
                    "statusLabel": _status_label(task["due"], current),
                    "tasks": [],
                }
            )
        groups[-1]["tasks"].append(
            {
                "title": task["title"],
                "course": task["course"],
                "colorKey": task["colorKey"],
                "time": task.get("timeLabel") or local_due.strftime("%-I:%M %p"),
                "dueAt": task["due"].isoformat(),
                "isPast": task["due"] < current,
                "isLater": task["due"] - current > WINDOW,
                "state": _state(task["due"], current),
                "url": task["url"],
                "links": task.get("links") or [],
                "sourceLabel": task["sourceLabel"],
                "kind": task.get("kind", "task"),
                "typeLabel": task.get("typeLabel"),
                "isPreparation": _is_preparation(task),
                "isGraded": bool(task.get("isGraded")),
            }
        )

    return {
        "generatedAt": _latest_update(snapshot.get("generated_at"), (guide or {}).get("reviewedAt")),
        "taskCount": len(tasks),
        "pastTaskCount": sum(task["due"] < current for task in tasks),
        "upcomingTaskCount": sum(
            current <= task["due"] <= current + WINDOW for task in tasks
        ),
        "laterTaskCount": sum(task["due"] > current + WINDOW for task in tasks),
        "warningCount": len(snapshot.get("warnings") or []),
        "courses": _timeline_courses(tasks, guide or {}),
        "groups": groups,
    }


def _timeline_courses(
    tasks: List[Dict[str, Any]], guide: Dict[str, Any]
) -> List[Dict[str, str]]:
    keys_with_tasks = {task.get("colorKey") for task in tasks}
    records: List[Dict[str, str]] = []
    seen = set()
    for course in guide.get("courses") or []:
        key = course.get("colorKey") or course.get("title")
        if not key or key not in keys_with_tasks or key in seen:
            continue
        records.append(
            {
                "key": key,
                "label": course.get("title") or course.get("shortTitle") or "Course",
                "shortLabel": course.get("shortTitle") or course.get("title") or "Course",
            }
        )
        seen.add(key)
    for task in tasks:
        key = task.get("colorKey")
        if not key or key in seen:
            continue
        label = task.get("course") or "Course"
        records.append({"key": key, "label": label, "shortLabel": label})
        seen.add(key)
    return records


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _has_points(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and value > 0


def _state(due: datetime, now: datetime) -> str:
    delta = due - now
    if delta.total_seconds() < 0:
        return "overdue"
    if delta <= timedelta(days=7):
        return "soon"
    return "upcoming"


def _status_label(due: datetime, now: datetime) -> str:
    days = (due.astimezone(EASTERN).date() - now.astimezone(EASTERN).date()).days
    if days < 0:
        return "Overdue"
    if days == 0:
        return "Today"
    if days == 1:
        return "Tomorrow"
    return "In {} days".format(days)


def _clean_title(value: str) -> str:
    return re.sub(r"\s*\bFA\d{4}\b\s*", " ", value, flags=re.IGNORECASE).strip()


def _matching_task(candidate: Dict[str, Any], tasks: List[Dict[str, Any]]) -> Dict[str, Any] | None:
    candidate_title = _comparison_key(candidate["title"])
    candidate_date = candidate["due"].astimezone(EASTERN).date()
    candidate_courses = {
        _comparison_key(alias) for alias in candidate.get("courseAliases") or []
    }
    for task in tasks:
        same_course = bool(
            candidate_courses
            & {_comparison_key(alias) for alias in task.get("courseAliases") or []}
        )
        if not same_course:
            continue
        if (
            candidate.get("kind") == "meeting"
            and task.get("kind") == "meeting"
            and candidate["due"] == task["due"]
        ):
            return task
        if (
            _comparison_key(task["title"]) == candidate_title
            and task["due"].astimezone(EASTERN).date() == candidate_date
        ):
            return task
    return None


def _merge_links(target: Dict[str, Any], curated: Dict[str, Any]) -> None:
    if not curated.get("links"):
        return
    existing = list(target.get("links") or [])
    if target.get("url") and not any(link["url"] == target["url"] for link in existing):
        primary = next(
            (link for link in curated["links"] if link["url"] == target["url"]),
            None,
        )
        existing.insert(
            0,
            primary or {"label": target.get("sourceLabel") or "Source", "url": target["url"]},
        )
    seen = {link["url"] for link in existing}
    for link in curated["links"]:
        if link["url"] not in seen:
            existing.append(link)
            seen.add(link["url"])
    target["links"] = existing


def _comparison_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", _clean_title(value).lower())


def _planner_type_label(value: Any) -> str:
    labels = {
        "assignment": "Assignment",
        "assessment_request": "Assessment",
        "calendar_event": "Class event",
        "discussion_topic": "Discussion",
        "peer_review_sub_assignment": "Peer review",
        "planner_note": "Planner item",
        "quiz": "Quiz",
        "sub_assignment": "Assignment",
    }
    return labels.get(value, "Course task")


def _latest_update(*values: Optional[str]) -> Optional[str]:
    dated = [(parsed, value) for value in values if (parsed := _parse_date(value))]
    return max(dated, default=(None, None), key=lambda item: item[0])[1]


def _is_preparation(task: Dict[str, Any]) -> bool:
    if task.get("isPreparation"):
        return True
    title = task.get("title", "")
    return bool(re.search(r"\bprepar", title, flags=re.IGNORECASE))


def _timeline_sort_key(task: Dict[str, Any]) -> tuple:
    if task.get("kind") == "meeting":
        priority = 2
    elif _is_preparation(task):
        priority = 0
    else:
        priority = 1
    return (task["due"], priority)
