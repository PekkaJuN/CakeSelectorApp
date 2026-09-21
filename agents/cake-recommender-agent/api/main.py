#!/usr/bin/env python3
"""
Cake Recommender Agent API - FastAPI server

Run: python api/main.py
Docs: http://127.0.0.1:8003/docs
"""

import sys
import json
import subprocess
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ConfigDict

# Setup paths
AGENT_DIR = Path(__file__).parent.parent
TOOLS_DIR = AGENT_DIR / "tools"
sys.path.insert(0, str(AGENT_DIR))

from agent_env import load_env

load_env()

app = FastAPI(
    title="Cake Recommender Agent API",
    description="Recommend cakes based on dietary restrictions and serving size",
    version="1.0.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class CakeRecommendationRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "dietary_restriction": "vegan",
                "serves": 20
            }
        }
    )
    dietary_restriction: Optional[str] = Field(None, description="vegan, gluten-free, dairy-free, nut-free")
    serves: Optional[int] = Field(None, description="Number of people to serve")

class CakeInfo(BaseModel):
    id: str
    name: str
    ingredients: List[str]
    dietary_flags: List[str]
    servings_min: int
    servings_max: int
    price: float
    description: str

class CakeRecommendationResponse(BaseModel):
    status: str
    answer: str
    cakes: List[CakeInfo]
    filters_applied: dict

# Helper functions
def query_database(dietary_flag: Optional[str] = None, serves: Optional[int] = None) -> Optional[dict]:
    """Call cake_database_tool and parse results."""
    cmd = [sys.executable, str(TOOLS_DIR / "cake_database_tool.py")]

    if dietary_flag:
        cmd.extend(["--query", dietary_flag])
    if serves:
        cmd.extend(["--serves", str(serves)])

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode == 0:
        return json.loads(result.stdout)
    return None

# Routes
@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "service": "cake-recommender-agent"}

@app.post("/recommend", response_model=CakeRecommendationResponse)
async def recommend(request: CakeRecommendationRequest):
    """
    Get cake recommendations based on dietary restrictions and serving size.

    - **dietary_restriction**: One of: vegan, gluten-free, dairy-free, nut-free
    - **serves**: Number of people to serve
    """
    # Query database
    cakes_data = query_database(
        dietary_flag=request.dietary_restriction,
        serves=request.serves
    )

    if not cakes_data:
        raise HTTPException(status_code=500, detail="Database query failed")

    # Format answer
    if cakes_data.get("count", 0) == 0:
        answer = "No cakes found matching those criteria."
    else:
        cake_names = [c["name"] for c in cakes_data["cakes"]]
        answer = f"I found {cakes_data['count']} cake(s) for you: {', '.join(cake_names)}"

    return CakeRecommendationResponse(
        status="ok",
        answer=answer,
        cakes=[CakeInfo(**cake) for cake in cakes_data["cakes"]],
        filters_applied={
            "dietary_restriction": request.dietary_restriction,
            "serves": request.serves
        }
    )

@app.get("/cakes", response_model=CakeRecommendationResponse)
async def list_all_cakes():
    """List all available cakes."""
    cmd = [sys.executable, str(TOOLS_DIR / "cake_database_tool.py"), "--list"]
    result = subprocess.run(cmd, capture_output=True, text=True)

    if result.returncode != 0:
        raise HTTPException(status_code=500, detail="Failed to fetch cakes")

    cakes_data = json.loads(result.stdout)

    return CakeRecommendationResponse(
        status="ok",
        answer=f"Found {cakes_data['count']} cakes in inventory",
        cakes=[CakeInfo(**cake) for cake in cakes_data["cakes"]],
        filters_applied={}
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8003)
