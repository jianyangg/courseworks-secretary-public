# CourseWorks Secretary

A personal, read-only CourseWorks dashboard for assignments, deadlines, class activity, and a course guide. Each installation connects to **one person's own CourseWorks account**. Your courses are fetched with your own token; this repository contains no account data. The optional **Add to Aiken** link opens [Aiken Dewit](https://aikendewit.com/) with a draft task for your review.

## Set up with an AI agent

Open this folder in your coding agent and ask:

> Set up CourseWorks Secretary for my own CourseWorks account. Explain the steps I must do myself. Keep my token and course data out of Git and chat. Run the tests, then help me run the dashboard locally. Ask me before publishing a deployment.

You must create your own CourseWorks access token in **Account → Settings → Approved Integrations → New Access Token**. Put it in your local `.env` file, never in chat or Git. A web deployment also needs your own Vercel project, private Blob store, password hash, session secret, and cron secret. Do not connect another person's Blob store or deployment.

## Manual setup

Requires Python 3.12. For local setup:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python courseworks.py setup
```

Put `COURSEWORKS_API_TOKEN=...` in `.env`, then run:

```sh
python courseworks.py check
python courseworks.py web-setup
python courseworks.py brief
```

Run the local FastAPI application with an ASGI server such as `uvicorn api.index:app --reload`. Install the server separately if needed. The dashboard password is set by `web-setup`. The local snapshot and briefing are written under `work/courseworks/`, which is ignored by Git. The course guide is populated from your synced courses, announcements, assignment links, and page links. No example student courses or fixtures are shipped.

For Vercel hosting, create a **new private Blob store** and set your own `COURSEWORKS_API_TOKEN`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET`, and `BLOB_READ_WRITE_TOKEN` in that Vercel project. These values are described in `.env.example`. Deploy only after confirming that project and Blob store belong to you. The scheduled `/api/cron` sync uses `CRON_SECRET`; `/api/sync` allows a signed-in manual refresh. One deployment and one password represent one person's account, so anyone with that password can view that account's data.

## Privacy and publication

Snapshots, briefings, `.env*`, Vercel metadata, and local work files must stay outside Git. The Blob store must remain private. Before publishing a fork, inspect both the current files **and Git history** for personal data and secrets. If private material was ever committed, create a fresh repository with clean history instead of changing that repository's visibility.
