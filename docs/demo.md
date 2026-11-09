# Demo

The demo is the real dashboard filled with three made-up courses: Machine Learning, Data Visualization, and Design Studio. Dates move with today's date, so there is always upcoming work. It needs no Canvas account and makes no outside requests.

## Open it

With the project installed ([technical reference](../TECHNICAL_SETUP.md#install-and-preview)), run:

```sh
python -m uvicorn api.index:app --host 127.0.0.1 --port 8000
```

Then open `http://127.0.0.1:8000/demo`. (`/demo?preview=1` adds padding on a plain background, for screenshots.)

## A two-minute tour

1. **Top-left menu.** Switch between the five views. They all show the same tasks.
2. **Timeline.** Scroll the days ahead. Preparation items (like reading before class) are shown apart from deadlines. Open a task to read its instructions and source link.
3. **Course chips** under the title. Turn a course off to hide it everywhere.
4. **Calendar.** Pick a day to see its agenda below the month.
5. **Wave.** Bars show estimated hours due each day; the strip underneath shows the daily pace. Try **1 wk** to **8 wk**, then click a day and change a task's size.
6. **Graded work.** Only work that affects your grade. **Mark done** hides something Canvas can't see you finished (undo it from the **Marked done** list). Select a few items to send them to Aiken Chat together.
7. **Exams & projects.** The big assessments, grouped by course.
8. **Course guide.** The short brief for each course, built from the sample sources below.

**Reset demo**, next to **Course guide**, regenerates the sample. Done marks and size changes are saved only in your browser.

The banner at the top links to [the beginner guide](../GET_STARTED.md) for setting it up with your own courses.

## Sources

Demo source links point to this document. All courses, instructions, and grading details below are invented. They provide context for the authored example briefs. Dates move with the viewing date.

Start the local server using the README, then open `http://127.0.0.1:8000/demo`. The `/demo?preview=1` presentation keeps the real interface on a solid background with additional padding for product images.

### Machine Learning syllabus

Problem sets count for 40%, the midterm for 30%, and a final model report for 30%. Problem sets are individual. Students may discuss approaches but must write their own solutions and acknowledge outside help. Late problem sets lose 10% per day for at most two days; later work receives no credit.

### Machine Learning assignments

Problem sets require a PDF write-up and an executed notebook submitted on Canvas, including an explanation of the reasoning. Model evaluation preparation requires reading the notes and bringing a question to class. The course leads into a reproducible model report.

### Machine Learning announcement

The midterm permits one handwritten reference sheet. Devices and online notes are not permitted.

### Data Visualization syllabus

Chart assignments count for 30%, the final dashboard for 50%, and studio critiques for 20%. Critique attendance and feedback are required. Visualizations need readable labels and alternatives to color alone.

### Data Visualization assignments

The dataset story requires one chart and a 200-word explanation of the visual encoding. The dashboard submission includes its link, source files, data notes, and a short walkthrough on Canvas.

### Data Visualization announcement

Personal records must be aggregated or removed before a dashboard is published. The data notes must identify the source and cleaning decisions.

### Design Studio syllabus

The proposal counts for 15%, the prototype for 25%, the final showcase for 50%, and critiques for 10%. Teams have two or three members. Test with at least three participants, document the resulting changes, and name each member's contribution in the final reflection.

### Design Studio assignments

The proposal requires a short brief, an early prototype, and questions for the next test. The project progresses through testing and iteration to a final showcase.

### Design Studio announcement

The final showcase requires a working prototype and a reflection on design decisions. A slide deck alone is insufficient.
