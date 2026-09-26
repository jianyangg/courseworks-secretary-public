# CourseWorks Secretary

A private dashboard for your own CourseWorks classes, deadlines, and announcements. It reads your account; it cannot submit or change coursework. **Add to Aiken** opens [Aiken Dewit](https://aikendewit.com/) with a draft task that you can choose to save.

## Easiest setup: ask an AI coding agent

You do not need to know how to program. Download this project, open its folder in an AI coding agent such as Codex, and paste this request:

> Set up CourseWorks Secretary for me. First get it running on my computer, then ask whether I want a private website. Install what is needed, create the private settings file, guide me through getting my own CourseWorks token and choosing a website password, and verify that my courses load. If I choose a website, help me create my own free Vercel Hobby project and private Blob store, add my settings, deploy, and check that the site requires my password. Never show my token or secrets in chat, Git, screenshots, or logs. Stop before any public deployment so I can approve it.

**What you will do yourself:**

1. Sign in to [CourseWorks](https://courseworks2.columbia.edu/). Open **Account → Settings → Approved Integrations → New Access Token**. Create a token and copy it into the private `.env` file when your agent tells you where. Treat it like a password. Do not paste it into chat.
2. Choose a password for your dashboard when the setup program prompts you. This is separate from your Columbia password.
3. If you want a website, sign in to [Vercel](https://vercel.com/) and let the agent guide you through a **new project and private Blob store for your own account**. [Vercel Hobby is free for personal projects](https://vercel.com/docs/plans/hobby), within [its usage limits](https://vercel.com/docs/vercel-blob/usage-and-pricing). You can skip Vercel and use the app only on your computer.

Each installation is for **one person's account**. Whoever knows its dashboard password can see that account's course data. Never share a CourseWorks token or connect another person's Blob store.

## Keeping your courses up to date

The app does **not** need a connected LLM. On the website, sign in and select **Sync** whenever you want fresh data. A Vercel deployment also tries to sync once daily; on the free Hobby plan that job can run at any point within its scheduled hour. For a local copy, ask your agent to refresh it or run `python courseworks.py brief` yourself.

The automatic sync collects CourseWorks assignments, announcements, and links. If you want fuller explanations from syllabi or other course pages, ask your agent:

> Refresh my CourseWorks data and review my current syllabi and course pages. Tell me what needs attention, with source links. Use my local token privately. Show me any proposed course-guide additions before changing the app.

Your agent must have access to this folder and your own CourseWorks account. It should not send your token or private course content to a public repository.

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

For Vercel, create a new project and **private** Blob store. Set `COURSEWORKS_API_TOKEN`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET`, and `BLOB_READ_WRITE_TOKEN` from your private `.env` and Blob connection in that project's environment settings. Do not reuse somebody else's deployment or storage. The included daily cron route uses `CRON_SECRET`. [Vercel Hobby allows a daily cron job](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Privacy

The `.env` file, local snapshots, briefings, and Vercel metadata are ignored by Git. The Blob store must stay private. This repository has no student courses or account data. If you later commit personal files or secrets, inspect Git history before making your own repository public; a fresh repository is safer than changing the visibility of one with private history.
