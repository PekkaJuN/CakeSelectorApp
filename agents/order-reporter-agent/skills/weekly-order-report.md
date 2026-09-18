---
name: weekly-order-report
description: Generate order statistics for the last 7 days
---

## Purpose

Generate a comprehensive weekly order report showing:
- Total number of orders and items
- Top 5 products by frequency
- Top 5 customers by order count
- Average items per order

## When to Use

- Daily: morning briefing on recent order activity
- Weekly: summary of business performance
- End-of-period: trend analysis or staff review
- Ad-hoc: check order status on a specific date

## Tools Required

- SQLite database with orders, orderItems, and products tables
- Python (CLI, API, or UI modes)

## Example

```bash
# CLI: today's weekly report
python order_reporter_agent.py

# API: generate report for a date
curl -X POST http://127.0.0.1:8002/report \
  -H "Content-Type: application/json" \
  -d '{"reference_date": "2025-02-15", "locale": "en"}'

# UI: open in browser
python ui/app.py
# then visit http://127.0.0.1:5002
```

## Output Format

Plain English (or Finnish) summary with:
- Total orders and items
- Top products with item counts
- Top customers with order counts
- Human-readable phrasing (no model computation)
