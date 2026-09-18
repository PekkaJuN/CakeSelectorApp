#!/usr/bin/env python3
"""
Order Reporter FastAPI

Usage:
  python api/main.py

Then POST to http://127.0.0.1:8002/report with:
  {
    "reference_date": "2025-02-15",  # optional
    "locale": "en",                   # optional (en, fi)
    "database_url": "path/to/db.db"  # optional
  }
"""

from __future__ import annotations

import os
import sys
from pathlib import Path
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

AGENT_DIR = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(AGENT_DIR))

from agent_env import load_agent_environment
load_agent_environment()

from order_core import get_weekly_report

app = FastAPI(title="Order Reporter Agent")


class ReportRequest(BaseModel):
    reference_date: Optional[str] = None
    locale: str = "en"
    database_url: Optional[str] = None


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.post("/report")
async def get_report(request: ReportRequest):
    """Generate a weekly order report."""
    try:
        db_path = request.database_url or os.environ.get("DATABASE_URL")

        if not db_path:
            agent_root = AGENT_DIR.parent.parent
            db_path = str(agent_root / "cake-selector.db")

        result = get_weekly_report(
            reference_date=request.reference_date,
            db_path=db_path,
            locale=request.locale,
        )

        if result.get("status") != "success":
            raise HTTPException(status_code=500, detail=result.get("error"))

        return result
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8002))
    uvicorn.run(app, host="127.0.0.1", port=port)
