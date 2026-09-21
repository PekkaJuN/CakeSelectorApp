---
name: cake-database-queries
description: Query the cake inventory by dietary restrictions, serving size, or name
tools: [cake_database_tool]
---

## Purpose
Answer: "What cakes are available?", "What cakes are vegan?", "What cakes serve 20 people?", "Find cake by name or ID?"

## When to Use
- User asks for cakes matching dietary restrictions (vegan, gluten-free, dairy-free, nut-free)
- User needs cakes for a specific number of guests
- User is searching for a specific cake by name or ID
- You need to know what's in inventory before making recommendations

## Tools Required
**cake_database_tool** — Standalone CLI; returns JSON list of matching cakes with ingredients, dietary flags, serving range, price.

## Example

**Query**: "What vegan cakes serve at least 12 people?"
```bash
python cake_database_tool.py --query vegan --serves 12
```

**Output**:
```json
{
  "status": "ok",
  "count": 1,
  "cakes": [
    {
      "id": "veg-vcup-1",
      "name": "Vegan Red Velvet Cupcakes",
      "ingredients": [...],
      "dietary_flags": ["contains-gluten"],
      "servings_min": 12,
      "servings_max": 24,
      "price": 24.00,
      "description": "Vegan red velvet cupcakes, box of 12"
    }
  ]
}
```

## Supported Filters

| Filter | Command | Example |
|--------|---------|---------|
| Vegan | `--query vegan` | No dairy or eggs |
| Gluten-free | `--query gluten-free` | No gluten allergen |
| Dairy-free | `--query dairy-free` | No dairy allergen |
| Nut-free | `--query nut-free` | No nut allergen |
| Serving size | `--serves N` | Cakes that serve N people |
| Search by name | `--cake "name"` | Partial name match (case-insensitive) |
| Search by ID | `--id "cake-id"` | Exact ID match |
| List all | `--list` | All cakes in inventory |

## Notes
- Filters can be combined: `--query vegan --serves 12`
- Returns exit code 0 if matches found, 1 if no matches
- Dietary flags in output list allergens that ARE present (e.g., "contains-gluten")
