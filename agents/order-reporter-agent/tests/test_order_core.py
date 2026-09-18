#!/usr/bin/env python3
"""Tests for order_core.py — deterministic order analytics."""

from datetime import date, timedelta
from pathlib import Path
import sqlite3
import tempfile

import pytest

import sys
sys.path.insert(0, str(Path(__file__).parent.parent))

from order_core import (
    analyze_orders_for_week,
    date_today,
    get_db_connection,
    get_last_week_dates,
    get_orders_in_period,
    render_weekly_report,
)


@pytest.fixture
def test_db():
    """Create a temporary SQLite database with schema and test data."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Create schema
    cursor.execute("""
        CREATE TABLE products (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE orders (
            id TEXT PRIMARY KEY,
            customerName TEXT NOT NULL,
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("""
        CREATE TABLE orderItems (
            id TEXT PRIMARY KEY,
            orderId TEXT NOT NULL,
            productId TEXT NOT NULL,
            selections TEXT DEFAULT '{}',
            createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (orderId) REFERENCES orders(id),
            FOREIGN KEY (productId) REFERENCES products(id)
        )
    """)

    conn.commit()
    yield db_path, conn

    conn.close()
    Path(db_path).unlink()


def test_get_last_week_dates():
    """Test week boundary calculation."""
    result_start, result_end = get_last_week_dates("2025-02-15")
    assert result_start == "2025-02-09"
    assert result_end == "2025-02-15"


def test_empty_week_analysis(test_db):
    """When no orders exist, analysis returns zeros."""
    db_path, conn = test_db
    start, end = get_last_week_dates("2025-02-15")
    analysis = analyze_orders_for_week(conn, start, end)

    assert analysis["total_orders"] == 0
    assert analysis["total_items"] == 0
    assert analysis["products"] == []
    assert analysis["customers"] == []


def test_single_order_analysis(test_db):
    """Analyze a single order."""
    db_path, conn = test_db
    cursor = conn.cursor()

    # Insert product and order
    cursor.execute("INSERT INTO products (id, name) VALUES ('p1', 'Vanilla Cake')")
    cursor.execute(
        "INSERT INTO orders (id, customerName, createdAt) VALUES ('o1', 'Alice', '2025-02-12')"
    )
    cursor.execute(
        "INSERT INTO orderItems (id, orderId, productId, createdAt) VALUES ('i1', 'o1', 'p1', '2025-02-12')"
    )
    conn.commit()

    analysis = analyze_orders_for_week(conn, "2025-02-09", "2025-02-15")

    assert analysis["total_orders"] == 1
    assert analysis["total_items"] == 1
    assert analysis["avg_items_per_order"] == 1.0
    assert len(analysis["products"]) == 1
    assert analysis["products"][0]["name"] == "Vanilla Cake"
    assert analysis["products"][0]["count"] == 1
    assert len(analysis["customers"]) == 1
    assert analysis["customers"][0]["name"] == "Alice"
    assert analysis["customers"][0]["count"] == 1


def test_multiple_orders_analysis(test_db):
    """Analyze multiple orders from different customers."""
    db_path, conn = test_db
    cursor = conn.cursor()

    cursor.execute("INSERT INTO products (id, name) VALUES ('p1', 'Vanilla')")
    cursor.execute("INSERT INTO products (id, name) VALUES ('p2', 'Chocolate')")
    cursor.execute("INSERT INTO orders (id, customerName, createdAt) VALUES ('o1', 'Alice', '2025-02-12')")
    cursor.execute("INSERT INTO orders (id, customerName, createdAt) VALUES ('o2', 'Bob', '2025-02-13')")
    cursor.execute("INSERT INTO orders (id, customerName, createdAt) VALUES ('o3', 'Alice', '2025-02-14')")

    cursor.execute("INSERT INTO orderItems (id, orderId, productId) VALUES ('i1', 'o1', 'p1')")
    cursor.execute("INSERT INTO orderItems (id, orderId, productId) VALUES ('i2', 'o1', 'p2')")
    cursor.execute("INSERT INTO orderItems (id, orderId, productId) VALUES ('i3', 'o2', 'p1')")
    cursor.execute("INSERT INTO orderItems (id, orderId, productId) VALUES ('i4', 'o3', 'p1')")
    conn.commit()

    analysis = analyze_orders_for_week(conn, "2025-02-09", "2025-02-15")

    assert analysis["total_orders"] == 3
    assert analysis["total_items"] == 4
    assert analysis["avg_items_per_order"] == 1.3
    assert analysis["products"][0]["name"] == "Vanilla"
    assert analysis["products"][0]["count"] == 3
    assert analysis["customers"][0]["name"] == "Alice"
    assert analysis["customers"][0]["count"] == 2


def test_render_weekly_report_empty():
    """Report with no orders."""
    analysis = {
        "period_start": "2025-02-09",
        "period_end": "2025-02-15",
        "total_orders": 0,
        "total_items": 0,
        "products": [],
        "customers": [],
    }
    report = render_weekly_report(analysis, locale="en")
    assert "No orders" in report


def test_render_weekly_report_en():
    """Report in English."""
    analysis = {
        "period_start": "2025-02-09",
        "period_end": "2025-02-15",
        "total_orders": 3,
        "total_items": 4,
        "avg_items_per_order": 1.3,
        "products": [{"name": "Vanilla", "count": 3}, {"name": "Chocolate", "count": 1}],
        "customers": [{"name": "Alice", "count": 2}, {"name": "Bob", "count": 1}],
    }
    report = render_weekly_report(analysis, locale="en")
    assert "3" in report and "orders" in report.lower()
    assert "Vanilla" in report
    assert "Alice" in report


def test_render_weekly_report_fi():
    """Report in Finnish."""
    analysis = {
        "period_start": "2025-02-09",
        "period_end": "2025-02-15",
        "total_orders": 1,
        "total_items": 2,
        "avg_items_per_order": 2.0,
        "products": [{"name": "Leivonta", "count": 2}],
        "customers": [{"name": "Alice", "count": 1}],
    }
    report = render_weekly_report(analysis, locale="fi")
    assert "Viikon" in report or "viikon" in report
    assert "tilauksia" in report or "Tilauksia" in report


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
