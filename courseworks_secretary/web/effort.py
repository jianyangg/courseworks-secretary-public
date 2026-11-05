"""Estimated effort ("task size") for timeline work.

Sizes come from the course-guide review: the reviewing agent reads the
assignment and syllabus and records an hour estimate with a one-line basis.
The scheduled sync never invents a size. Work nobody has estimated stays
unsized, so the workload view can show it as unknown instead of guessing.

Two places in a guide can hold an estimate:

* ``effort`` on a dated guide item (or one of its ``occurrences``). The item
  already merges with its Canvas record, so the estimate travels with it.
* ``effortEstimates`` on a guide course, for Canvas assignments the guide does
  not otherwise list. Each entry names its ``canvasAssignmentId``; similar
  titles alone never establish identity.
"""

from typing import Any, Dict, Iterable, List, Optional

from .task_identity import course_key, identity_keys

# A single assignment estimated beyond this is almost certainly a typo
# (e.g. minutes entered as hours) rather than a real workload.
MAX_EFFORT_HOURS = 200


def parse_effort(value: Any, where: str = "effort") -> Optional[Dict[str, Any]]:
    """Return a normalised ``{"hours", "basis"}`` record, or None when absent.

    Malformed estimates raise instead of being dropped, so a bad guide upload
    fails loudly rather than silently showing work as unsized.
    """
    if value is None:
        return None
    if not isinstance(value, dict):
        raise ValueError(f"{where} must be an object with hours and basis")
    hours = value.get("hours")
    # bool is a subclass of int in Python; `true` is not a number of hours.
    if isinstance(hours, bool) or not isinstance(hours, (int, float)):
        raise ValueError(f"{where}.hours must be a number")
    if not 0 < hours <= MAX_EFFORT_HOURS:
        raise ValueError(f"{where}.hours must be above 0 and at most {MAX_EFFORT_HOURS}")
    basis = value.get("basis")
    if not isinstance(basis, str) or not basis.strip():
        raise ValueError(f"{where}.basis must explain the estimate")
    return {"hours": hours, "basis": basis.strip()}


def item_effort(item: Dict[str, Any], occurrence: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    # An occurrence's own estimate wins, even when it differs from the item's:
    # recurring work such as a long lab week can be bigger than the usual one.
    if "effort" in occurrence:
        return parse_effort(occurrence["effort"], "occurrence effort")
    return parse_effort(item.get("effort"), "item effort")


def course_effort_estimates(guide: Dict[str, Any]) -> Dict[str, Dict[str, Any]]:
    """Map each Canvas assignment key to its course-level estimate."""
    estimates: Dict[str, Dict[str, Any]] = {}
    for course in guide.get("courses") or []:
        entries = course.get("effortEstimates")
        if entries is None:
            continue
        label = course.get("title") or "course"
        if not isinstance(entries, list):
            raise ValueError(f"{label}: effortEstimates must be a list")
        parent = course_key(course)
        if parent is None:
            raise ValueError(f"{label}: effortEstimates need canvasCourseId or a Canvas courseUrl")
        for entry in entries:
            if not isinstance(entry, dict):
                raise ValueError(f"{label}: each effort estimate must be an object")
            identifier = entry.get("canvasAssignmentId")
            if isinstance(identifier, bool) or not str(identifier).isdigit():
                raise ValueError(f"{label}: each effort estimate needs a numeric canvasAssignmentId")
            key = f"{parent}/assignments/{identifier}"
            if key in estimates:
                raise ValueError(f"{label}: assignment {identifier} is estimated twice")
            estimates[key] = parse_effort(entry, f"{label} assignment {identifier} effort")
    return estimates


def apply_course_estimates(tasks: Iterable[Dict[str, Any]], estimates: Dict[str, Dict[str, Any]]) -> None:
    """Attach course-level estimates to tasks that have none of their own.

    Matching uses every identity key, so a quiz or graded discussion that
    Canvas backs with an assignment picks up that assignment's estimate.
    """
    if not estimates:
        return
    for task in tasks:
        if task.get("effort"):
            continue
        matches: List[str] = sorted(key for key in identity_keys(task) if key in estimates)
        if matches:
            task["effort"] = estimates[matches[0]]
