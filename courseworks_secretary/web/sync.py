from typing import Any, Dict, Optional

from ..canvas import CanvasClient
from ..collector import collect_snapshot
from ..config import BASE_URL
from ..credentials import load_token
from ..http import JsonTransport
from .storage import SnapshotStore, snapshot_store


def sync_courseworks(store: Optional[SnapshotStore] = None) -> Dict[str, Any]:
    target = store or snapshot_store()
    client = CanvasClient(JsonTransport(BASE_URL, load_token()))
    snapshot = collect_snapshot(client)
    target.save(snapshot)
    return snapshot
