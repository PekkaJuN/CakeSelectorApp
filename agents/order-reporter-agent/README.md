# Order Reporter Agent

Generate weekly order reports from the CakeSelectorApp database. Shows total orders, top products, and top customers — all without requiring an API key.

## Quick Start

```bash
# Install dependencies
pip install -r requirements.txt

# CLI: generate today's report
python order_reporter_agent.py

# API: run on port 8002
python api/main.py

# Flask UI: open in browser on port 5002
python ui/app.py
```

Then visit http://127.0.0.1:5002 to see the report interface.

## Integration with CakeSelectorApp

The main app includes a Reports tab that calls the order reporter agent API. The agent runs independently and exposes:

- **CLI** — `python order_reporter_agent.py` for CLI usage
- **FastAPI** — `http://127.0.0.1:8002/report` for HTTP requests  
- **Flask UI** — `http://127.0.0.1:5002` for a web interface

## Features

- **No API key required** — uses deterministic Python logic, not an LLM
- **Multilingual** — English and Finnish support
- **Flexible** — customize the reference date for historical reports
- **Tested** — unit tests verify accuracy of calculations
- **Embeddable** — use the API or Flask UI in any app

## Files

- **order_core.py** — All business logic (no LLM)
- **order_reporter_agent.py** — CLI interface
- **api/main.py** — FastAPI server
- **ui/app.py** — Flask web UI
- **tests/test_order_core.py** — Pytest suite

## Database

Reads from the SQLite database (`cake-selector.db`) in the project root. Looks for:
- `orders` table
- `orderItems` table
- `products` table

If the database path is different, set `DATABASE_URL` in `.env` or pass `--db /path/to/db.db` to the CLI.

## Example: CLI

```bash
# Today's report in English
python order_reporter_agent.py

# Specific date
python order_reporter_agent.py --date 2025-02-15

# Finnish
python order_reporter_agent.py --locale fi

# JSON output
python order_reporter_agent.py --json
```

## Example: API

```bash
curl -X POST http://127.0.0.1:8002/report \
  -H "Content-Type: application/json" \
  -d '{
    "reference_date": "2025-02-15",
    "locale": "en"
  }'
```

## Example: Flask UI

1. Start the agent: `python ui/app.py`
2. Open http://127.0.0.1:5002
3. Pick a date and language
4. Click "Generate Report"

## Testing

```bash
# Run tests (requires sqlite3)
python -m pytest tests/test_order_core.py -v

# Tests pass without a database or API key
```

## Design

This agent follows the **core-first principle**: all calculations are in `order_core.py` with full test coverage. The CLI, API, and UI are just views of the same deterministic logic. This means:

1. No model hallucination of numbers
2. Same results across all interfaces  
3. Easy to test and verify
4. No external dependencies beyond Python stdlib

The agent does not use Gemini or any LLM for calculations — it only structures the prose output in plain English or Finnish using hardcoded templates.
