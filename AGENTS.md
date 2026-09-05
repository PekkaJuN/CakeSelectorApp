# AGENTS.md - Cake Selector App

> Operating manual for AI agents in this repo. The model reads this file
> at the start of every session — anything written here never needs
> repeating in a prompt.

# Project Description

**Cake Selector App** is a simple product and order management web application for local use (single machine). It allows managing a catalog of products (e.g., cakes) with configurable properties (e.g., base type, size), and enables creating orders by selecting products and specifying property values. All data persists to SQLite. No user accounts, no pricing system (v1). Target user: small business owner or home baker managing product catalog and customer orders.

## Tech Stack

- **Backend:** Node.js + Express.js (simple, lightweight, SQLite support)
- **Database:** SQLite (file-based, no setup required)
- **Frontend:** Vanilla HTML/CSS/JavaScript (no build step, no frameworks)
- **Styling:** CSS
- **API:** REST with JSON payloads
- **Deployment:** Single Node.js process running locally on user's machine; access via http://localhost:3000

## Coding Practices

- **No build tooling or frameworks for v1:** Use vanilla JavaScript for frontend; no npm build step required
- **Source Files:** Place all source files in `./src` folder; organize by: `db/` (database), `routes/` (API routes), `public/` (frontend HTML/CSS/JS)
- **API Design:** REST endpoints with JSON request/response; server-side validation for all inputs
- **Frontend State:** Stateless frontend; all state server-side (SQLite); use fetch() for API calls
- **Error Handling:** Validate all user input at API boundaries; return precise error messages with HTTP status codes
- **Naming:** Use descriptive names for files, functions, routes, database fields; follow camelCase for variables/functions
- **Comments:** Only add comments for non-obvious "why" logic; avoid commenting "what" the code does

## Constraints

- **Local deployment only:** Application runs on single machine; no cloud sync, no multi-device support
- **No external API calls:** All data is local; no third-party service integrations (v1)
- **No authentication:** No user accounts or login; data isolation relies on machine access control
- **SQLite only:** Use SQLite for all data persistence; file-based, no server setup
- **No pricing:** Do not implement pricing/payment features (reserved for v2+)
- **Minimal dependencies:** Justify all npm packages; prefer built-ins when available
- **Products cannot be deleted if in orders:** If a product is referenced by any order, deletion is blocked
- **Property values cannot be deleted:** Property values can only be edited, not removed (preserves order data integrity)
- **Orders in Order History are read-only for editing:** Orders can be edited only via Order Creation/Order Editing features, not from Order History tab

## Commands

- `npm install` - Install dependencies
- `npm test` - run all tests (Vitest)
- `npm run db:init` - Initialize SQLite database with schema
- `npm run db:reset` - Reset database to clean state (for development/testing)
- `npm start` - run the app

Run these ** never reason about what they would probably print.
"Green" means the command exited 0 just now, nothing else.

## Workflows: research and spec

Named passes. Saying "run spec" gets the same discipline every time -
no re-explaining, no drift between sessions.

### research
Goal: understand the task before planning. Read-only.
1. Gather context: existing code when there is any, libraries and
   worked examples worth reusing, external API docs if needed
2. Identify scope: which files, what rules apply, what depends on what
3. Analyze: outline what needs doing, list what is still unknown
4. Present findings and ASK about every open question -
   never resolve a guess silently
No code, no spec, in this pass.

### spec
Goal: a specification before implementation.
Required for: new features, API changes, anything multi-file.
Optional for: typo-class fixes, config tweaks, docs.
Write specs/features/<name>.md - structure in specs/TEMPLATE.md.

Spec Readiness checklist - the spec is NOT ready until every box holds:
- [ ] Every AC is Given/When/Then with a precise expected value
- [ ] Files to modify are listed with what changes in each
- [ ] Risk: what could break, and how to roll back
- [ ] Testing strategy covers every AC, plus error and edge cases
- [ ] Every AC has at least one named test case
An incomplete testing strategy means the spec is not approved.

## Workflows: tdd, develop, review

### tdd
Prerequisite: a spec with a testing strategy (run spec first).
For EACH acceptance criterion, in order:
  RED      write the failing test for THIS AC only; the test name
           states the AC; run it and confirm it fails FOR THE RIGHT
           REASON (missing behaviour, not a broken import)
  GREEN    smallest implementation that passes this test; run ALL
           tests, confirm no regressions
  REFACTOR remove duplication, improve names; tests stay green
Then repeat the cycle for edge cases: invalid input, boundaries,
error paths.

Two traps, both near-certain:
- The model writes test and implementation in one pass. The test is
  then derived from the code and always passes. Ask separately.
- The model "fixes" a failing test to match the code. The spec
  decides which one is wrong - correct the spec first, then the test.

### develop
For work that has a spec: read it, follow the patterns already in
the codebase, change only the files the spec lists, run tdd for the
ACs, and update the spec status Draft -> In Progress -> Done.

### review
Compare the diff against the spec: which AC each change serves, what
changed that no AC asked for, which tests prove what. End with a
verdict: APPROVED or CHANGES_REQUIRED - never prose that cannot be
branched on.

## Guardrails

- Never touch `.env`; never run a command that deletes data
- Never "fix" a failing test by editing the test - the spec decides
  which one is wrong, and the spec is corrected first
- Stop after two consecutive red rounds and report - do not thrash
- <your line - what must never happen in THIS project>

## When you notice something

One line in INBOX.md. Do not implement it, do not detour.
That list is week 3's input, not this week's scope.