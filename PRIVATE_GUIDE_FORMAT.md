# Private course guide

Store the approved guide at `work/courseworks/course-guide.json`. The directory is ignored by Git and deployment packaging. Keep personal course content and study materials outside tracked project files.

The guide is a distilled course brief. Use [COURSE_GUIDE_UPDATE.md](COURSE_GUIDE_UPDATE.md) to review all relevant sources and extract the essential requirements before filling this format. Keep undated grading, submission, and policy facts alongside dated actions.

A guide has an ISO review timestamp with a timezone and a `courses` list. Each course has a stable `id`, a `title`, `shortTitle`, `colorKey`, and `sections`. Use `canvasCourseId` and the course URL to bind a renamed guide course to Canvas reliably.

```json
{
  "reviewedAt": "2026-10-20T12:00:00-04:00",
  "courses": [{
    "id": "example-course",
    "canvasCourseId": 123,
    "title": "Example Course",
    "shortTitle": "EX101",
    "colorKey": "EX101",
    "courseUrl": "https://school.instructure.com/courses/123",
    "sections": [{
      "label": "At a glance",
      "note": "Weekly individual work builds toward a team project. Keep the implementation reproducible and explain the decisions."
    }, {
      "label": "Must know",
      "bullets": [{
        "text": "Submit the project code and a PDF report through Canvas; name each team member's contribution.",
        "url": "https://school.instructure.com/courses/123/assignments/456"
      }]
    }, {
      "label": "Major assessments",
      "items": [{
        "title": "Project presentation",
        "canvasAssignmentId": 456,
        "date": "Nov 3",
        "dueOn": "2026-11-03",
        "deadlineTime": "10:00 AM",
        "isGraded": true,
        "showInAssessmentOverview": true,
        "detail": "Present the working project and explain the main decisions.",
        "sourceUrl": "https://school.instructure.com/courses/123/assignments/456"
      }]
    }]
  }]
}
```

`canvasAssignmentId` is optional when the source URL already identifies that assignment. It lets a guide use a different title without creating another deadline. The same assignment's current Canvas deadline and submission state take precedence in the work lists, while source conflicts remain visible. Similar names alone do not establish identity.

Set `showInAssessmentOverview: true` for reviewed exams and major projects. Dated items appear on the timeline. Undated facts belong in guide-only `items`, `bullets`, or `note` fields. Put URLs in `sourceUrl` or labelled `links` records. Content is displayed as text.

Include `deadlineTime` only when the source gives an actual time. Date-only entries stay date-only in exports. Items in a **Prepare before class** section receive the existing 7 PM preceding-day reminder; their actual deadline is retained separately. A shared source link does not merge independent preparation with the submission itself.

A refresh does not change the guide's review timestamp or interpret new announcements. Review conflicts and proposed changes against their sources before updating this file. For optional personal hosting, use `python courseworks.py guide-upload` after approval.

For recurring work, use an `occurrences` list with each source-confirmed `dueOn`. Dated occurrences stay separate even when they share an assignment source; completion of one occurrence does not hide the next.
