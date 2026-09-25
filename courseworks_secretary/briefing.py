from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple


def render_briefing(snapshot: Dict[str, Any], now: Optional[datetime] = None) -> str:
    current = now or datetime.now(timezone.utc)
    courses = snapshot.get("courses") or []
    buckets = {"Act now": [], "Due soon": [], "Upcoming": []}
    per_course: List[Tuple[Dict[str, Any], List[Tuple[float, Dict[str, Any]]]]] = []

    for course in courses:
        outstanding = []
        for assignment in course.get("assignments") or []:
            if assignment.get("submitted") or not assignment.get("due_at"):
                continue
            due = _parse_date(assignment["due_at"])
            if not due:
                continue
            days = (due - current).total_seconds() / 86400
            if days <= 2:
                buckets["Act now"].append((days, course, assignment))
            elif days <= 7:
                buckets["Due soon"].append((days, course, assignment))
            elif days <= 21:
                buckets["Upcoming"].append((days, course, assignment))
            if days <= 21:
                outstanding.append((days, assignment))
        per_course.append((course, sorted(outstanding, key=lambda item: item[0])))

    lines = ["# CourseWorks briefing", "", "Generated {}.".format(_display_time(current)), ""]
    if not any(buckets.values()):
        lines.extend(["Nothing urgent is currently visible.", ""])
    for heading, items in buckets.items():
        if not items:
            continue
        lines.extend(["## {}".format(heading), ""])
        for _, course, assignment in sorted(items, key=lambda item: item[0]):
            lines.append(
                "- **{}:** [{}]({}) — {}".format(
                    course.get("course_code") or course.get("name"),
                    assignment.get("name") or "Untitled assignment",
                    assignment.get("html_url") or "#",
                    _due_label(assignment.get("due_at"), current),
                )
            )
        lines.append("")

    lines.extend(["## Course briefings", ""])
    for course, outstanding in per_course:
        label = course.get("name") or "Untitled course"
        if course.get("course_code"):
            label = "{} — {}".format(course["course_code"], label)
        lines.extend(["### {}".format(label), ""])
        if outstanding:
            lines.append("**Next work**")
            lines.append("")
            for _, assignment in outstanding[:5]:
                lines.append(
                    "- [{}]({}) — {}".format(
                        assignment.get("name") or "Untitled assignment",
                        assignment.get("html_url") or "#",
                        _due_label(assignment.get("due_at"), current),
                    )
                )
            lines.append("")
        else:
            lines.extend(["No unsubmitted work due in the next 21 days.", ""])

        announcements = course.get("announcements") or []
        if announcements:
            lines.extend(["**Recent announcements**", ""])
            for announcement in announcements[:3]:
                lines.append(
                    "- [{}]({})".format(
                        announcement.get("title") or "Untitled announcement",
                        announcement.get("html_url") or "#",
                    )
                )
            lines.append("")

    warnings = snapshot.get("warnings") or []
    if warnings:
        lines.extend(["## Collection warnings", ""])
        lines.extend("- {}".format(warning) for warning in warnings)
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def _parse_date(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _display_time(value: datetime) -> str:
    return value.astimezone().strftime("%b %-d, %Y at %-I:%M %p %Z")


def _due_label(value: Optional[str], now: datetime) -> str:
    due = _parse_date(value)
    if not due:
        return "due date unavailable"
    delta = due - now
    if delta.total_seconds() < 0:
        prefix = "overdue"
    elif delta.total_seconds() <= 86400:
        prefix = "due within 24 hours"
    else:
        prefix = "due"
    return "{} {}".format(prefix, due.astimezone().strftime("%a, %b %-d at %-I:%M %p"))
