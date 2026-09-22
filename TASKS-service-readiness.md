# Tasks: Service Readiness

Derived from `specs/service-readiness.md`, checked against its **Testing
Strategy** table as well as its Files to Modify table — the `Authen_author`
round dropped 17 ACs by building the list from the file table alone.

Highest priority first. Order matters: Task 1 unblocks safe testing, Task 2 is
the defect that makes a healthy agent look dead, and the rest can move in
parallel after that.

| Prio | Status | Task | ACs |
|------|--------|------|-----|
| 1 | open | Test isolation: point the suite at its own `DB_PATH` | prerequisite |
| 2 | open | Empty ≠ error in the recommender | AC7, AC22 |
| 3 | open | Real timeouts and honest proxy errors | AC11, AC17 |
| 4 | open | Authorization tests at the HTTP layer | AC1–AC5 |
| 5 | open | Empty and loading states in Order Builder | AC6, AC8, AC10 |
| 6 | open | Save-order feedback and failure handling | AC15, AC16, AC18–AC20, AC32 |
| 7 | open | Announced regions (`role`/`aria-live`) | AC9, AC21 |
| 8 | open | Keyboard: tab strip, Escape, focus trap, focus after render | AC23–AC28 |
| 9 | open | Recovery: cart survives 401, restart and retry | AC29–AC31, AC33 |
| 10 | open | Recommendation → order handoff | AC12–AC14 |

---

## Task 1 — Test isolation (prerequisite)

- [ ] Give the suite its own database file via `DB_PATH`; never the repo-root
      `cake-selector.db`
- [ ] Verify: run `npm test`, then confirm the dev catalog still has its rows
- [ ] Only then write any new test

**Why first:** every existing test file opens with `DELETE FROM products`
against the live database. `AGENTS.md` forbids commands that delete data, and
today `npm test` is one. Adding journey tests before fixing this makes it worse.

## Task 2 — Empty ≠ error in the recommender (AC7, AC22)

- [ ] `cake_database_tool.py`: exit `0` for a valid query with zero matches
- [ ] `cake_database_tool.py`: fix `nutsfree` vs the `nut-free` the UI sends
- [ ] `cake_database_tool.py`: allow-list the filters; an unknown filter is an
      error naming the filter, not a silent zero-match
- [ ] `api/main.py`: tell tool failure apart from an empty result; `200` with
      `cakes: []` for empty
- [ ] Frontend: show the AC7 empty copy, never the "unavailable" string
- [ ] Tests: `--query gluten-free --serves 500` exits `0`; `--query nut-free`
      returns matches; `--query purple` errors

**Why second:** verified today — an empty result exits `1`, the FastAPI reads
that as a crash, and the user is told the agent is down and to check port 8003.
Choosing "Nut-Free" reproduces it every time.

## Task 3 — Timeouts and honest proxy errors (AC11, AC17)

- [ ] Replace the inert `timeout: 30000` property with `AbortSignal.timeout(10000)`
      on all three agent calls in `agent-api.js`
- [ ] Separate responses for timeout, unreachable and agent-error
- [ ] Remove ports and internal hostnames from user-facing copy
- [ ] Tests: a server that accepts but never responds yields `503` inside 10s;
      a dead port yields `503` with no port in the message

## Task 4 — Authorization tests (AC1–AC5)

- [ ] `orderuser` reaches all six journey endpoints without a 403
- [ ] `orderuser` is refused on the six admin endpoints, **and** the row count
      is unchanged after each refusal
- [ ] Anonymous gets `401` plus the cleared cookie, never `403`
- [ ] A route in neither policy table is `403` for `orderuser`
- [ ] `POST /api/products` with an `orderuser` cookie and no browser is `403`

**No DOM assertions in this task.** Tab removal in `login.js` is a UI
affordance; it enforces nothing, and a test that checked for a missing button
would pass with the server control entirely removed.

## Task 5 — Empty and loading states (AC6, AC8, AC10)

- [ ] Empty catalog: `role="status"` message, Add Item disabled
- [ ] Loading catalog: `<select>` disabled reading `Loading products…`
- [ ] Failed catalog load: an error, not a silently empty dropdown
      (`initOrderBuilder`'s `catch` is a bare `console.error` today)
- [ ] Empty cart: its own copy, both buttons disabled

## Task 6 — Save-order feedback (AC15, AC16, AC18–AC20, AC32)

- [ ] Replace `alert()` with a `role="status"` confirmation naming customer and
      item count
- [ ] Blank customer name: no request, message, focus to the field
- [ ] Server rejection: show its message verbatim, keep the cart
- [ ] `500`: distinct copy, cart intact
- [ ] Disable Save Order from first activation until the response resolves
- [ ] Test: saved order reads back item-for-item via `GET /api/orders/:id`

## Task 7 — Announced regions (AC9, AC21)

- [ ] `role="alert"` on `#order-error` and `#recommendation-error`
- [ ] `aria-live="polite"` on both loading containers
- [ ] Loading state clears the previous results before the spinner shows
- [ ] `role="status"` region for the order confirmation

## Task 8 — Keyboard (AC23–AC28)

- [ ] Tab strip: `role="tablist"`/`tab`/`tabpanel`, `aria-selected`,
      `aria-controls`, arrows, Home/End, roving `tabindex`, focus moves to panel
- [ ] Escape closes any modal; focus returns to the opener
- [ ] Focus trap inside open modals; background `inert`
- [ ] Enter submits from `#customer-name` and `#serving-size`
- [ ] Focus lands somewhere stated after an `innerHTML` re-render
- [ ] Visible focus ring at 3:1 everywhere, including inside modals
- [ ] Manual pass: complete steps 1–9 with no pointing device

Coordinate with `applyRole()`: it removes tab buttons and panels per role, so
`aria-controls` must not be left dangling for either role.

## Task 9 — Recovery (AC29–AC31, AC33)

- [ ] Persist the cart before the 401 reload; restore and announce after login
- [ ] Same path covers a server restart (sessions are memory-only)
- [ ] Retry after an agent failure without a reload; clear the old error
- [ ] Logout clears the cookie, the cart and any preserved draft

Blocked on Open question 1 in the spec: `sessionStorage` draft, or a re-login
modal over the intact page?

## Task 10 — Recommendation → order handoff (AC12–AC14)

- [ ] Match recommended cakes to `products` rows server-side by exact
      case-insensitive name
- [ ] Matched: **Add to order** switches tab, preselects the product, renders
      empty property dropdowns, focuses `#customer-name`, leaves the cart alone
- [ ] Unmatched: say so on the card; block nothing

Blocked on Open question 2: name matching as a stopgap, or retire the hardcoded
`CAKES_DB` and have the recommender read SQLite?

---

## Not in this list

Recorded in `INBOX.md` instead — real, outside this journey:

- Trailing-slash `/api/products/` misses the both-roles pattern and 403s an
  `orderuser` confusingly (fails closed, so not urgent)
- `order-reporter` accepts a client-supplied `database_url` in the request body
- Both agent APIs are unauthenticated with `allow_origins=["*"]`
- An unknown `/api/...` path returns `index.html` rather than a JSON 404
