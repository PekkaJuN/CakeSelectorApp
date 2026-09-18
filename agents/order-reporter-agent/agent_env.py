#!/usr/bin/env python3
"""Load environment variables from .env and .env.local files."""

import os
from pathlib import Path

def load_agent_environment():
    """Load .env and .env.local from the agent folder and parent directories."""
    from dotenv import load_dotenv

    agent_dir = Path(__file__).resolve().parent
    parents = [agent_dir] + list(agent_dir.parents)

    for directory in parents:
        env_file = directory / ".env"
        env_local = directory / ".env.local"

        if env_file.exists():
            try:
                load_dotenv(env_file, override=False)
            except (UnicodeDecodeError, Exception):
                pass
        if env_local.exists():
            try:
                load_dotenv(env_local, override=True)
            except (UnicodeDecodeError, Exception):
                pass
