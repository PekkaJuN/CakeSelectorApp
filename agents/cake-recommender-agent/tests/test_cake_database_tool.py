#!/usr/bin/env python3
"""Tests for cake_database_tool (without agent, just CLI)"""

import pytest
import json
import subprocess
import sys
from pathlib import Path

TOOL_PATH = Path(__file__).parent.parent / "tools" / "cake_database_tool.py"

def run_tool(*args):
    """Run the tool and parse JSON output."""
    result = subprocess.run(
        [sys.executable, str(TOOL_PATH)] + list(args),
        capture_output=True,
        text=True
    )
    return json.loads(result.stdout), result.returncode

class TestCakeDatabaseTool:

    def test_list_all_cakes(self):
        output, code = run_tool("--list")
        assert code == 0
        assert output["status"] == "ok"
        assert output["count"] == 5
        assert len(output["cakes"]) == 5

    def test_query_vegan(self):
        output, code = run_tool("--query", "vegan")
        assert code == 0
        assert output["count"] == 2
        cake_names = [c["name"] for c in output["cakes"]]
        assert "Vegan Carrot Cake" in cake_names
        assert "Vegan Red Velvet Cupcakes" in cake_names

    def test_query_gluten_free(self):
        output, code = run_tool("--query", "gluten-free")
        assert code == 0
        assert output["count"] == 1
        assert output["cakes"][0]["name"] == "Gluten-Free Vanilla Cake"

    def test_filter_by_serving_size(self):
        output, code = run_tool("--serves", "20")
        assert code == 0
        assert output["count"] == 1
        assert output["cakes"][0]["name"] == "Vegan Red Velvet Cupcakes"

    def test_search_by_name(self):
        output, code = run_tool("--cake", "Chocolate")
        assert code == 0
        assert output["count"] == 2
        cake_names = [c["name"] for c in output["cakes"]]
        assert "Dark Chocolate Cake" in cake_names
        assert "Cashew-Free Chocolate Cake" in cake_names

    def test_search_by_id(self):
        output, code = run_tool("--id", "veg-cc-1")
        assert code == 0
        assert output["count"] == 1
        assert output["cakes"][0]["name"] == "Vegan Carrot Cake"

    def test_no_matches_returns_error_code(self):
        output, code = run_tool("--query", "impossible-dietary-flag")
        assert code == 1
        assert output["count"] == 0

    def test_vegan_filters_out_dairy_and_eggs(self):
        output, code = run_tool("--query", "vegan")
        for cake in output["cakes"]:
            assert "contains-dairy" not in cake["dietary_flags"]
            assert "contains-eggs" not in cake["dietary_flags"]

    def test_combine_filters_vegan_and_serves_12(self):
        output, code = run_tool("--query", "vegan", "--serves", "12")
        assert code == 0
        assert output["count"] == 1
        assert output["cakes"][0]["name"] == "Vegan Red Velvet Cupcakes"

if __name__ == "__main__":
    pytest.main([__file__, "-v"])
