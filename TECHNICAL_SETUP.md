# Personal installation

Each installation uses one owner's Canvas account. Local use comes first; personal hosting is optional.

For guided setup in ChatGPT Work, start with [the beginner guide](GET_STARTED.md). The commands below are the technical reference for setup.

## Install and preview

Use Python 3.12 or newer. Create a virtual environment, activate it, and install the project:

```sh
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
python -m uvicorn api.index:app --host 127.0.0.1 --port 8000
```

Open [the fictional demo](http://127.0.0.1:8000/demo). Stop the server with Ctrl+C before continuing setup. On Windows, use `.venv\Scripts\activate` to activate the environment.

## Configure Canvas

```sh
python courseworks.py setup
```

This creates an owner-readable `.env`. Set these non-secret values there for the institution:

```dotenv
CANVAS_BASE_URL=https://school.instructure.com
CANVAS_TIMEZONE=America/New_York
```

Use an HTTPS Canvas origin without a path, query, or credentials. Use an IANA timezone such as `America/New_York`, `Europe/London`, or `Asia/Singapore`. The defaults are Columbia CourseWorks and New York time. Changing these settings requires restarting the server.

Use the institution's permitted authentication method. The token helper supports an owner's personal development/testing credentials; it does not implement OAuth registration for a shared application. Token creation may be disabled by the institution. [Canvas documents the access requirements](https://developerdocs.instructure.com/services/canvas/oauth2/file.oauth).

Where personal token use is permitted, the account's **Settings → Approved Integrations → New Access Token** page provides the token. Give it a suitable expiration. Enter it only into the following interactive prompt, which hides typing and saves it privately:

```sh
python courseworks.py token-setup
python courseworks.py check
python courseworks.py web-setup
python courseworks.py brief
python -m uvicorn api.index:app --host 127.0.0.1 --port 8000
```

Open [the local dashboard](http://127.0.0.1:8000/) and use the chosen dashboard password. Use at least eight characters and a different password from the institution account. The app stores a password verification value. It permits a non-Secure session cookie only on localhost/127.0.0.1; remote hosting requires HTTPS.

The token is stored in `.env` with owner-only permissions. The app does not need it to render the demo. Never put it into chat, command arguments, tracked files, screenshots, or issue reports. If exposed, revoke it through Canvas and replace it.

## Maintain the private guide

Sync gathers structured records, announcements, and resource links; it does not interpret free-form instructions. Follow [COURSE_GUIDE_UPDATE.md](COURSE_GUIDE_UPDATE.md) with a coding assistant to study the full authorized sources and distill grading, submission rules, preparation, and essential requirements into course briefs. Review the source-linked draft, then save the approved guide using [PRIVATE_GUIDE_FORMAT.md](PRIVATE_GUIDE_FORMAT.md).

Keep the guide and study materials under ignored private paths. Records linked to a Canvas assignment share its submission status and current deadline. Conflicts with the reviewed guide remain visible for review. Independent preparation remains separate.

## Optional personal website

Deploy a separate copy for the owner. Use the project's Vercel configuration and a private Blob store. Set the following deployment environment variables through private input:

- `COURSEWORKS_API_TOKEN`
- `CANVAS_BASE_URL` and `CANVAS_TIMEZONE`
- `AUTH_PASSWORD_HASH`, `SESSION_SECRET`, and `CRON_SECRET` from local setup
- `BLOB_READ_WRITE_TOKEN` from the owner's private store

The Vercel project, credentials, and store belong to that installation. Use HTTPS and keep storage private. Do not share a deployment or its password unless everyone with access should see the same account's coursework.

To upload an approved guide, make the owner's Blob credential available privately, then run:

```sh
python courseworks.py guide-upload
```

The configured daily cron refreshes structured records. Personal hosting availability and usage limits depend on the hosting provider; local use does not need hosting or Blob credentials.

## Verification and troubleshooting

```sh
python -m pip install -e '.[test]'
python -m unittest discover -s tests
node --test tests/*.js
```

- **No courses:** check the configured Canvas origin and account's active enrollments.
- **401 or expired credentials:** check the institution's access rules and replace or renew the applicable credential privately.
- **Refresh has gaps:** inspect the reported source failures. Existing displayed data is retained after a failed refresh; a successful partial refresh reports missing sources.
- **Missing exam:** add its source-confirmed entry to the private guide and mark it for the assessment overview.
- **Conflicting deadline:** inspect both sources. Do not silently rewrite course instructions.
- **Different timezone:** update `CANVAS_TIMEZONE` and restart.

Inspect tracked files and Git history before sharing a modified repository. `.env`, private guides, snapshots, output, and deployment metadata must stay excluded. The demo endpoints generate only fictional data and do not read account storage.
