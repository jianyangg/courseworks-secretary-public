# CourseWorks Secretary

**Your coursework, in view.**

A personal dashboard for coursework that is scattered across Canvas pages, announcements, and syllabi. See what is due, what counts toward your grade, and what needs preparation, with links back to the source.

![CourseWorks Secretary showing fictional coursework](docs/showcase/courseworks-secretary-preview.png)

## What it does

- **Timeline:** upcoming deadlines and preparation, with past and later work available when needed.
- **Graded work:** confirmed graded deadlines across the term, with days remaining.
- **Exams & projects:** reviewed major assessments grouped by course.
- **Calendar:** a month view and day-by-day agenda using the same coursework.
- **Course guide:** the essentials distilled across syllabi, course pages, assignments, and announcements: grading, submission rules, preparation, and key requirements.
- **Optional Aiken handoff:** open a task draft or copy selected coursework into Aiken Chat for review.

Course filters apply across work views. Matching by Canvas record identity prevents renamed guide entries from creating duplicate deadlines, and known submissions suppress their linked guide deadlines. Preparation start times stay separate from actual deadlines.

## Start with ChatGPT

[Follow the beginner setup guide](GET_STARTED.md) to make the dashboard useful for your courses. Download the project, open its folder in the ChatGPT desktop app, and ask **Work** to guide you through setup. The guide includes a request you can copy and a simpler route for creating a course brief from your materials.

Work needs access to the project folder and the local tools used for setup. See the official [Work guide](https://learn.chatgpt.com/docs/get-started-with-work) and [local project guide](https://learn.chatgpt.com/docs/projects#use-local-projects-for-folders-and-codebases). Account availability and allowed tools vary.

Each installation belongs to one person. ChatGPT can help set up the supported local application and review authorized course sources. The website displays the resulting coursework and guide. It does not run AI or interpret every announcement automatically.

Use the [course review workflow](COURSE_GUIDE_UPDATE.md) to distill what matters across the full syllabi, assignment instructions, pages, and announcements. Exams and project milestones appear when explicitly recorded in a reviewed guide. New or conflicting instructions still need review.

Codex and Claude Code are also supported setup tools. For commands, the fictional demo, and optional personal hosting, see [technical setup](TECHNICAL_SETUP.md). For ChatGPT Sites, the [beginner guide](GET_STARTED.md#can-i-use-chatgpt-sites) explains the compatibility limits of this Python application.

## Privacy and access

- Credentials and course files stay in the owner's private configuration and storage. This repository contains no student account or coursework data.
- The app makes read requests to Canvas. Personal tokens may carry broader account permissions, so treat them like passwords.
- Access depends on the institution's Canvas configuration and approved authentication methods. Manual tokens are described by Canvas for individual development/testing; multi-user integrations require OAuth. See [Canvas authentication guidance](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth).
- Anyone who knows an individual deployment's dashboard password can see that installation's courses.
- The app does not submit work, edit Canvas, send messages, or mark coursework complete.

## How I used AI

I built and refined the project with Codex to spend less time hunting for course requirements. I also use Codex to study the course sites, syllabi, assignments, and announcements, then distill the essential information into my private course guide. The public version includes the application and review workflow so students can create their own briefs; personal course content is excluded.

## Development

```sh
python -m pip install -e '.[test]'
python -m unittest discover -s tests
node --test tests/*.js
```

See [demo details](docs/demo.md), [technical setup](TECHNICAL_SETUP.md), and [the private guide format](PRIVATE_GUIDE_FORMAT.md).
