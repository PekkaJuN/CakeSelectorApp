# AGENTS.md — Agent kit

> Copy this file with `gemini_agent.py` into any project. Every agent lives in its own
> folder and follows the same layout so CLI, API, UI, tools, and memory stay consistent.

---

## Agent structure

Place each agent in `agents/{agent-name}/`:

```
agents/
├── AGENTS.md
├── gemini_agent.py          # Optional Gemini CLI template
└── {agent-name}/
    ├── {agent_name}.py      # Main CLI (required)
    ├── agent_env.py         # Load .env / .env.local (recommended)
    ├── {domain}_core.py     # Deterministic domain logic (recommended)
    ├── requirements.txt
    ├── .env.example
    ├── ui/
    │   ├── app.py           # Flask UI
    │   └── templates/
    ├── api/
    │   └── main.py          # FastAPI
    ├── tools/               # Standalone CLI tools (JSON stdout)
    ├── skills/              # Markdown skill docs
    ├── subagents/           # Task-specific CLIs
    ├── memory/
    │   ├── memory.py
    │   ├── *_schema.json
    │   └── data/            # Local state (gitignore contents)
    └── tests/
```

**Reference example:** [`homework-coach-agent/`](homework-coach-agent/) — family chore coach (who does what, who has done the most). Copy that tree when starting a new agent.

---

## Naming

| Component | Convention | Example (homework coach) |
|-----------|------------|--------------------------|
| Folder | kebab-case | `homework-coach-agent/` |
| Main CLI | snake_case | `homework_coach_agent.py` |
| Domain core | snake_case | `homework_core.py` |
| Subagent / tool | snake_case | `assignment_planner.py`, `ask_coach.py` |
| Skill | kebab-case | `daily-assignment-planning.md` |
| Schema | snake_case | `coaching_session_schema.json` |

---

## Requirements

### 1. Main agent (`{agent_name}.py`)

- argparse CLI
- `--chat` and a single-query positional prompt
- Load skills from `skills/`
- Read/write memory via `memory/memory.py`
- Delegate to `subagents/` when a task is a distinct step
- Prefer calling `*_core.py` for facts; optional Gemini for wording only

`gemini_agent.py` (this folder) is a **Gemini chat/plan template**. Domain agents may copy patterns from it; they do not have to import it. The homework coach does not — it calls `homework_core.py` directly.

```python
#!/usr/bin/env python3
"""
{Agent Name} CLI

Usage:
  python {agent_name}.py --chat
  python {agent_name}.py "your query"
  python {agent_name}.py --help
"""
```

### 2. Domain core (`{domain}_core.py`)

Keep rankings, schedules, and other numbers in tested Python. The model must not invent totals. Homework coach: `homework_core.py` + `tests/test_homework_core.py`.

### 3. UI (`ui/`)

- `app.py` — Flask
- Templates in `ui/templates/`
- Same answers as the CLI/API (call core or HTTP to the API)

### 4. API (`api/`)

- `main.py` — FastAPI + Pydantic
- `GET /health`
- Domain routes that accept a JSON snapshot (or equivalent) and return structured facts plus a prose `answer`

```python
@app.get("/health")
async def health():
    return {"status": "ok"}
```

# Tools, skills, memory

## Every tool is a standalone CLI
#!/usr/bin/env python3
import argparse, json, sys
def main():
    parser = argparse.ArgumentParser(description="what this does")
    # arguments...
    result = {"status": "success", "data": ...}
    print(json.dumps(result)); sys.exit(0)

Rules: argparse in, JSON out, exit 0 on success / 1 on error.
No agent imports — a tool must run, and be tested, without the
agent around it. The agent is only as reliable as the tools it
can verify.

## Skill format (skills/<skill-name>.md)
---
name: skill-name
description: when to use this skill
tools: [tool_one, tool_two]
---
Purpose · when to use · tools and their roles · one example
invocation.

Skills are the agent’s manual: the model reads them to decide which
tool fits. A tool without a skill is invisible at decision time.

## Memory
All state behind memory/memory.py (a CLI like any tool). Data
shapes in *_schema.json; storage under memory/data/ (SQLite or
ChromaDB for retrieval). The agent never touches storage directly.

## Subagents
A subagent is a standalone CLI with one narrow job: input via args
or stdin, structured JSON out. The main agent runs it as a separate
process and reads the result — that is what keeps a slow step
(search, enrichment, a long analysis) out of the main loop.
Delegation over new responsibilities.

## Model backend — the part that makes it an agent
The reasoning layer lives behind ONE function:

    def decide_next_action(state, skills) -> dict:
        """state + skills in; the next action out:
           {"type": "tool", "tool": ..., "args": [...]}
           {"type": "finish", "report": ..., "exit_code": 0|1}"""

Rules:
- The API key comes from the environment (GEMINI_API_KEY), never
  from the source. `.env` is in `.gitignore` before the first commit.
- No other function calls the model. Swapping Gemini for Claude, or
  for a local model, is then a change inside one function.
- A deterministic stand-in of this function is a legitimate way to
  build and test the loop offline — but ship the model-backed one.
  A loop whose decisions are if-statements is a script, not an
  agent. (Week 3’s factory itself needs no key: it drives CLI tools.
  The agent it runs is the thing that needs one.)
- The model decides WHICH tool and WHETHER to continue. It never
  decides whether a guardrail applies.

### 9. Tests (`tests/`)

Pytest (and API tests with FastAPI `TestClient`) for core rules and HTTP contracts. Domain tests must pass without a Gemini key.

---

## Gemini (optional)

Use Gemini for search, URL context, narration, or `--plan`. Do not use it as the source of truth for domain numbers.

Keys (any one): `GEMINI_API_KEY`, `GOOGLE_AI_STUDIO_KEY`, `GOOGLE_API_KEY`.

Built-in tools (see `gemini_agent.py`):

- `google_search` — grounded web search
- `url_context` — fetch/analyze URLs
- `code_execution` — run model-generated code
- Custom `function_declarations` — your CLI tools via `execute_custom_function`

---

## Registered agents (this workspace)

Add a row when you create an agent. Other projects that copy this kit should replace the table.

| Agent | Description | Status |
|-------|-------------|--------|
| `homework-coach-agent` | **Reference example.** Who should do which chore and when; who has done the most. CLI, FastAPI `:8001`, Flask `:5001`. | Active |
| `order-reporter-agent` | Weekly order analytics from the CakeSelectorApp database. Order counts, top products, top customers. CLI, FastAPI `:8002`, Flask `:5002`. No API key required. | Active |
| `cake-recommender-agent` | Recommend cakes based on dietary restrictions (vegan, gluten-free, dairy-free, nut-free) and serving size. CLI, FastAPI `:8003`, Flask `:5003`. Integrated with CakeSelectorApp UI. | Active |

---

## Run

From the repo root (adjust name and ports):

```bash
# CLI
python3 agents/{agent-name}/{agent_name}.py --chat
python3 agents/{agent-name}/{agent_name}.py "your query"

# API (homework coach uses python3 .../api/main.py which binds :8001)
python3 agents/{agent-name}/api/main.py

# Flask UI
python3 agents/{agent-name}/ui/app.py
```

Convention in this example: API **8001**, Flask **5001**. Pick free ports per machine.

---

## Environment

Load `.env` then `.env.local` from the agent folder and parents (`agent_env.py` in the example).

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | No* | Gemini key (`GOOGLE_AI_STUDIO_KEY` / `GOOGLE_API_KEY` also work) |
| `GEMINI_MODEL` | No | Override default model for `gemini_agent.py` |
| `DATABASE_URL` | No | If the agent uses Postgres |
| `CHROMA_HOST` / `CHROMA_PORT` | No | If the agent uses ChromaDB |

\*Required only for Gemini wording/search. Homework coach plans and rankings work without a key.

---

## Workflow: create agent

The build order for a new agent — also exactly what week 3’s agent
factory automates, so doing it by hand once is the point:

1. Create the folder shape:
   mkdir -p agents/<name>/{tools,skills,subagents,memory/data}
2. Start the main CLI from the base template
   (session-3-ai-agents/gemini_agent.py) and adapt it
3. Invent the first tool (Exercise 1): describe it, let the model
   implement, test it ALONE before wiring it in
4. Write its skill file — without one the agent never picks it
5. Add memory when the agent needs to remember across runs
   (Exercise 2: embed + store + retrieve)
6. Wire guardrails: blocked patterns, and the stopping condition
   from your /goal pass
7. Register the agent in this file so others can find it

The three-exercise arc (session-3-ai-agents/exercises/) walks
3 -> 5 -> the full agent in that order.


## Guardrails
- Never touch `migrations/` or `.env`.
- Never run a command that deletes data.
- Stop after two consecutive red rounds.
- Stop if the same file changes three times in a row.
- Stop and ask when the spec does not cover the case.

## When you notice something
One line in INBOX.md. Do not implement it. Do not detour.