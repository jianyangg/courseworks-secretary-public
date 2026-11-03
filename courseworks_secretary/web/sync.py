from typing import Any, Dict, Optional

from ..canvas import CanvasClient
from ..changes import record_changes
from ..collector import collect_snapshot
from ..config import BASE_URL
from ..credentials import load_token
from ..http import JsonTransport
from .storage import SnapshotStore, snapshot_store


def sync_courseworks(store: Optional[SnapshotStore] = None) -> Dict[str, Any]:
    target = store or snapshot_store()
    client = CanvasClient(JsonTransport(BASE_URL, load_token()))
    snapshot = record_changes(collect_snapshot(client), target.load_latest())
    target.save(snapshot)
    return snapshot
