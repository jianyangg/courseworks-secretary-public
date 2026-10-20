"""Conservative identities for Canvas records and reviewed guide deadlines."""

import hashlib
import re
from urllib.parse import urlsplit

from courseworks_secretary.config import BASE_URL


def comparison_key(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "", value.lower())


def resource_key(url) -> str | None:
    if not isinstance(url, str):
        return None
    if url.startswith("/courses/"):
        url = BASE_URL + url
    parsed = urlsplit(url)
    base = urlsplit(BASE_URL)
    if (parsed.scheme, parsed.netloc) != (base.scheme, base.netloc):
        return None
    match = re.fullmatch(r"/courses/(\d+)/(assignments|quizzes|discussion_topics)/(\d+)/?", parsed.path)
    return BASE_URL.rstrip("/") + match.group(0).rstrip("/") if match else None


def course_key(course: dict) -> str | None:
    identifier = course.get("canvasCourseId") or course.get("id")
    if identifier is not None and str(identifier).isdigit():
        return f"{BASE_URL.rstrip('/')}/courses/{identifier}"
    for url in (course.get("courseUrl"), course.get("sourceUrl")):
        parsed = urlsplit(url or "")
        match = re.match(r"/courses/(\d+)(?:/|$)", parsed.path)
        if parsed.netloc == urlsplit(BASE_URL).netloc and match:
            return f"{BASE_URL.rstrip('/')}/courses/{match[1]}"
    return None


def canvas_record_key(course: dict, record: dict, record_type="assignment") -> str | None:
    linked = resource_key(record.get("html_url"))
    if linked:
        return linked
    kinds = {"assignment": "assignments", "quiz": "quizzes", "discussion_topic": "discussion_topics"}
    parent = course_key(course)
    identifier = record.get("id")
    if parent and record_type in kinds and identifier is not None:
        return f"{parent}/{kinds[record_type]}/{identifier}"
    return None


def guide_record_key(course: dict, item: dict, url, links: list) -> str | None:
    parent = course_key(course)
    explicit = item.get("canvasAssignmentId")
    if parent and explicit is not None:
        return f"{parent}/assignments/{explicit}"
    linked = resource_key(url)
    if linked:
        return linked
    references = {key for link in links if (key := resource_key(link.get("url")))}
    return references.pop() if len(references) == 1 else None


def is_preparation(task: dict) -> bool:
    return bool(task.get("isPreparation") or re.search(r"\bprepar", task.get("title", ""), re.I))


def matching_task(candidate: dict, tasks: list, zone) -> dict | None:
    aliases = {comparison_key(alias) for alias in candidate.get("courseAliases") or []}
    for task in tasks:
        preparation_annotation = (
            candidate.get("reviewed") and is_preparation(candidate) and not task.get("reviewed") and not task.get("completed")
            and comparison_key(candidate["title"]) == comparison_key(task["title"])
            and candidate["due"] == task["due"]
        )
        if (is_preparation(candidate) != is_preparation(task) and not preparation_annotation
                or candidate.get("kind") != task.get("kind")):
            continue
        first, second = candidate.get("recordKey"), task.get("recordKey")
        if first and second:
            if first == second:
                return task
            continue
        first_course, second_course = candidate.get("courseKey"), task.get("courseKey")
        if first_course and second_course and first_course != second_course:
            continue
        same_course = (first_course and first_course == second_course) or bool(
            aliases & {comparison_key(alias) for alias in task.get("courseAliases") or []}
        )
        if (same_course and comparison_key(candidate["title"]) == comparison_key(task["title"])
                and candidate["due"].astimezone(zone).date() == task["due"].astimezone(zone).date()):
            return task
    return None


def merge_task(target: dict, incoming: dict, zone) -> None:
    links = []
    for record in (target, incoming):
        if record.get("url") and not any(link["url"] == record["url"] for link in record.get("links") or []):
            links.append({"label": record.get("sourceLabel") or "Source", "url": record["url"]})
        links.extend(record.get("links") or [])
    unique = {}
    for link in links:
        unique.setdefault(link["url"], link)
    target["links"] = list(unique.values())
    target["completed"] = bool(target.get("completed") or incoming.get("completed"))
    if incoming.get("detail"):
        target["detail"] = incoming["detail"]
    if incoming.get("reviewed") and incoming["title"] != target["title"]:
        target["guideTitle"] = incoming["title"]
    if incoming.get("showInAssessmentOverview"):
        target["showInAssessmentOverview"] = True
    if incoming.get("recordKey"):
        target["recordKey"] = target.get("recordKey") or incoming["recordKey"]
    if is_preparation(incoming):
        target["isPreparation"] = True
    if incoming.get("isGraded") is not None and incoming.get("reviewed"):
        target["isGraded"] = incoming["isGraded"] is True
    if incoming.get("reviewed"):
        same_day = target["due"].astimezone(zone).date() == incoming["due"].astimezone(zone).date()
        if not same_day or (not incoming.get("deadlineIsDateOnly") and target["due"] != incoming["due"]):
            target["deadlineConflict"] = {
                "synced": target["due"].isoformat(), "reviewed": incoming["due"].isoformat(),
            }


def stable_task_id(task: dict) -> str:
    identity = task.get("recordKey") or "|".join((
        task.get("courseKey") or task["course"], task["title"], task["due"].isoformat(),
    ))
    identity += ":preparation" if is_preparation(task) else ":deadline"
    return hashlib.sha256(identity.encode()).hexdigest()[:24]
