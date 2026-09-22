Steps to run in each loop.
1. Check the specs/features/Authen_author.md and pick the highest prio **open** task
2. Make task specs if they are unclear
3. Implement the task with TDD
4. Run and fix unit tests until all ok — they must pass with no
   API key, because the numbers come from the core module
5. Review and audit the change until it passes the audit 100%
6. Test the result in the browser, fix UI and UX issues
7. Mark the task **done** in the list below when it passes
   audit + browser

## Task list (highest prio first)

Derived from the Files to Modify table in `specs/features/Authen_author.md`.

| Prio | Status | Task |
|------|--------|------|
| 1 | done | `src/auth/password.js` — salt, scrypt hash, constant-time verify (AC56–AC58, AC60, AC64) |
| 2 | done | `scripts/hash-password.js` + `auth:hash` script — TTY prompt, confirmation, 8-char minimum (AC65–AC67) |
| 3 | done | `src/auth/userStore.js` — `loadUsers` validation and `authenticate` (AC1–AC6, AC9–AC11, AC59–AC63) |
| 4 | done | `config/users.example.json` + `.gitignore` for `config/users.json` — a fresh clone can log in (`tests/fixtures/users.js` landed with prio 3) |
| 5 | done | `src/auth/sessions.js` — create, look up, destroy, TTL sweep (AC7, AC17–AC21) |
| 6 | done | `src/routes/auth.js` — login, logout, me (AC7–AC13, AC22, AC23) |
| 7 | done | `src/middleware/auth.js` — cookie parsing and the default-deny policy table (AC24–AC48) |
| 8 | done | `src/server.js` wiring — load config at boot, exit 1 on invalid, mount auth ahead of the routers |
| 9 | **awaiting browser** | Login UI — `src/public/login.js`, index.html, styles.css, tab removal in app.js (AC14–AC16, AC49–AC55). Built, logic + served markup tested; AC49–AC55 need manual verification at localhost:3000 |
| 10 | done | Docs — README first-run section, AGENTS.md two-role rule |
| 11 | done | Authorization integration tests — the Products, Orders and Agent rows of the spec's Testing Strategy, against the real routers and database, asserting effects and not just status codes (AC24–AC48) |
