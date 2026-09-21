#!/usr/bin/env python3
"""
Cake Database Tool - Query cake inventory

Usage:
  python cake_database_tool.py --query vegan --serves 20
  python cake_database_tool.py --cake "Dark Chocolate Cake"
  python cake_database_tool.py --list
"""

import json
import argparse
import sys
from pathlib import Path

CAKES_DB = [
    {
        "id": "dch-1",
        "name": "Dark Chocolate Cake",
        "ingredients": ["chocolate", "flour", "eggs", "butter", "sugar"],
        "dietary_flags": ["contains-gluten", "contains-dairy", "contains-eggs"],
        "servings_min": 4,
        "servings_max": 10,
        "price": 35.00,
        "description": "Rich dark chocolate cake with ganache"
    },
    {
        "id": "veg-cc-1",
        "name": "Vegan Carrot Cake",
        "ingredients": ["carrots", "flour", "coconut oil", "sugar", "spices"],
        "dietary_flags": ["contains-gluten"],
        "servings_min": 6,
        "servings_max": 10,
        "price": 28.00,
        "description": "Moist carrot cake, vegan-friendly"
    },
    {
        "id": "gf-cc-1",
        "name": "Gluten-Free Vanilla Cake",
        "ingredients": ["almond flour", "eggs", "butter", "sugar", "vanilla"],
        "dietary_flags": ["contains-dairy", "contains-eggs"],
        "servings_min": 4,
        "servings_max": 8,
        "price": 32.00,
        "description": "Delicate gluten-free vanilla cake"
    },
    {
        "id": "veg-vcup-1",
        "name": "Vegan Red Velvet Cupcakes",
        "ingredients": ["flour", "cocoa", "coconut oil", "sugar", "food coloring"],
        "dietary_flags": ["contains-gluten"],
        "servings_min": 12,
        "servings_max": 24,
        "price": 24.00,
        "description": "Vegan red velvet cupcakes, box of 12"
    },
    {
        "id": "cf-cv-1",
        "name": "Cashew-Free Chocolate Cake",
        "ingredients": ["chocolate", "flour", "eggs", "butter", "sugar"],
        "dietary_flags": ["contains-gluten", "contains-dairy", "contains-eggs"],
        "servings_min": 4,
        "servings_max": 10,
        "price": 36.00,
        "description": "Chocolate cake safe for cashew allergies"
    }
]

def query_cakes(dietary_flag=None, serves=None, cake_id=None, cake_name=None):
    """Query cakes by dietary restriction, serving size, or name."""
    results = []

    for cake in CAKES_DB:
        match = True

        if dietary_flag:
            dietary_flag_lower = dietary_flag.lower().replace("-", "").replace(" ", "")

            if dietary_flag_lower == "vegan":
                if "contains-dairy" in cake["dietary_flags"] or "contains-eggs" in cake["dietary_flags"]:
                    match = False
            elif dietary_flag_lower == "glutenfree":
                if "contains-gluten" in cake["dietary_flags"]:
                    match = False
            elif dietary_flag_lower == "dairyfree":
                if "contains-dairy" in cake["dietary_flags"]:
                    match = False
            elif dietary_flag_lower == "nutsfree":
                if "contains-nuts" in cake["dietary_flags"]:
                    match = False
            else:
                match = False

        if serves and match:
            if not (cake["servings_min"] <= serves <= cake["servings_max"]):
                match = False

        if cake_id and match:
            if cake["id"].lower() != cake_id.lower():
                match = False

        if cake_name and match:
            if cake_name.lower() not in cake["name"].lower():
                match = False

        if match:
            results.append(cake)

    return results

def main():
    parser = argparse.ArgumentParser(description="Query cake database")
    parser.add_argument("--query", help="Filter by dietary restriction (vegan, gluten-free, dairy-free, nuts-free)")
    parser.add_argument("--serves", type=int, help="Filter by serving count")
    parser.add_argument("--cake", help="Search by cake name")
    parser.add_argument("--id", help="Search by cake ID")
    parser.add_argument("--list", action="store_true", help="List all cakes")

    args = parser.parse_args()

    if args.list:
        results = CAKES_DB
    else:
        results = query_cakes(
            dietary_flag=args.query,
            serves=args.serves,
            cake_id=args.id,
            cake_name=args.cake
        )

    output = {
        "status": "ok",
        "count": len(results),
        "cakes": results
    }

    print(json.dumps(output, indent=2))
    return 0 if results else 1

if __name__ == "__main__":
    sys.exit(main())
