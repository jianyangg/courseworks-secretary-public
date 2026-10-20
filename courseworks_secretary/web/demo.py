"""Fictional coursework for a credential-free preview of the real interface."""

from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from ..config import TIME_ZONE


DEMO_SOURCE = "https://github.com/jianyangg/courseworks-secretary-public/blob/master/docs/demo.md"


def demo_data(now: datetime | None = None) -> tuple[dict, dict]:
    current = now or datetime.now(timezone.utc)
    local = current.astimezone(ZoneInfo(TIME_ZONE))

    def deadline(days, hour=23, minute=59):
        return (local + timedelta(days=days)).replace(hour=hour, minute=minute, second=0, microsecond=0)

    courses = [
        {"id": 9001, "name": "Machine Learning", "course_code": "Machine Learning", "assignments": []},
        {"id": 9002, "name": "Data Visualization", "course_code": "Data Visualization", "assignments": []},
        {"id": 9003, "name": "Design Studio", "course_code": "Design Studio", "assignments": []},
    ]
    guide_courses = [{
        "id": str(course["id"]), "title": course["name"], "shortTitle": course["name"],
        "colorKey": course["course_code"], "subtitle": "Fictional course · demo data",
        "courseUrl": DEMO_SOURCE, "sourceLabel": "Demo sources", "sections": [{"label": "Reviewed deadlines", "items": []}],
    } for course in courses]
    records = [
        (1, 0, "Tell a story with a messy dataset", False, "Build a clear chart and explain the choice of visual encoding."),
        (0, 1, "Problem set 3: search algorithms", False, "Submit the solutions and a short explanation of each approach."),
        (2, 3, "Project proposal", True, "A short brief, one prototype, and the questions to test next."),
        (0, 5, "Midterm exam", True, "Review the problem sets and bring the permitted reference sheet."),
        (1, 10, "Interactive dashboard", True, "Submit the working dashboard, data notes, and a short walkthrough."),
        (2, 37, "Final project showcase", True, "Present the final prototype and reflect on the design decisions."),
    ]
    for index, (course_index, days, title, major, detail) in enumerate(records, start=1):
        due = deadline(days)
        courses[course_index]["assignments"].append({
            "id": 9100 + index, "name": title, "due_at": due.isoformat(), "points_possible": 100,
            "grading_type": "points", "external_links": [{"label": "Demo source", "url": DEMO_SOURCE}],
        })
        guide_courses[course_index]["sections"][0]["items"].append({
            "title": title, "dueOn": due.date().isoformat(), "date": due.strftime("%b %-d"),
            "deadlineTime": due.strftime("%-I:%M %p"), "canvasAssignmentId": 9100 + index,
            "sourceUrl": DEMO_SOURCE, "detail": detail, "isGraded": True,
            "showInAssessmentOverview": major,
        })
    prep = deadline(2, 10, 0)
    guide_courses[0]["sections"].append({"label": "Prepare before class", "items": [{
        "title": "Prepare: model evaluation", "dueOn": prep.date().isoformat(),
        "date": prep.strftime("%b %-d"), "deadlineTime": "10:00 AM", "sourceUrl": DEMO_SOURCE,
        "detail": "Read the model evaluation notes and bring one question to the discussion.",
    }]})
    return ({"generated_at": current.isoformat(), "student": {"id": "demo", "name": "Demo"},
             "courses": courses, "warnings": []},
            {"reviewedAt": current.isoformat(), "timeZone": TIME_ZONE, "courses": guide_courses})
