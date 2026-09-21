#!/usr/bin/env python3
"""
Cake Recommender Agent Flask UI

Run: python ui/app.py
Visit: http://127.0.0.1:5003
"""

import sys
import subprocess
import json
from pathlib import Path

from flask import Flask, render_template, request, jsonify

AGENT_DIR = Path(__file__).parent.parent
TOOLS_DIR = AGENT_DIR / "tools"
sys.path.insert(0, str(AGENT_DIR))

from agent_env import load_env

load_env()

app = Flask(__name__, template_folder="templates")

def query_database(dietary_flag=None, serves=None):
    """Call cake_database_tool."""
    cmd = [sys.executable, str(TOOLS_DIR / "cake_database_tool.py")]

    if dietary_flag:
        cmd.extend(["--query", dietary_flag])
    if serves:
        cmd.extend(["--serves", str(serves)])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        return json.loads(result.stdout)
    return None

@app.route("/")
def index():
    """Home page with cake recommendation form."""
    return render_template("index.html")

@app.route("/api/recommend", methods=["POST"])
def recommend():
    """API endpoint for cake recommendations."""
    data = request.get_json()
    dietary = data.get("dietary_restriction")
    serves = data.get("serves")

    if serves:
        try:
            serves = int(serves)
        except (ValueError, TypeError):
            serves = None

    result = query_database(dietary_flag=dietary, serves=serves)

    if not result:
        return jsonify({"error": "Database query failed"}), 500

    return jsonify(result)

@app.route("/api/cakes", methods=["GET"])
def list_cakes():
    """List all available cakes."""
    cmd = [sys.executable, str(TOOLS_DIR / "cake_database_tool.py"), "--list"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        return jsonify({"error": "Failed to fetch cakes"}), 500

    return jsonify(json.loads(result.stdout))

if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5003, debug=False)
