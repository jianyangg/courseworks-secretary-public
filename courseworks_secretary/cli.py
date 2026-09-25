import argparse
import json
from pathlib import Path

from .briefing import render_briefing
from .canvas import CanvasClient
from .collector import collect_snapshot
from .config import BASE_URL, BRIEFING_PATH, SNAPSHOT_PATH
from .credentials import MissingCredentialError, initialize_env_file, load_token
from .http import CanvasRequestError, JsonTransport
from .web.setup import configure_web_secrets


def main() -> int:
    parser = argparse.ArgumentParser(description="Private CourseWorks briefing collector")
    subparsers = parser.add_subparsers(dest="command", required=True)
    subparsers.add_parser("setup", help="Create a private local token file")
    subparsers.add_parser("web-setup", help="Configure the private timeline password")
    subparsers.add_parser("check", help="Verify the stored token")
    collect_parser = subparsers.add_parser("collect", help="Refresh the local snapshot")
    collect_parser.add_argument("--snapshot", type=Path, default=SNAPSHOT_PATH)
    brief_parser = subparsers.add_parser("brief", help="Refresh and render a briefing")
    brief_parser.add_argument("--snapshot", type=Path, default=SNAPSHOT_PATH)
    brief_parser.add_argument("--output", type=Path, default=BRIEFING_PATH)
    args = parser.parse_args()

    try:
        if args.command == "setup":
            initialize_env_file()
            print("Ready: add your token to .env as COURSEWORKS_API_TOKEN=...")
            return 0

        if args.command == "web-setup":
            configure_web_secrets()
            print("Web password hash, session secret, and cron secret saved to .env.")
            return 0

        client = _client()
        if args.command == "check":
            profile = client.profile()
            print("Connected to CourseWorks as {}.".format(profile.get("name", "your account")))
            return 0

        snapshot = collect_snapshot(client)
        _write_json(args.snapshot, snapshot)
        print("Saved snapshot to {}".format(args.snapshot))
        if args.command == "brief":
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(render_briefing(snapshot), encoding="utf-8")
            print("Saved briefing to {}".format(args.output))
        return 0
    except (MissingCredentialError, CanvasRequestError, ValueError) as error:
        parser.exit(1, "error: {}\n".format(error))


def _client() -> CanvasClient:
    return CanvasClient(JsonTransport(BASE_URL, load_token()))


def _write_json(path: Path, payload) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
