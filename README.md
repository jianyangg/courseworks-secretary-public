# CourseWorks Secretary

**Your coursework, in view.**

A personal dashboard for coursework that is scattered across Canvas pages, announcements, and syllabi. See what is due, what counts toward your grade, and what needs preparation, with links back to the source.

![CourseWorks Secretary showing fictional coursework](docs/showcase/courseworks-secretary-preview.png)

## What it does

- **Timeline:** upcoming deadlines and preparation, with past and later work available when needed.
- **Graded work:** confirmed graded deadlines across the term, with days remaining.
- **Exams & projects:** reviewed major assessments grouped by course.
- **Calendar:** a month view and day-by-day agenda using the same coursework.
- **Course guide:** private, reviewed instructions alongside fresh announcements and source links.
- **Optional Aiken handoff:** open a task draft or copy selected coursework into Aiken Chat for review.

Course filters apply across work views. Matching by Canvas record identity prevents renamed guide entries from creating duplicate deadlines, and known submissions suppress their linked guide deadlines. Preparation start times stay separate from actual deadlines.

## Try the demo

The demo uses fictional courses and the real interface. It needs no Canvas credentials, personal files, or storage account.

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m uvicorn api.index:app --host 127.0.0.1 --port 8000
```

Open [the local demo](http://127.0.0.1:8000/demo). On Windows, activate the environment with `.venv\Scripts\activate` instead. Python 3.12 or newer is required. Node.js is needed only for the JavaScript development checks.

## Make it your own

Each installation belongs to one person. Run it locally, or deploy an individual password-protected copy using the [technical setup guide](TECHNICAL_SETUP.md).

For guided setup, download or clone this repository, open its folder in a coding assistant such as Codex or Claude Code, and send:

> Set up this project using README.md and TECHNICAL_SETUP.md. Start locally and verify the fictional demo first. Configure my Canvas origin and timezone. Explain my institution's access requirements and handle the technical steps. Let me enter credentials through the hidden local token-setup prompt, never in chat or a command argument. Help me choose the dashboard password through web-setup. Refresh my courses and verify they load. Read the sources I authorize, then propose a private course guide using PRIVATE_GUIDE_FORMAT.md. Show source-linked changes and conflicts for review before applying them. Keep credentials, course content, snapshots, and study materials outside tracked project files. Explain optional personal hosting after local setup works.

The dashboard collects accessible structured records. The coding assistant can read additional sources, maintain a reviewed guide, create study materials, and extend the local project when asked. The website itself does not run AI or interpret every announcement automatically.

Exams and project milestones appear when explicitly recorded in a reviewed guide. An exam mentioned only in prose will not automatically become an exam card. New or conflicting instructions still need source review.

## Privacy and access

- Credentials and course files stay in the owner's private configuration and storage. This repository contains no student account or coursework data.
- The app makes read requests to Canvas. Personal tokens may carry broader account permissions, so treat them like passwords.
- Access depends on the institution's Canvas configuration and approved authentication methods. Manual tokens are described by Canvas for individual development/testing; multi-user integrations require OAuth. See [Canvas authentication guidance](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth).
- Anyone who knows an individual deployment's dashboard password can see that installation's courses.
- The app does not submit work, edit Canvas, send messages, or mark coursework complete.

## How I used AI

I built and refined the project with Codex to spend less time hunting for course requirements. I also use an external coding assistant to review course materials and maintain my private guide. The public version provides the reusable application and setup workflow; personal course content is excluded.

## Development

```sh
python -m pip install -e '.[test]'
python -m unittest discover -s tests
node --test tests/*.js
```

See [demo details](docs/demo.md), [technical setup](TECHNICAL_SETUP.md), and [the private guide format](PRIVATE_GUIDE_FORMAT.md).
