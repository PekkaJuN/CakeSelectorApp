#!/usr/bin/env python3
"""
Order Reporter Flask UI

Usage:
  python ui/app.py

Then open http://127.0.0.1:5002 in a browser.
"""

from __future__ import annotations

import os
import sys
from datetime import date
from pathlib import Path

from flask import Flask, render_template, request, jsonify

AGENT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AGENT_DIR))

from agent_env import load_agent_environment
load_agent_environment()

from order_core import get_weekly_report

app = Flask(__name__, template_folder="templates")


def get_db_path() -> str:
    """Get database path from env or default."""
    if env_db := os.environ.get("DATABASE_URL"):
        return env_db
    agent_root = AGENT_DIR.parent.parent
    return str(agent_root / "cake-selector.db")


@app.route("/")
def index():
    """Home page with report form."""
    today = date.today().isoformat()
    return render_template("index.html", default_date=today)


@app.route("/api/report", methods=["POST"])
def get_report():
    """API endpoint to fetch weekly report."""
    data = request.get_json() or {}
    reference_date = data.get("reference_date")
    locale = data.get("locale", "en")

    try:
        result = get_weekly_report(
            reference_date=reference_date,
            db_path=get_db_path(),
            locale=locale,
        )
        return jsonify(result)
    except Exception as exc:
        return jsonify({"status": "error", "error": str(exc)}), 500


if __name__ == "__main__":
    port = int(os.environ.get("FLASK_PORT", 5002))
    app.run(debug=True, host="127.0.0.1", port=port)
