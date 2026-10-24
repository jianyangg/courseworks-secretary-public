# Interface and password setup checks — October 23, 2026

The work views use a compact list on the left without a heading or border. The active view is slightly larger and heavier, with brief hover and selection transitions. Reduced-motion preferences disable the transitions. The source availability notice can be dismissed. Dismissal persists across page reloads until the next successful sync.

Each installation starts without a dashboard password or password hash. The owner runs `python courseworks.py web-setup` to choose a password and generate a salted password hash and fresh session and cron secrets in the ignored, owner-readable `.env` file. Login returns HTTP 503 until authentication is configured.

All 48 public Python tests and 31 Node checks passed. Password checks cover blank example secrets, unconfigured login, independent hashes and secrets for separate installations, private settings permissions, and rejection of short or mismatched passwords.

A scan of the public working tree and all 193 historical blobs reachable from the fetched repository refs found no matches for the known private password hash, known local credentials, complete literal PBKDF2 password hashes, or private-key markers. The audit reports matches by path only and never prints secret values. This is a scoped credential check, not a comprehensive security audit.

Visual acceptance remains with the project owner. Live Canvas access and deployed behavior were not revalidated for this update.
