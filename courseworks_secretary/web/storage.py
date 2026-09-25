import json
import os
from pathlib import Path
from typing import Any, Dict, Optional

from ..config import SNAPSHOT_PATH


class SnapshotStore:
    def load_latest(self) -> Optional[Dict[str, Any]]:
        raise NotImplementedError

    def save(self, snapshot: Dict[str, Any]) -> None:
        raise NotImplementedError


class LocalSnapshotStore(SnapshotStore):
    def __init__(self, path: Path = SNAPSHOT_PATH):
        self.path = path

    def load_latest(self) -> Optional[Dict[str, Any]]:
        if not self.path.exists():
            return None
        return json.loads(self.path.read_text(encoding="utf-8"))

    def save(self, snapshot: Dict[str, Any]) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(snapshot), encoding="utf-8")


class BlobSnapshotStore(SnapshotStore):
    PREFIX = "snapshots/"

    def load_latest(self) -> Optional[Dict[str, Any]]:
        from vercel.blob import BlobClient

        client = BlobClient()
        cursor = None
        latest = None
        while True:
            result = client.list_objects(
                prefix=self.PREFIX, cursor=cursor, limit=1000
            )
            for item in result.blobs:
                if latest is None or item.pathname > latest.pathname:
                    latest = item
            if not result.has_more:
                break
            cursor = result.cursor
        if latest is None:
            return None

        result = client.get(latest.pathname, access="private")
        if result.status_code != 200:
            return None
        return json.loads(result.content.decode("utf-8"))

    def save(self, snapshot: Dict[str, Any]) -> None:
        from vercel.blob import BlobClient

        generated = str(snapshot["generated_at"])
        sortable = generated.replace("-", "").replace(":", "").replace("+", "-")
        pathname = "{}{}.json".format(self.PREFIX, sortable)
        BlobClient().put(
            pathname,
            json.dumps(snapshot).encode("utf-8"),
            access="private",
            content_type="application/json",
        )


def snapshot_store() -> SnapshotStore:
    if os.environ.get("BLOB_READ_WRITE_TOKEN"):
        return BlobSnapshotStore()
    return LocalSnapshotStore()
