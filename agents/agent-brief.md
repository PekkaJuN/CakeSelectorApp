# Agent Brief: Cake Recommender Agent

## The Job
Suggest cakes to customers based on their taste preferences, dietary restrictions, occasion, and purchase history. Return ranked recommendations with explanations.

## Example Input & Output

**Input:**  
```
Customer: Alice | Preferences: loves chocolate, vegan, birthday party for 20 people | Past orders: dark chocolate torte, carrot cake
```

**Output:**  
```json
{
  "recommendations": [
    {
      "cake": "Vegan Dark Chocolate Cake",
      "confidence": 0.95,
      "reason": "Matches chocolate preference and dietary needs"
    },
    {
      "cake": "Vegan Red Velvet Cupcakes",
      "confidence": 0.87,
      "reason": "Serves 20+, vegan, festive"
    }
  ],
  "alternative_notes": "Consider dairy-free options; avoid cream-heavy designs"
}
```

## Tools

- **cake_database_tool** — Query available cakes, ingredients, dietary info, pricing; returns structured JSON
- **customer_history_tool** — Fetch past orders, ratings, dietary flags from database
- **occasion_finder_tool** — Map occasion type (birthday, wedding, office, casual) to cake style/size guidance
- **preference_matcher_core.py** — Deterministic scoring logic; matches customer profile to cake attributes (no LLM guessing)

Each tool returns JSON; `preference_matcher_core.py` is a Python module called directly by the main agent.

## Memory

**Approach:** Local JSON in `memory/data/`  
**Schemas:** `customer_profile_schema.json`, `recommendation_feedback_schema.json`  
**Gitignore:** All data files; keep only `.gitkeep`  
**Persistence:** Remembers customer feedback (accepted/rejected recommendations) so suggestions improve across sessions. Example: "Alice rejected chocolate last time" → lower chocolate confidence on next request.

## Stopping Conditions

Stop and ask the user when:

1. **Missing dietary info** — Do not assume vegan/gluten-free/nut allergies. Ask: "Does the customer have dietary needs (vegan, gluten-free, nut-free, etc.)?"
2. **Unknown occasion** — Do not guess cake size or style. Ask: "Is this for a party (size?), wedding, office event, or personal use?"
3. **Conflicting preferences** — If customer wants both "low sugar" and "rich chocolate cake", ask: "Should we prioritize dietary goals or taste preference?"
4. **No matching cakes in database** — Do not invent cakes. Ask: "No cakes match these criteria — should I relax dietary filters or suggest closest alternatives?"
5. **Database unavailable** — Do not proceed without verified data. Stop and report the error.
