#!/usr/bin/env python3
"""
Order Reporter Agent CLI

Usage:
  python order_reporter_agent.py
  python order_reporter_agent.py --date 2025-02-15
  python order_reporter_agent.py --locale fi
  python order_reporter_agent.py --json
  python order_reporter_agent.py --help
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, Optional

from agent_env import load_agent_environment

load_agent_environment()

AGENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(AGENT_DIR))

from order_core import get_weekly_report


def get_db_path() -> Optional[str]:
    """Determine the database path from environment or default location."""
    if env_db := os.environ.get("DATABASE_URL"):
        return env_db

    agent_dir = Path(__file__).resolve().parent
    project_root = agent_dir.parent.parent
    db_path = project_root / "cake-selector.db"

    if db_path.exists():
        return str(db_path)
    return None


def print_readable(result: Dict[str, Any]) -> None:
    """Print a readable CLI answer."""
    if result.get("status") != "success":
        print(result.get("error") or "Unknown error")
        return
    print(result.get("answer", ""))


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Order Reporter Agent")
    parser.add_argument(
        "--date",
        default=None,
        help="Reference date for the week (YYYY-MM-DD, default: today)",
    )
    parser.add_argument(
        "--locale",
        default="en",
        choices=["en", "fi"],
        help="Output language",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Output raw JSON",
    )
    parser.add_argument(
        "--db",
        default=None,
        help="Path to SQLite database (default: cake-selector.db in project root)",
    )
    return parser


def run_report(
    date_str: Optional[str],
    locale: str,
    db_path: Optional[str],
) -> Dict[str, Any]:
    """Run the weekly order report."""
    if not db_path:
        db_path = get_db_path()

    if not db_path:
        return {
            "status": "error",
            "error": "Database not found. Set DATABASE_URL env var or use --db flag.",
        }

    try:
        result = get_weekly_report(reference_date=date_str, db_path=db_path, locale=locale)
        return result
    except Exception as exc:
        return {
            "status": "error",
            "error": str(exc),
        }


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    result = run_report(
        date_str=args.date,
        locale=args.locale,
        db_path=args.db,
    )

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print_readable(result)

    sys.exit(0 if result.get("status") == "success" else 1)


if __name__ == "__main__":
    main()
