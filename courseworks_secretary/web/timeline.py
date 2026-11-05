from datetime import datetime, timedelta, timezone
import hashlib
import re
from typing import Any, Dict, List, Optional
from zoneinfo import ZoneInfo

from courseworks_secretary.source_links import assignment_links, safe_courseworks_url
from courseworks_secretary.web.curated_timeline import curated_tasks
from courseworks_secretary.web.effort import apply_course_estimates, course_effort_estimates
from .task_identity import canvas_alias_keys, canvas_record_key, course_key, identity_keys, is_preparation, matching_task, merge_task, stable_task_id
from ..config import TIME_ZONE


EASTERN = ZoneInfo(TIME_ZONE)
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
    undated_candidates: List[Dict[str, Any]] = []
    completed_keys: set[str] = set()
    for course in snapshot.get("courses") or []:
        course_label = _course_label(course)
        for assignment in course.get("assignments") or []:
            record_key = canvas_record_key(course, assignment)
            alias_keys = canvas_alias_keys(course, assignment)
            if assignment.get("submitted"):
                completed_keys.update(identity_keys({"recordKey": record_key, "aliasKeys": alias_keys}))
            due = _parse_date(assignment.get("due_at"))
            if due is None:
                # Undated work cannot sit on a dated timeline, but dropping it
                # hides exactly the items no reminder will ever surface.
                if _is_open_undated(assignment, current):
                    undated_candidates.append(_undated_task(course, course_label, assignment, record_key, alias_keys))
                continue
            source_url = safe_courseworks_url(assignment.get("html_url"))
            tasks.append(
                {
                    "recordKey": record_key,
                    "aliasKeys": alias_keys,
                    "courseKey": course_key(course),
                    "completed": bool(assignment.get("submitted")),
                    "title": _clean_title(
                        assignment.get("name") or "Untitled assignment"
                    ),
                    "course": course_label,
                    "courseAliases": [value for value in (course_label, course.get("name"), course.get("course_code")) if value],
                    "colorKey": course_label,
                    "due": due,
                    "url": source_url,
                    "links": assignment_links(source_url, assignment.get("external_links")),
                    "sourceLabel": "CourseWorks",
                    "kind": "task",
                    "typeLabel": _assignment_type_label(assignment),
                    "isGraded": _is_graded(assignment),
                }
            )
        for planner_item in course.get("planner_items") or []:
            due = _parse_date(planner_item.get("due_at"))
            planner_type = planner_item.get("type")
            if (
                due is None
                or planner_type == "announcement"
            ):
                continue
            if planner_type not in ACTIONABLE_PLANNER_TYPES:
                continue
            source_url = safe_courseworks_url(planner_item.get("html_url"))
            candidate = {
                "recordKey": canvas_record_key(course, planner_item, planner_type),
                "aliasKeys": canvas_alias_keys(course, planner_item, planner_type),
                "courseKey": course_key(course),
                "completed": bool(planner_item.get("completed")),
                "title": _clean_title(
                    planner_item.get("title") or "Untitled planner item"
                ),
                "course": course_label,
                "courseAliases": [value for value in (course_label, course.get("name"), course.get("course_code")) if value],
                "colorKey": course_label,
                "due": due,
                "url": source_url,
                "links": assignment_links(source_url, planner_item.get("external_links")),
                "sourceLabel": "CourseWorks planner",
                "kind": "task",
                "typeLabel": _planner_type_label(planner_type),
                "isGraded": False,
            }
            matching = matching_task(candidate, tasks, EASTERN)
            if matching is not None:
                merge_task(matching, candidate, EASTERN)
            else:
                tasks.append(candidate)
    if guide:
        for curated in curated_tasks(guide):
            if (curated.get("recordKey") in completed_keys and not is_preparation(curated)
                    and not curated.get("occurrenceDate")):
                continue
            matching = matching_task(curated, tasks, EASTERN)
            if matching is not None:
                merge_task(matching, curated, EASTERN)
                continue
            tasks.append(curated)
    # A reviewed guide entry can give an undated Canvas assignment its real
    # date; once it is on the timeline it must not also be listed as undated.
    dated_keys = set().union(*(identity_keys(task) for task in tasks))
    undated = [
        {key: value for key, value in task.items() if key not in {"recordKey", "aliasKeys"}}
        for task in undated_candidates
        if not identity_keys(task) & dated_keys
    ]
    # Course-level estimates fill in only after every guide item has merged, so
    # an item's own estimate is never overwritten by a course-wide entry.
    apply_course_estimates(tasks, course_effort_estimates(guide or {}))
    tasks = [task for task in tasks if not task.get("completed")]
    for task in tasks:
        task["id"] = stable_task_id(task)
        if _is_preparation(task):
            deadline = task["due"].astimezone(EASTERN)
            task["deadlineAt"] = task["due"].isoformat()
            task["due"] = (deadline - timedelta(days=1)).replace(
                hour=19, minute=0, second=0, microsecond=0
            )
            task["timeLabel"] = "7:00 PM · Start preparation · {}".format(
                _deadline_label(deadline, current)
            )
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
                "id": task["id"],
                "title": task["title"],
                "course": task["course"],
                "colorKey": task["colorKey"],
                "time": task.get("timeLabel") or local_due.strftime("%-I:%M %p"),
                "dueAt": task["due"].isoformat(),
                "deadlineAt": task.get("deadlineAt"),
                "deadlineIsDateOnly": bool(task.get("deadlineIsDateOnly")),
                "deadlineConflict": task.get("deadlineConflict"),
                "detail": task.get("detail"),
                "guideTitle": task.get("guideTitle"),
                "showInAssessmentOverview": bool(task.get("showInAssessmentOverview")),
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
                # {"hours", "basis"} from the guide review, or None when nobody
                # has estimated this work. Never defaulted: unknown stays unknown.
                "effort": task.get("effort"),
            }
        )

    return {
        "timeZone": TIME_ZONE,
        "syncedAt": snapshot.get("generated_at"),
        "reviewedAt": (guide or {}).get("reviewedAt"),
        "generatedAt": _latest_update(snapshot.get("generated_at"), (guide or {}).get("reviewedAt")),
        "taskCount": len(tasks),
        "pastTaskCount": sum(task["due"] < current for task in tasks),
        "upcomingTaskCount": sum(
            current <= task["due"] <= current + WINDOW for task in tasks
        ),
        "laterTaskCount": sum(task["due"] > current + WINDOW for task in tasks),
        "warningCount": len(snapshot.get("warnings") or []),
        "warnings": snapshot.get("warnings") or [],
        "edAccess": snapshot.get("ed_access"),
        "courses": _timeline_courses(tasks + undated, guide or {}),
        "groups": groups,
        "undated": undated,
        "changes": _timeline_changes(snapshot),
    }


def _course_label(course: Dict[str, Any]) -> str:
    return _clean_title(course.get("course_code") or course.get("name") or "Course")


def _is_open_undated(assignment: Dict[str, Any], now: datetime) -> bool:
    if assignment.get("submitted"):
        return False
    # Past its lock date the assignment can no longer be submitted, so listing
    # it as outstanding work would only be noise.
    lock = _parse_date(assignment.get("lock_at"))
    return lock is None or lock > now


def _undated_task(
    course: Dict[str, Any], course_label: str, assignment: Dict[str, Any], record_key, alias_keys
) -> Dict[str, Any]:
    source_url = safe_courseworks_url(assignment.get("html_url"))
    title = _clean_title(assignment.get("name") or "Untitled assignment")
    return {
        # Kept only to de-duplicate against dated tasks; stripped before output.
        "recordKey": record_key,
        "aliasKeys": alias_keys,
        "id": hashlib.sha256("{}:undated".format(record_key or course_label + "|" + title).encode()).hexdigest()[:24],
        "title": title,
        "course": course_label,
        "colorKey": course_label,
        "url": source_url,
        "links": assignment_links(source_url, assignment.get("external_links")),
        "sourceLabel": "CourseWorks",
        "kind": "task",
        "typeLabel": _assignment_type_label(assignment),
        "isGraded": _is_graded(assignment),
    }


CHANGE_LABELS = {
    "new_assignment": "New",
    "due_changed": "Deadline moved",
    "removed_assignment": "Removed",
    "new_announcement": "Announcement",
}


def _timeline_changes(snapshot: Dict[str, Any]) -> List[Dict[str, Any]]:
    labels = {course.get("id"): _course_label(course) for course in snapshot.get("courses") or []}
    records = []
    for change in snapshot.get("changes") or []:
        kind = change.get("kind")
        if kind not in CHANGE_LABELS:
            continue
        course = labels.get(change.get("courseId"), "Course")
        records.append({
            "id": change["id"],
            "kind": kind,
            "label": CHANGE_LABELS[kind],
            "title": _clean_title(change.get("title") or "Untitled"),
            "course": course,
            "colorKey": course,
            "detail": _change_detail(change),
            "detectedAt": change.get("detectedAt"),
            # A removed assignment's page no longer exists, so it gets no link.
            "url": None if kind == "removed_assignment" else safe_courseworks_url(change.get("url")),
        })
    return records


def _change_detail(change: Dict[str, Any]) -> str:
    kind = change.get("kind")
    due, previous = _parse_date(change.get("due")), _parse_date(change.get("previousDue"))
    if kind == "due_changed":
        return "Was {} · now {}".format(_change_time(previous), _change_time(due))
    if kind == "new_assignment":
        return "Due {}".format(_change_time(due)) if due else "No due date set"
    if kind == "removed_assignment":
        return "Was due {}".format(_change_time(previous or due)) if (previous or due) else "No longer listed in CourseWorks"
    posted = _parse_date(change.get("postedAt"))
    return "Posted {}".format(_change_time(posted)) if posted else "New post"


def _change_time(value: Optional[datetime]) -> str:
    if value is None:
        return "no due date"
    return value.astimezone(EASTERN).strftime("%a %b %-d, %-I:%M %p")


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


def _is_graded(assignment: Dict[str, Any]) -> bool:
    return (
        _has_points(assignment.get("points_possible"))
        and not assignment.get("omit_from_final_grade")
        and assignment.get("grading_type") != "not_graded"
    )


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


def _deadline_label(deadline: datetime, now: datetime) -> str:
    days = (deadline.astimezone(EASTERN).date() - now.astimezone(EASTERN).date()).days
    if days < 0:
        return "Past due"
    if days == 0:
        return "Due today"
    if days == 1:
        return "Due tomorrow"
    return "{} days left".format(days)


def _clean_title(value: str) -> str:
    return re.sub(r"\s*\bFA\s*\d{4}\b\s*", " ", value, flags=re.IGNORECASE).strip()


def _assignment_type_label(assignment: Dict[str, Any]) -> str:
    if assignment.get("quiz_id") is not None:
        return "Quiz"
    if assignment.get("discussion_topic_id") is not None:
        return "Discussion"
    return "Assignment"


def _planner_type_label(value: Any) -> str:
    labels = {
        "assignment": "Assignment",
        "assessment_request": "Assessment",
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
    return is_preparation(task)


def _timeline_sort_key(task: Dict[str, Any]) -> tuple:
    if _is_preparation(task):
        priority = 0
    else:
        priority = 1
    return (task["due"], priority)
