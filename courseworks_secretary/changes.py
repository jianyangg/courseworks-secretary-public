"""Detect what changed in CourseWorks between two synced snapshots.

The dashboard otherwise shows only the latest state, so a deadline that moves
from Oct 26 to Oct 28 silently looks like it was always Oct 28. Comparing each
new snapshot with the previous one turns those silent edits into a short feed.

Design notes:
- Changes are computed once, at sync time, and stored inside the new snapshot.
  Reading the dashboard therefore stays a single snapshot load.
- Recent changes are carried forward for CHANGE_RETENTION. Without that, a
  manual Refresh shortly after the scheduled sync would diff two nearly
  identical snapshots and wipe the feed before anyone saw it.
- A source that failed to load in either snapshot is never compared. An empty
  list caused by an HTTP error must not be reported as "every assignment was
  removed".
"""
from datetime import datetime, timedelta
import hashlib
from typing import Any, Dict, Iterable, List, Optional

CHANGE_RETENTION = timedelta(days=7)


def record_changes(current: Dict[str, Any], previous: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    """Attach `changes` (newest first) to `current` and return it."""
    if previous is None:
        # The first sync has nothing to compare against; reporting every
        # assignment as "new" would bury the feed's purpose on day one.
        current["changes"] = []
        return current
    detected_at = current["generated_at"]
    fresh = list(_detect(previous, current, detected_at))
    cutoff = _parse(detected_at) - CHANGE_RETENTION
    carried = [
        change for change in previous.get("changes") or []
        if (when := _parse(change.get("detectedAt"))) is not None and when >= cutoff
    ]
    seen: set[str] = set()
    merged = []
    for change in fresh + carried:
        if change["id"] not in seen:
            seen.add(change["id"])
            merged.append(change)
    current["changes"] = merged
    return current


def _detect(previous: Dict[str, Any], current: Dict[str, Any], detected_at: str) -> Iterable[Dict[str, Any]]:
    old_courses = {course.get("id"): course for course in previous.get("courses") or []}
    for course in current.get("courses") or []:
        old = old_courses.get(course.get("id"))
        # A newly joined course is not a change to existing work; listing its
        # whole term as "new" would drown out real edits.
        if old is None:
            continue
        if _read_succeeded(previous, old, "assignments") and _read_succeeded(current, course, "assignments"):
            yield from _assignment_changes(course, old, detected_at)
        if _read_succeeded(previous, old, "announcements") and _read_succeeded(current, course, "announcements"):
            yield from _announcement_changes(course, old, previous.get("generated_at"), detected_at)


def _assignment_changes(course: Dict[str, Any], old: Dict[str, Any], detected_at: str) -> Iterable[Dict[str, Any]]:
    before = {item.get("id"): item for item in old.get("assignments") or [] if item.get("id") is not None}
    after = {item.get("id"): item for item in course.get("assignments") or [] if item.get("id") is not None}
    for identifier, item in after.items():
        # Finished work is no longer actionable, so its edits are noise.
        if item.get("submitted"):
            continue
        prior = before.get(identifier)
        if prior is None:
            yield _change("new_assignment", course, item, detected_at, due=item.get("due_at"))
        elif _parse(prior.get("due_at")) != _parse(item.get("due_at")):
            yield _change(
                "due_changed", course, item, detected_at,
                due=item.get("due_at"), previous_due=prior.get("due_at"),
            )
    for identifier, item in before.items():
        if identifier not in after and not item.get("submitted"):
            yield _change("removed_assignment", course, item, detected_at, due=item.get("due_at"))


def _announcement_changes(
    course: Dict[str, Any], old: Dict[str, Any], previous_sync: Optional[str], detected_at: str
) -> Iterable[Dict[str, Any]]:
    known = {item.get("id") for item in old.get("announcements") or []}
    since = _parse(previous_sync)
    for item in course.get("announcements") or []:
        if item.get("id") in known:
            continue
        # Announcements are fetched for a sliding date window, so an old post can
        # enter the window without being new. Only posts made after the previous
        # sync count.
        posted = _parse(item.get("posted_at"))
        if posted is None or since is None or posted <= since:
            continue
        yield {
            **_change("new_announcement", course, item, detected_at),
            "title": item.get("title") or "Untitled announcement",
            "postedAt": item.get("posted_at"),
        }


def _change(kind: str, course: Dict[str, Any], item: Dict[str, Any], detected_at: str, **values) -> Dict[str, Any]:
    due, previous_due = values.get("due"), values.get("previous_due")
    # The id covers the change's content, not just the record: if a deadline
    # moves twice, each move is its own entry and is dismissed separately.
    fingerprint = "|".join(str(part) for part in (kind, course.get("id"), item.get("id"), previous_due, due))
    return {
        "id": hashlib.sha256(fingerprint.encode()).hexdigest()[:24],
        "kind": kind,
        "detectedAt": detected_at,
        "courseId": course.get("id"),
        "recordId": item.get("id"),
        "title": item.get("name") or "Untitled assignment",
        "url": item.get("html_url"),
        "due": due,
        "previousDue": previous_due,
    }


def _read_succeeded(snapshot: Dict[str, Any], course: Dict[str, Any], source: str) -> bool:
    if "failed_sources" in course:
        return source not in course["failed_sources"]
    # Snapshots written before failed_sources existed only recorded failures as
    # warning text in the form "<course name>: could not read <source> (...)".
    prefix = "{}: could not read {} (".format(course.get("name"), source)
    return not any(str(warning).startswith(prefix) for warning in snapshot.get("warnings") or [])


def _parse(value: Any) -> Optional[datetime]:
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
    except ValueError:
        return None
