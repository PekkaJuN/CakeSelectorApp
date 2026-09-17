#!/usr/bin/env python3
"""Subagent: turn structured facts into a family-friendly coaching answer.

Uses Gemini when GEMINI_API_KEY is set; otherwise deterministic templates.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict

AGENT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AGENT_DIR))

from agent_env import load_agent_environment
from homework_core import render_answer
from narrator import narrate_with_gemini

load_agent_environment()


def main() -> None:
    parser = argparse.ArgumentParser(description="Coach narrator subagent")
    parser.add_argument("--query", required=True)
    parser.add_argument("--facts-json", required=True)
    parser.add_argument("--locale", default="en")
    parser.add_argument("--use-gemini", action="store_true")
    args = parser.parse_args()

    facts_path = Path(args.facts_json)
    facts = json.loads(facts_path.read_text(encoding="utf-8") if facts_path.exists() else args.facts_json)
    template = render_answer(
        args.query,
        facts.get("plan") or {},
        facts.get("week_plan") or {},
        facts.get("contributions") or {},
        facts.get("intent") or "both",
        args.locale,
    )
    answer = (
        narrate_with_gemini(args.query, facts, args.locale, template)
        if args.use_gemini
        else template
    )
    print(
        json.dumps(
            {
                "status": "success",
                "subagent": "coach_narrator",
                "data": {"answer": answer, "template_answer": template},
            }
        )
    )
    sys.exit(0)


if __name__ == "__main__":
    main()
