# Technical setup

This page is for coding agents and people comfortable with a terminal. Start with the [README](README.md) for the guided setup.

## Run on your computer

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

Open `http://localhost:8000` and sign in with the dashboard password you chose. On Windows, activate the virtual environment with `.venv\Scripts\activate` instead of `source .venv/bin/activate`.

For Vercel, create a new project and **private** Blob store. If you have an approved personal guide, set `BLOB_READ_WRITE_TOKEN` in your local `.env` and run `python courseworks.py guide-upload` to send it to that store. Set `COURSEWORKS_API_TOKEN`, `AUTH_PASSWORD_HASH`, `SESSION_SECRET`, `CRON_SECRET`, and `BLOB_READ_WRITE_TOKEN` from your private `.env` and Blob connection in that project's environment settings. Do not reuse somebody else's deployment or storage. The included daily cron route uses `CRON_SECRET`. [Vercel Hobby allows a daily cron job](https://vercel.com/docs/cron-jobs/usage-and-pricing).

## Privacy

The `.env` file, local snapshots, briefings, and Vercel metadata are ignored by Git. The Blob store must stay private. This repository has no student courses or account data. If you later commit personal files or secrets, inspect Git history before making your own repository public; a fresh repository is safer than changing the visibility of one with private history.
