# INBOX

<!-- one line per observation. Not implemented here. -->
<!-- Reviewed at the end of the week. -->

- `AGENTS.md` constraint "Property values cannot be deleted" contradicts `product-management.md` AC25, its test table (line 229) and the shipped Products tab, all of which delete the value — the spec was followed, so the constraint line needs rewording or the ACs need changing.
- `AGENTS.md` says `npm test` runs Vitest; `package.json` runs `node --test` and Vitest is not a dependency.
- The suite runs against the real `cake-selector.db` and every test file starts with `DELETE FROM products` — running `npm test` wipes the dev catalog. Tests need their own database file.
- The suite only passes serially (`--test-concurrency=1`) for the same reason; per-file databases would let it run in parallel again.
- `tests/routes/orders.test.js` and `order-history.test.js` still mount routers on bare apps, so they will not see the auth middleware that `Authen_author.md` puts in `server.js` — fine per that spec's Risk section, but it means no test covers the guard wiring itself.
- The hash tool's interactive echo-off path (raw mode, asterisk masking) is asserted only at source level — driving it properly needs a pty harness the repo does not have.
- AC59 checks only that a salt is hex, so a 2-character salt loads fine even though the spec says 32 — worth a length rule alongside the hex rule.
- `userStore.loadUsers` adds two checks no AC asked for: a missing `passwordHash` is named as missing rather than reported as "got 0" characters, and `passwordHash` must be hex, not merely the right length.
- `.gitignore` has a duplicate `.env` appended in UTF-16LE (bytes 66–77), which is why git treats the file as binary and shows no diffs for it; `.env` is already ignored on line 2, so nothing is currently exposed.
- `src/auth/sessions.js` exports `sessionCount()` and `destroyAllSessions()` beyond the four functions the spec lists — AC20's "the entry is dropped" needs the store to be observable, and the tests need isolation between cases.
- `startSweep()` exists but nothing calls it yet; wiring it belongs with the server boot task (prio 8).
- Cookie parsing landed in a new `src/auth/cookies.js` rather than in `src/middleware/auth.js` as the spec's file table says, because logout is a public route and must read the cookie without the policy middleware; the middleware (prio 7) will import the same helper.
- `GET /api/auth/me` resolves the session itself instead of trusting a `req.user` the middleware sets, so it answers correctly whether or not the policy middleware is mounted ahead of it.
- `express.json()` is mounted ahead of the auth policy, so a malformed JSON body returns 400 to an anonymous caller before authentication runs — a small disclosure that the endpoint exists and parses JSON. No AC covers it; moving the parser behind the policy would fix it.
- The policy patterns are exact, so a trailing slash (`/api/products/`) falls through to admin-only rather than matching the both-roles read rule. That fails closed, but an `orderuser` hitting a trailing-slash URL would get a confusing 403.
- An unknown `/api/...` path with a valid admin session falls past every router to the SPA catch-all and returns index.html instead of a JSON 404 — pre-existing, but now reachable only by an authenticated admin.
- The central 401 handler lives in `login.js` as a `window.fetch` wrapper rather than inside `app.js` as the spec's file table says — it covers all 25 inline handlers without editing a 1400-line file.
- `login.js` loads `app.js` dynamically after the bootstrap succeeds, so the catalog fetches never run unauthenticated; the static `<script src="app.js">` tag is gone.
- After a successful login or logout `login.js` reloads the page rather than rebuilding the DOM, because the app shell is removed outright when there is no session.
- `AGENTS.md` still carries the stale "Property values cannot be deleted" constraint from the round-1 conflict; the two-role rewrite deliberately left it alone because that one is still yours to rule on.
- The prio 1-10 task list was derived from the spec's "Files to Modify" table, which silently dropped the Products, Orders and Agent rows of its Testing Strategy — 17 ACs had no test until prio 11 was added. A task list built from a spec should be checked against its testing strategy too, not only its file list.
