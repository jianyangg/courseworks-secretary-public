# CourseWorks Secretary

A private dashboard for your own CourseWorks classes, deadlines, and announcements. It reads your account; it cannot submit or change coursework. **Add to Aiken** opens [Aiken Dewit](https://aikendewit.com/) with a draft task that you can choose to save.

## Easiest setup: ask an AI coding agent

You do not need to know how to program. Download this project, open its folder in an AI coding agent such as Codex, and paste this request:

> Set up CourseWorks Secretary for me. First get it running on my computer, then ask whether I want a private website. Install what is needed, create the private settings file, guide me through getting my own CourseWorks token and choosing a website password, and verify that my courses load. Then use my syllabi and other course documents to draft a personal course guide and timeline additions, show me the summary and sources for review, and store the approved guide only in the ignored `work/courseworks/course-guide.json` file. If I choose a website, help me create my own free Vercel Hobby project and private Blob store, add my settings, upload my approved private guide to my private Blob store, deploy, and check that the site requires my password. Never show my token or secrets in chat, Git, screenshots, or logs. Stop before any public deployment so I can approve it.

**What you will do yourself:**

1. Sign in to [CourseWorks](https://courseworks2.columbia.edu/). Open **Account → Settings → Approved Integrations → New Access Token**. Create a token and copy it into the private `.env` file when your agent tells you where. Treat it like a password. Do not paste it into chat.
2. Choose a password for your dashboard when the setup program prompts you. This is separate from your Columbia password.
3. If you want a website, sign in to [Vercel](https://vercel.com/) and let the agent guide you through a **new project and private Blob store for your own account**. [Vercel Hobby is free for personal projects](https://vercel.com/docs/plans/hobby), within [its usage limits](https://vercel.com/docs/vercel-blob/usage-and-pricing). You can skip Vercel and use the app only on your computer.

Each installation is for **one person's account**. Whoever knows its dashboard password can see that account's course data. Never share a CourseWorks token or connect another person's Blob store.

## Keeping your courses up to date

There are **two different kinds of updates**:

1. **Structured data:** The app fetches assignments, dates, announcements, and links directly from CourseWorks. On the website, select **Sync**. A Vercel deployment also attempts this once daily; on free Hobby, the job can run at any point within its scheduled hour. Locally, run `python courseworks.py brief` or ask your agent to run it. This does **not** interpret syllabi or create a thoughtful course guide.
2. **Course meaning:** Ask an AI agent to read announcements, syllabi, course pages, and linked documents, then compare them with the structured assignment list. This catches work announced in a message or page before it appears as a CourseWorks assignment, along with preparation, grading rules, and changed instructions. The agent should resolve duplicates, flag conflicts and uncertain dates, and draft useful guide and timeline items with source links. **You review the draft before it changes your guide.** Repeat this when course instructions change. The app does not connect to an LLM automatically.

Copy this request to your agent after the first sync, and again whenever your courses change:

> Pull my current CourseWorks data, including announcements, and review current syllabi, course pages, and linked documents. Compare everything with the assignment list; look specifically for assignments or required preparation mentioned only in announcements or pages. Make a course-by-course summary of deadlines, preparation, grading rules, submission instructions, and conflicts, with source links. Flag any date or requirement that is unclear instead of guessing. Show me the draft for review. After I approve it, save the personal guide in `work/courseworks/course-guide.json`, and add dated actionable items there so they appear on the timeline. Keep this file out of Git. If my website is configured, upload the approved guide to my own private Blob store with `python courseworks.py guide-upload`. Never print my token or publish my course content.

The private guide file follows [this format](PRIVATE_GUIDE_FORMAT.md) and is read locally; the website reads its copy from your private Blob store. The agent can use the built-in generic guide as a starting point, but should not put your personal course information into tracked source files. Your guide is only as current as your last agent review.

## Manual setup

For people comfortable with a terminal, install Python 3.12 and run:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python courseworks.py setup
```

Add your token after `COURSEWORKS_API_TOKEN=` in `.env`. Then run:

```sh
python courseworks.py check
python courseworks.py web-setup
python courseworks.py brief
uvicorn api.index:app --reload
```

Open `http://localhost:8000` and sign in with the dashboard password you chose. On Windows, activate the virtual environment with `.venv\\Scripts\\activate` instead of `source .venv/bin/activate`.

For Vercel, create a new project and **private** Blob store. If you have an approved personal guide, set `BLOB_READ_WRITE_TOKEN` in your local `.env` and run `python courseworks.py guide-upload` to send it to that store. Set `COURSEWORKS_API_TOKEN`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET`, and `BLOB_READ_WRITE_TOKEN` from your private `.env` and Blob connection in that project's environment settings. Do not reuse somebody else's deployment or storage. The included daily cron route uses `CRON_SECRET`. [Vercel Hobby allows a daily cron job](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Privacy

The `.env` file, local snapshots, briefings, and Vercel metadata are ignored by Git. The Blob store must stay private. This repository has no student courses or account data. If you later commit personal files or secrets, inspect Git history before making your own repository public; a fresh repository is safer than changing the visibility of one with private history.
