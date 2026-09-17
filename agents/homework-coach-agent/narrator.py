"""Optional Gemini narration for coach answers (shared by CLI and hosting)."""

from __future__ import annotations

import json
import os
from typing import Any


DEFAULT_MODEL = "gemini-3.6-flash"


def gemini_api_key() -> str | None:
    return (
        os.environ.get("GEMINI_API_KEY")
        or os.environ.get("GOOGLE_AI_STUDIO_KEY")
        or os.environ.get("GOOGLE_API_KEY")
    )


def gemini_configured() -> bool:
    return bool(gemini_api_key())


def narrate_with_gemini(
    query: str,
    facts: dict[str, Any],
    locale: str,
    template_answer: str,
) -> str:
    """Rephrase structured facts for the family; fall back to the template on error."""
    api_key = gemini_api_key()
    if not api_key:
        return template_answer

    try:
        from google import genai
        from google.genai import types

        client = genai.Client(api_key=api_key)
        language = "Finnish" if locale == "fi" else "English"
        prompt = (
            f"You are a kind family homework coach on a kitchen tablet. "
            f"Answer in {language}. Use ONLY these facts. Do not invent names or chores.\n"
            f"Question: {query}\n"
            f"Facts JSON: {json.dumps(facts, ensure_ascii=False)}\n"
            f"Keep it short (2-6 sentences). Celebrate effort; never shame anyone."
        )
        response = client.models.generate_content(
            model=os.environ.get("GEMINI_MODEL", DEFAULT_MODEL),
            contents=prompt,
            config=types.GenerateContentConfig(temperature=0.4),
        )
        text = (response.text or "").strip()
        return text or template_answer
    except Exception:
        return template_answer
