#!/usr/bin/env python3
"""Memory store for order reporter sessions and insights."""

from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import json


class MemoryStore:
    """Local JSON-based memory for sessions and insights."""

    def __init__(self, data_dir: Optional[Path] = None):
        if data_dir is None:
            data_dir = Path(__file__).parent / "data"
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.sessions_file = self.data_dir / "sessions.json"
        self.insights_file = self.data_dir / "insights.json"

    def add_session(self, session: Dict[str, Any]) -> None:
        """Record a report session."""
        sessions = self._load_json(self.sessions_file)
        sessions.append({
            **session,
            "timestamp": datetime.now().isoformat(),
        })
        self._save_json(self.sessions_file, sessions)

    def add_insight(self, insight: Dict[str, Any]) -> None:
        """Record a notable insight."""
        insights = self._load_json(self.insights_file)
        insights.append({
            **insight,
            "timestamp": datetime.now().isoformat(),
        })
        self._save_json(self.insights_file, insights)

    def get_recent_sessions(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve recent report sessions."""
        sessions = self._load_json(self.sessions_file)
        return sessions[-limit:]

    def get_recent_insights(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Retrieve recent insights."""
        insights = self._load_json(self.insights_file)
        return insights[-limit:]

    def _load_json(self, path: Path) -> List[Dict[str, Any]]:
        """Load JSON file, return empty list if it doesn't exist."""
        if not path.exists():
            return []
        try:
            return json.loads(path.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, IOError):
            return []

    def _save_json(self, path: Path, data: List[Dict[str, Any]]) -> None:
        """Save JSON file."""
        path.write_text(json.dumps(data, indent=2), encoding="utf-8")
