#!/usr/bin/env python3
"""
Cake Recommender Agent CLI

Usage:
  python cake_recommender_agent.py --chat
  python cake_recommender_agent.py "What vegan cakes do you have?"
  python cake_recommender_agent.py --help
"""

import argparse
import json
import sys
import subprocess
from pathlib import Path

from agent_env import load_env

load_env()

TOOLS_DIR = Path(__file__).parent / "tools"

def query_database(dietary_flag=None, serves=None):
    """Call cake_database_tool and parse results."""
    cmd = [sys.executable, str(TOOLS_DIR / "cake_database_tool.py")]

    if dietary_flag:
        cmd.extend(["--query", dietary_flag])
    if serves:
        cmd.extend(["--serves", str(serves)])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        return json.loads(result.stdout)
    return None

def handle_query(prompt):
    """Parse user query and return cake recommendations."""
    prompt_lower = prompt.lower()

    # Simple intent detection
    dietary = None
    if "vegan" in prompt_lower:
        dietary = "vegan"
    elif "gluten" in prompt_lower or "gluten-free" in prompt_lower:
        dietary = "gluten-free"
    elif "dairy" in prompt_lower or "dairy-free" in prompt_lower:
        dietary = "dairy-free"

    serves = None
    for word in prompt_lower.split():
        if word.isdigit():
            serves = int(word)
            break

    # Query database
    cakes_data = query_database(dietary_flag=dietary, serves=serves)

    if not cakes_data or cakes_data.get("count", 0) == 0:
        return {
            "answer": "No cakes found matching those criteria. Would you like to see all available cakes?",
            "cakes": [],
            "filters_applied": {"dietary": dietary, "serves": serves}
        }

    # Format response
    cake_names = [c["name"] for c in cakes_data["cakes"]]
    answer = f"I found {cakes_data['count']} cake(s) for you: {', '.join(cake_names)}"

    return {
        "answer": answer,
        "cakes": cakes_data["cakes"],
        "filters_applied": {"dietary": dietary, "serves": serves}
    }

def chat_mode():
    """Interactive chat loop."""
    print("Cake Recommender Agent (type 'quit' to exit)")
    print("-" * 50)

    while True:
        try:
            prompt = input("You: ").strip()
            if prompt.lower() in ["quit", "exit", "q"]:
                break
            if not prompt:
                continue

            result = handle_query(prompt)
            print(f"\nAgent: {result['answer']}")
            if result['cakes']:
                print(f"Details: {len(result['cakes'])} cake(s) match.")
            print()
        except KeyboardInterrupt:
            print("\nGoodbye!")
            break

def main():
    parser = argparse.ArgumentParser(
        description="Cake Recommender Agent",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python cake_recommender_agent.py "What vegan cakes do you have?"
  python cake_recommender_agent.py "Gluten-free cakes for 8 people"
  python cake_recommender_agent.py --chat
        """
    )
    parser.add_argument("prompt", nargs="?", help="Query about cakes")
    parser.add_argument("--chat", action="store_true", help="Interactive chat mode")
    parser.add_argument("--json", action="store_true", help="Output JSON only")

    args = parser.parse_args()

    if args.chat:
        chat_mode()
        return 0

    if not args.prompt:
        parser.print_help()
        return 1

    result = handle_query(args.prompt)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print(result["answer"])
        if result["cakes"]:
            for cake in result["cakes"]:
                print(f"  - {cake['name']} (${cake['price']}, serves {cake['servings_min']}-{cake['servings_max']})")

    return 0

if __name__ == "__main__":
    sys.exit(main())
