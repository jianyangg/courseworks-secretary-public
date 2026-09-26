# Private course guide format

Keep the completed file at `work/courseworks/course-guide.json`. That directory is ignored by Git and Vercel. Do not add personal course details to tracked Python, JavaScript, Markdown, or test files.

The file is JSON with a review timestamp and a `courses` array. Each course needs a stable `id`, `title`, `shortTitle`, `colorKey`, and `sections`. Match `title`, `shortTitle`, or `colorKey` to the synced CourseWorks course name or code so fresh announcements and links can join the guide.

```json
{
  "reviewedAt": "2026-01-01T12:00:00-05:00",
  "courses": [
    {
      "id": "example-course",
      "title": "Example Course",
      "shortTitle": "EX101",
      "colorKey": "EX101",
      "subtitle": "Reviewed syllabus and current announcements",
      "sourceLabel": "CourseWorks syllabus",
      "courseUrl": "https://courseworks2.columbia.edu/courses/123",
      "sections": [
        {
          "label": "Upcoming work",
          "items": [
            {
              "date": "Oct 1",
              "dueOn": "2026-10-01",
              "title": "Example assignment",
              "detail": "Submit the required report.",
              "sourceUrl": "https://courseworks2.columbia.edu/courses/123/assignments/456"
            }
          ]
        },
        {
          "label": "Course rules",
          "bullets": [
            {"text": "Example attendance rule."}
          ]
        }
      ]
    }
  ]
}
```

Dated `items` can appear on the timeline. Undated facts should stay in the guide. Add `deadlineTime` only when a source specifies a time. Keep summaries brief and link to the source. Review conflicts with the user instead of guessing. Once approved, run `python courseworks.py guide-upload` to update the private website copy.
