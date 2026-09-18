#!/usr/bin/env python3
"""Deterministic order analytics for the last week.

Calculates order statistics from the SQLite database without using an LLM.
All numbers are derived from actual database records.
"""

from __future__ import annotations

import sqlite3
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple


def parse_iso_date(value: str) -> date:
    """Parse a YYYY-MM-DD calendar date."""
    return date.fromisoformat(value[:10])


def date_today() -> str:
    """Local calendar date as YYYY-MM-DD."""
    return date.today().isoformat()


def get_last_week_dates(reference_date: str) -> Tuple[str, str]:
    """Return (start_date, end_date) for the last 7 days including reference_date."""
    ref = parse_iso_date(reference_date)
    end = ref
    start = ref - timedelta(days=6)
    return start.isoformat(), end.isoformat()


def get_db_connection(db_path: Optional[str] = None) -> sqlite3.Connection:
    """Open connection to the SQLite database."""
    if db_path is None:
        agent_dir = Path(__file__).resolve().parent.parent.parent
        db_path = agent_dir / "cake-selector.db"

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def get_orders_in_period(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
) -> List[Dict[str, Any]]:
    """Fetch orders created within [start_date, end_date] (inclusive)."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, customerName, createdAt, updatedAt
        FROM orders
        WHERE DATE(createdAt) >= ? AND DATE(createdAt) <= ?
        ORDER BY createdAt DESC
        """,
        (start_date, end_date),
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_order_items(
    conn: sqlite3.Connection,
    order_id: str,
) -> List[Dict[str, Any]]:
    """Fetch all items for an order."""
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT id, orderId, productId, selections, createdAt
        FROM orderItems
        WHERE orderId = ?
        ORDER BY createdAt ASC
        """,
        (order_id,),
    )
    rows = cursor.fetchall()
    return [dict(row) for row in rows]


def get_product_name(conn: sqlite3.Connection, product_id: str) -> str:
    """Fetch product name by ID."""
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM products WHERE id = ?", (product_id,))
    row = cursor.fetchone()
    return row["name"] if row else f"Unknown ({product_id})"


def analyze_orders_for_week(
    conn: sqlite3.Connection,
    start_date: str,
    end_date: str,
) -> Dict[str, Any]:
    """Analyze all orders in a week period."""
    orders = get_orders_in_period(conn, start_date, end_date)

    total_order_count = len(orders)
    product_counter: Counter[str] = Counter()
    customer_counter: Counter[str] = Counter()
    all_items = []

    for order in orders:
        customer_name = order["customerName"]
        customer_counter[customer_name] += 1

        items = get_order_items(conn, order["id"])
        for item in items:
            product_id = item["productId"]
            product_name = get_product_name(conn, product_id)
            product_counter[product_name] += 1
            all_items.append({
                "product_name": product_name,
                "customer_name": customer_name,
                "order_date": order["createdAt"],
                "product_id": product_id,
            })

    total_item_count = len(all_items)
    top_products = product_counter.most_common(5) if product_counter else []
    top_customers = customer_counter.most_common(5) if customer_counter else []

    return {
        "period_start": start_date,
        "period_end": end_date,
        "total_orders": total_order_count,
        "total_items": total_item_count,
        "avg_items_per_order": round(total_item_count / total_order_count, 1) if total_order_count > 0 else 0,
        "products": [{"name": name, "count": count} for name, count in top_products],
        "customers": [{"name": name, "count": count} for name, count in top_customers],
        "all_items": all_items,
    }


def render_weekly_report(analysis: Dict[str, Any], locale: str = "en") -> str:
    """Generate a plain-English summary of weekly orders."""
    if analysis["total_orders"] == 0:
        return (
            "Ei tilauksia viime viikolla."
            if locale == "fi"
            else "No orders this week."
        )

    lines = []

    if locale == "fi":
        lines.append(f"📊 Viikon tilausraportti ({analysis['period_start']} - {analysis['period_end']})")
        lines.append(f"Tilauksia: {analysis['total_orders']}")
        lines.append(f"Tuotteita yhteensä: {analysis['total_items']}")
        lines.append(f"Keskimäärin per tilaus: {analysis['avg_items_per_order']} tuotetta")

        if analysis["products"]:
            lines.append("\n🏆 Suosituimmat tuotteet:")
            for i, prod in enumerate(analysis["products"], 1):
                lines.append(f"  {i}. {prod['name']}: {prod['count']} kpl")

        if analysis["customers"]:
            lines.append("\n👥 Aktiivisimmat asiakkaat:")
            for i, cust in enumerate(analysis["customers"], 1):
                lines.append(f"  {i}. {cust['name']}: {cust['count']} tilausta")
    else:
        lines.append(f"📊 Weekly Order Report ({analysis['period_start']} – {analysis['period_end']})")
        lines.append(f"Orders: {analysis['total_orders']}")
        lines.append(f"Total items: {analysis['total_items']}")
        lines.append(f"Average per order: {analysis['avg_items_per_order']} items")

        if analysis["products"]:
            lines.append("\n🏆 Top Products:")
            for i, prod in enumerate(analysis["products"], 1):
                lines.append(f"  {i}. {prod['name']}: {prod['count']} items")

        if analysis["customers"]:
            lines.append("\n👥 Most Active Customers:")
            for i, cust in enumerate(analysis["customers"], 1):
                lines.append(f"  {i}. {cust['name']}: {cust['count']} orders")

    return "\n".join(lines)


def get_weekly_report(
    reference_date: Optional[str] = None,
    db_path: Optional[str] = None,
    locale: str = "en",
) -> Dict[str, Any]:
    """Full weekly order report: analysis and prose."""
    reference_date = reference_date or date_today()
    conn = get_db_connection(db_path)

    try:
        start_date, end_date = get_last_week_dates(reference_date)
        analysis = analyze_orders_for_week(conn, start_date, end_date)
        answer = render_weekly_report(analysis, locale)

        return {
            "status": "success",
            "reference_date": reference_date,
            "period_start": start_date,
            "period_end": end_date,
            "analysis": analysis,
            "answer": answer,
            "locale": locale,
        }
    finally:
        conn.close()
