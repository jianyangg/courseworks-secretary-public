"""Build a course guide from the account's private synced snapshot."""

from datetime import datetime, timezone
from typing import Any, Dict

from .synced_guide import add_synced_course_data


def build_course_guide(snapshot: Dict[str, Any] | None = None) -> Dict[str, Any]:
    courses = []
    for course in (snapshot or {}).get("courses") or []:
        course_id = course.get("id")
        if course_id is None:
            continue
        title = str(course.get("name") or course.get("course_code") or "Course")
        code = str(course.get("course_code") or title)
        courses.append({
            "id": str(course_id),
            "shortTitle": code,
            "title": title,
            "colorKey": code,
            "subtitle": "Synced from CourseWorks",
            "sourceLabel": "CourseWorks",
            "courseUrl": course.get("html_url"),
            "sections": [],
        })
    reviewed_at = (snapshot or {}).get("generated_at") or datetime.now(timezone.utc).isoformat()
    return add_synced_course_data({"reviewedAt": reviewed_at, "courses": courses}, snapshot)
