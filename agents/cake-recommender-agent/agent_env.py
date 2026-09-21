"""Load environment variables from .env and .env.local"""

import os
from pathlib import Path

def load_env():
    """Load .env then .env.local (local overrides env)."""
    agent_dir = Path(__file__).parent

    env_file = agent_dir / ".env"
    if env_file.exists():
        with open(env_file) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, _, value = line.partition("=")
                    os.environ.setdefault(key.strip(), value.strip().strip('"\''))

    env_local = agent_dir / ".env.local"
    if env_local.exists():
        with open(env_local) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#"):
                    key, _, value = line.partition("=")
                    os.environ[key.strip()] = value.strip().strip('"\'')

if __name__ == "__main__":
    load_env()
    print("Environment loaded from .env and .env.local")
