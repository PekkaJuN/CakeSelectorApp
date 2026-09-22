# Feature: Service Readiness — "Dietary request to saved order"

Status: **Draft** (not approved; no code has been written against it)

## Problem Statement

Week 1 shipped a product/order CRUD app with a two-role login. Week 2 bolted on
two Python agents behind an HTTP proxy. Each half works when looked at alone,
and nobody has ever specified what the *seam* between them promises.

The seam is where a real user stands. An order-taker on the phone hears "she's
vegan, it's for twelve people" and has to end up with a saved order. Today that
person crosses two systems, four fetch calls and one role boundary, and the app
has no agreed answer for what they should see when the catalog is empty, when
the agent is slow, when the agent returns nothing, when their session has
expired mid-cart, or when they have no mouse.

This spec picks **one** journey, end to end, and states what each of those
moments must do. It does not add features. Everything it asks for is a state the
journey already reaches and currently handles by accident.

## Scope

**In scope:** one journey (below), the states it passes through, and the
inventory of storage and tools it depends on.

**Out of scope:** Products tab, Order History, Order Editing, Reports tab,
pricing, the homework-coach agent, and any change to the auth model. Defects
found outside the journey are recorded in `INBOX.md`, not fixed here.

---

## The Journey

One actor: **an `orderuser`** — the lowest-privileged role, chosen deliberately
because the journey must hold at the tighter permission level.

| # | Step | Surface |
|---|---|---|
| 1 | Opens `http://localhost:3000`, logs in | `login.js` → `POST /api/auth/login` |
| 2 | Lands on Order Builder, switches to Recommendations | `login.js` `applyRole` |
| 3 | Enters "vegan", "12 people", asks for recommendations | `POST /api/agent/recommend` → recommender `:8003` |
| 4 | Reads the suggestions and picks one | recommender's own cake list |
| 5 | Goes to Order Builder, types the customer name | — |
| 6 | Picks the matching catalog product and its property values | `GET /api/products`, `/api/products/:id/properties`, `/api/properties/:id/values` |
| 7 | Adds it to the cart | in-memory `cart` array |
| 8 | Saves the order | `POST /api/orders` → SQLite |
| 9 | Sees confirmation that the order is stored | — |

**Step 4→6 is the break.** The recommender answers from a hardcoded Python list
of five cakes (`tools/cake_database_tool.py`); the Order Builder sells rows from
the SQLite `products` table. Nothing joins them. The user reads "Vegan Red
Velvet Cupcakes", then hunts for something like it in an unrelated dropdown, by
eye. AC12–AC14 below make that handoff explicit rather than leaving it to the
user's memory.

---

## Current State Inventory

### Storage

| Store | Where | Lifetime | Written by | Read by | Notes |
|---|---|---|---|---|---|
| SQLite `cake-selector.db` | repo root; `DB_PATH` env; `/data` volume in Docker | Durable | `src/db/db.js` | app routers, order-reporter agent (direct `sqlite3` connect) | `products`, `properties`, `propertyValues`, `orders`, `orderItems`. No migrations, no `FOREIGN KEYS` pragma set |
| User credentials | `config/users.json` (git-ignored) | Durable, hand-edited | `scripts/hash-password.js` | `src/auth/userStore.js` at boot only | scrypt + per-user salt. Changes need a restart |
| Sessions | `Map` in `src/auth/sessions.js` | Process memory | `createSession` | `authPolicy` | **Lost on every restart.** Absolute 8h TTL, not sliding |
| Cart | `cart` array in `app.js` | Page memory | Order Builder handlers | `POST /api/orders` | **Lost on any reload**, including the 401 auto-reload |
| `EXPIRED_FLAG` | `sessionStorage` | Tab | `login.js` | `login.js` bootstrap | Sole purpose: show "session expired" after the reload |
| Recommender cake list | `CAKES_DB` literal in `tools/cake_database_tool.py` | Source code | — | recommender API | 5 cakes. **Disjoint from SQLite.** Editing needs a redeploy |
| Agent "memory" dirs | `agents/*/memory/data/` | — | nothing | nothing | Scaffolding only; `.gitkeep` and schemas, no data path is wired |
| `varmuuskopio.db`, `users.txt` | repo root | — | — | — | Untracked strays. See Risk |

### Tools and services

| Service | Port | Process | Health | Auth |
|---|---|---|---|---|
| Cake Selector app | 3000 (8080 in Docker) | Node 20 + Express 4 | none | session cookie + policy table |
| cake-recommender | 8003 | FastAPI + uvicorn | `GET /health` | **none — CORS `allow_origins=["*"]`** |
| order-reporter | 8002 | FastAPI + uvicorn | `GET /health` | **none**; accepts `database_url` from the request body |

| Agent tool | Kind | Determinism |
|---|---|---|
| `cake_database_tool.py` | CLI, spawned per request via `subprocess.run` | Deterministic; in-source data |
| `order_core.py` | Imported module | Deterministic; reads SQLite directly |
| `gemini_agent.py` | Optional CLI template | Unused by either running agent |

The app talks to both agents through `src/routes/agent-api.js`, which is a thin
proxy: it forwards the body, and on any throw returns `503` with a fixed English
string naming a port number.

### What is *not* a security control

`login.js` `applyRole()` calls `.remove()` on the tab buttons and panels a role
may not use. That is a UI affordance and nothing more. It does not restrict
anything: the endpoints are one `curl` away, and the removal runs in the
browser, on code the browser can edit.

Authorization in this app is the policy table in
[src/middleware/auth.js:12-28](../src/middleware/auth.js#L12-L28) and nothing
else. It fails closed — an unlisted route is admin-only — which is the property
worth keeping. **Every authorization AC below is written against the HTTP
response, never against what is on screen.** A UI-only assertion would pass
while the control was entirely absent, so this spec does not contain one.

---

## Acceptance Criteria

Format: Given / When / Then, one observable behaviour each, with the expected
value stated. "Shows X" always means a specific element with specific text.

### Authorization

These are asserted at the HTTP layer with a session cookie, no browser.

#### AC1: An orderuser reaches the journey's endpoints
**Given** a valid session cookie for a user with role `orderuser`
**When** the client calls `GET /api/products`, `GET /api/products/:id/properties`,
`GET /api/properties/:id/values`, `POST /api/agent/recommend`, `GET /api/agent/cakes`
and `POST /api/orders`
**Then** every one returns a non-403 status — the journey is completable at the
lower role without a single permission error.

#### AC2: An orderuser cannot reach beyond the journey
**Given** the same `orderuser` cookie
**When** the client calls `POST /api/products`, `DELETE /api/products/:id`,
`GET /api/orders`, `PUT /api/orders/:id`, `DELETE /api/orders/:id` or
`POST /api/agent/report/weekly`
**Then** each returns `403` with body `{"error":"Access denied: admin only"}`
**And** the database is unchanged — a follow-up `GET` as admin returns the same
row count as before the call.

#### AC3: No session means 401, never 403
**Given** no cookie at all
**When** the client calls any `/api` route other than `POST /api/auth/login` and
`POST /api/auth/logout`
**Then** the status is `401` with body `{"error":"Unauthorized: valid session required"}`
**And** the response carries `Set-Cookie: cake_session=;` with `Max-Age=0`.
Authentication is decided before role, so an anonymous caller never learns
whether an endpoint is admin-only.

#### AC4: A new route is closed until opened
**Given** a route mounted under `/api` that appears in neither the `PUBLIC` nor
the `BOTH_ROLES` table
**When** an `orderuser` calls it with a valid session
**Then** the status is `403` — the default-deny is a property of the table, and
a test holds it there so a later refactor cannot quietly invert it.

#### AC5: Removing a tab from the DOM restricts nothing
**Given** an `orderuser` session
**When** `POST /api/products` is called directly — no browser, no tab, no page
**Then** the status is `403`, proving the server refuses independently of what
the UI rendered. This AC exists to be the *only* thing standing between the app
and a false sense of security; it must never be rewritten to inspect the DOM.

### Empty

#### AC6: An empty catalog is stated, not implied
**Given** the `products` table has zero rows
**When** an `orderuser` opens Order Builder
**Then** the product `<select>` holds exactly one option, `-- Select a product --`
**And** a message with `role="status"` reads
`No products in the catalog yet. Ask an admin to add one before taking orders.`
**And** the Add Item button is `disabled`.
Today the dropdown is silently empty and Add Item reports `Product is required`
— blaming the user for the catalog's state.

#### AC7: Zero recommendations is a result, not a failure
**Given** the recommender is running and healthy
**When** the user asks for a combination that matches no cake — e.g. dietary
`gluten-free` with serves `500`
**Then** the response to the browser is `200` with `status: "ok"`, `cakes: []`
**And** the page shows `No cakes match gluten-free for 500 people. Try a wider serving range.`
**And** no text containing `unavailable` appears anywhere on the page.

> **This currently fails, and it is the sharpest defect in the journey.**
> `cake_database_tool.py` returns `0 if results else 1`
> ([tools/cake_database_tool.py:139](../agents/cake-recommender-agent/tools/cake_database_tool.py#L139)),
> so an empty result set exits non-zero. `query_database` in the FastAPI reads
> that as failure and returns `None`, `/recommend` raises `500`, the Node proxy
> catches the non-ok and returns `503`, and the user is told *"Cake recommender
> agent is unavailable. Make sure it is running on port 8003."* Verified:
> `python tools/cake_database_tool.py --query nut-free` prints `{"count": 0}`
> and exits `1`. A perfectly healthy agent that simply has no vegan sheet cake
> accuses itself of being down, and the user goes looking for a crashed service
> that is running fine.

#### AC8: An empty cart is distinguishable from an unsaved one
**Given** the cart array is empty
**When** Order Builder renders
**Then** the cart region reads `No items yet. Pick a product above to start the order.`
**And** the item count badge reads `0 items`
**And** both Clear Cart and Save Order are `disabled`.

### Loading

#### AC9: Every agent call announces that it is working
**Given** an agent request that has not yet resolved
**When** the user clicks Get Recommendations
**Then** within 100ms the button is `disabled` with text `Finding cakes…`
**And** `#recommendation-loading` has `aria-live="polite"` and is visible
**And** the previous result list is cleared — stale cakes must not sit under a
spinner looking current.

#### AC10: Catalog loads have a loading state too
**Given** `GET /api/products` has not resolved
**When** Order Builder initialises
**Then** the product `<select>` is `disabled` and shows `Loading products…`
**And** it becomes enabled when the response arrives
**And** if the request fails, `#order-error` reads
`Could not load the product catalog. Reload the page to try again.`
Today `initOrderBuilder` does this work in a `try` whose `catch` is a bare
`console.error` ([src/public/app.js:604-606](../src/public/app.js#L604-L606)) —
a failed catalog load is indistinguishable from an empty catalog, and both look
like a working dropdown with nothing in it.

#### AC11: A slow agent gives up rather than hanging
**Given** the recommender accepts the connection but never responds
**When** 10 seconds elapse
**Then** the proxy aborts the request and returns `503` with
`{"error":"The recommendation service did not respond in time. Try again."}`
**And** the button is re-enabled.

> The `timeout: 30000` currently passed to `fetch()` in
> [src/routes/agent-api.js:88](../src/routes/agent-api.js#L88) does nothing — it
> is not an option Node's `fetch` recognises, and it is silently discarded.
> There is no timeout on any of the three agent calls today.
> `AbortSignal.timeout(10000)` is the real mechanism.

### Success

#### AC12: A recommendation names what can actually be ordered
**Given** the recommender returns `Vegan Red Velvet Cupcakes`
**When** the result renders
**Then** each cake card shows either an **Add to order** control, when a
`products` row matches the cake by exact case-insensitive name, or the text
`Not in your catalog — add it under Products first`, when none does
**And** the match is computed server-side in `agent-api.js` against
`getProducts()`, not by string-guessing in the browser.

This is the smallest honest fix for the step 4→6 break. It does not merge the
two catalogs; it tells the truth about whether the suggestion is orderable.

#### AC13: Add to order carries the selection across the tab
**Given** a recommended cake with a matching catalog product
**When** the user activates **Add to order**
**Then** the app switches to Order Builder, focus lands on `#customer-name`, the
product `<select>` is set to the matching product id, and the property dropdowns
for that product are rendered and empty
**And** the cart is unchanged — the user still chooses sizes and confirms.

#### AC14: No match blocks nothing
**Given** a recommended cake with no catalog match
**When** the user reads the card
**Then** the rest of Order Builder remains fully usable — the handoff is a
shortcut, never a gate.

#### AC15: A saved order is confirmed on the page
**Given** a cart with at least one item and a non-blank customer name
**When** Save Order succeeds
**Then** the page shows, in an element with `role="status"`,
`Order saved for <customerName> — <n> item(s).`
**And** the cart empties, the customer field clears, the badge reads `0 items`
**And** no `alert()` is called.
`alert()` ([src/public/app.js:730](../src/public/app.js#L730)) blocks the page,
cannot be styled, and is skipped by some screen readers.

#### AC16: The order is actually in the database
**Given** a successful save returning order id `X`
**When** an admin calls `GET /api/orders/X`
**Then** the response contains the same customer name and the same number of
items, each with the selected property value ids.
The UI saying "saved" is not evidence; this AC is the evidence.

### Error

#### AC17: A down agent says so, and only then
**Given** nothing is listening on the recommender's port
**When** the user clicks Get Recommendations
**Then** the page shows
`Recommendations are unavailable right now. You can still build the order by hand.`
**And** Order Builder remains fully functional
**And** the message does **not** name a port number or an internal host.
The current copy ("Make sure it is running on port 8003") is an instruction the
order-taker cannot act on and is wrong under Docker, where the address is
`cake-recommender:8003` inside a network they cannot see.

#### AC18: A validation error names the field
**Given** a cart with one item and a blank customer name
**When** Save Order is activated
**Then** no request is sent, `#order-error` reads `Customer name is required`,
and focus moves to `#customer-name`.

#### AC19: The server's rejection reaches the user unaltered
**Given** a cart item whose product was deleted by an admin in another window
**When** Save Order is activated
**Then** the response is `404` with `{"error":"Product not found: <id>"}`
**And** that exact message is shown
**And** the cart is **not** cleared — the user's work survives a rejection.

#### AC20: A 500 does not look like a validation error
**Given** the database is unwritable
**When** Save Order is activated
**Then** the message reads
`The order could not be saved. Your items are still here — try again.`
**And** the cart still holds every item.

#### AC21: Error regions are announced
**Given** any error message rendered by the journey
**When** it is written into the DOM
**Then** its container carries `role="alert"`
**And** it is reachable in the tab order or referenced by `aria-describedby` from
the field it concerns.
Only `#login-message` has `role="alert"` today; `#order-error` and
`#recommendation-error` are silent divs that a screen-reader user never hears.

#### AC22: The dietary filters offered are the filters that work
**Given** the Recommendations dietary `<select>`
**When** each of its options is submitted in turn against the current cake list
**Then** every option either returns at least one cake or the documented empty
state of AC7 — and no option is silently incapable of ever matching.

> `Nut-Free` is currently such an option. The `<select>` sends `nut-free`;
> `query_cakes` normalises that to `nutfree` and compares against the literal
> `"nutsfree"`
> ([tools/cake_database_tool.py:88](../agents/cake-recommender-agent/tools/cake_database_tool.py#L88)),
> misses, and falls to `else: match = False`, excluding every cake. Verified:
> `--query nut-free` returns `count: 0` against a list where no cake carries a
> nut flag at all. Combined with AC7's exit-code bug, choosing Nut-Free today
> reports the agent as **down**.

### Keyboard navigation

Tested with no pointing device. "Reachable" means Tab or Shift+Tab gets there
and the focus ring is visible at 3:1 contrast against its background.

#### AC23: The whole journey is completable by keyboard alone
**Given** focus on `#login-username` at page load
**When** the user drives steps 1–9 with only Tab, Shift+Tab, arrows, Enter,
Space and Escape
**Then** an order is saved, with no step requiring a pointer.
This is the umbrella AC; AC24–AC28 are the parts that currently break it.

#### AC24: Tabs behave like tabs
**Given** the tab strip
**When** focus is on a tab button
**Then** the strip is `role="tablist"`, each button is `role="tab"` with
`aria-selected` and `aria-controls`, each panel is `role="tabpanel"`
**And** Left/Right arrows move between tabs, Home/End jump to first/last
**And** only the selected tab is in the tab order (roving `tabindex`)
**And** activating a tab moves focus to its panel.

#### AC25: Escape closes any modal
**Given** an open modal
**When** Escape is pressed
**Then** it closes, nothing is saved, and focus returns to the control that
opened it.
No modal in the app handles Escape today.

#### AC26: Focus stays inside an open modal
**Given** an open modal
**When** the user Tabs past its last control
**Then** focus wraps to its first control, never to the page behind it
**And** the background is `inert` or `aria-hidden="true"` while it is open.

#### AC27: Enter submits the form it is typed in
**Given** focus in `#customer-name` or `#serving-size`
**When** Enter is pressed
**Then** the form's primary action runs — Add Item and Get Recommendations
respectively
**And** the page does not navigate or reload.
Several product modals bind `keypress`/Enter already; the journey's two main
inputs do not.

#### AC28: Focus is never lost after a re-render
**Given** focus on a control inside a region about to be re-rendered — a cart
row, the recommendation list
**When** the region re-renders via `innerHTML`
**Then** focus lands on a stated element (the region's heading, or the control's
replacement), never on `<body>`.
Every list in `app.js` is rebuilt with `innerHTML`, which discards focus
silently.

### Recovery

#### AC29: An expired session does not eat the cart
**Given** a cart with three items and a session that has passed its TTL
**When** Save Order is activated and the server answers `401`
**Then** the cart contents are written to `sessionStorage` before the reload
**And** after logging back in the cart is restored with all three items
**And** a `role="status"` message reads
`Your session expired. Your order was restored — check it and save again.`

Today the `window.fetch` wrapper in
[src/public/login.js:97-99](../src/public/login.js#L97-L99) reloads the page on
any `401`. The cart is a plain array in page memory. A user who spent five
minutes on a twelve-item order loses all of it and is told only "Your session
has expired."

#### AC30: Restart is a session event, not data loss
**Given** the server restarts — the session `Map` is memory-only, and
`npm run dev` restarts on every file save
**When** the user's next request arrives
**Then** they get the AC29 treatment: login screen, cart preserved
**And** every order already saved is still in SQLite and returned by
`GET /api/orders`.

#### AC31: Retry after an agent failure needs no reload
**Given** a recommendation attempt that failed per AC11 or AC17
**When** the user activates Get Recommendations again and the agent is now up
**Then** results render normally
**And** the previous error message is cleared
**And** no page reload occurred — form values survive the failure.

#### AC32: A double submit creates one order
**Given** a valid cart
**When** Save Order is activated twice in rapid succession
**Then** exactly one order exists for that customer at that timestamp
**And** the button is `disabled` from the first activation until the response
resolves.
Nothing prevents the second click today.

#### AC33: Logout clears the client
**Given** a logged-in user with items in the cart
**When** Log out is activated
**Then** `POST /api/auth/logout` returns `200`, the session cookie is cleared,
the cart and any preserved draft are removed from `sessionStorage`
**And** the login screen is shown.
A preserved draft must not outlive a deliberate logout — AC29 is for
interruptions, not for the next person at the same machine.

---

## Files to Modify

| File | Change |
|---|---|
| `agents/cake-recommender-agent/tools/cake_database_tool.py` | Exit `0` on a valid query with zero matches; reserve non-zero for real failure. Fix the `nutsfree`/`nut-free` mismatch; add an explicit filter allow-list so an unknown filter errors instead of matching nothing (AC7, AC22) |
| `agents/cake-recommender-agent/api/main.py` | Distinguish tool failure from an empty result; return `200` with `cakes: []` for the latter (AC7) |
| `src/routes/agent-api.js` | `AbortSignal.timeout(10000)` on all three calls; drop the dead `timeout` property; separate timeout / unreachable / agent-error responses; strip internal hosts and ports from user-facing copy; add catalog matching for AC12 (AC11, AC12, AC17) |
| `src/public/app.js` | Loading and empty states for the catalog and the cart; `role="status"` confirmation replacing `alert()`; submit-button disabling; Escape and focus-trap handling for modals; focus restoration after re-render; Enter on the two journey inputs; cart draft save/restore (AC6, AC8–AC10, AC15, AC18–AC20, AC25–AC29, AC32) |
| `src/public/index.html` | `role="tablist"`/`tab`/`tabpanel` and `aria-controls` on the tab strip; `role="alert"` on `#order-error` and `#recommendation-error`; `aria-live="polite"` on the loading containers; `role="status"` region for order confirmation (AC21, AC24) |
| `src/public/login.js` | Preserve the cart before the 401 reload; restore and announce after login; clear it on logout (AC29, AC30, AC33) |
| `src/public/styles.css` | Visible focus ring at 3:1 on every interactive control, including inside modals (AC23) |
| `src/middleware/auth.js` | No change to the policy itself. Tests only — AC4 and AC5 pin the current default-deny behaviour so a refactor cannot invert it |
| `tests/journey/*.test.js` | New: the HTTP-level authorization and persistence ACs |

## Risk

- **Changing the tool's exit code** is a contract change for anything shelling
  out to it. Only `api/main.py` and `cake_recommender_agent.py` do, both in this
  repo, both updated together. The CLI's human-facing output is unchanged.
- **The tab-strip rewrite touches every tab**, including the three outside this
  journey. Role-based tab removal in `applyRole()` runs against the same
  buttons; `aria-controls` must be removed with its panel or it dangles.
  Mitigation: `applyRole` removes the pair, as it does now, and a test asserts
  no dangling `aria-controls` for each role.
- **Cart preservation writes order contents to `sessionStorage`** — customer
  names in browser storage. Scoped to the tab, cleared on logout (AC33). If that
  is not acceptable, the alternative is to block the reload and show a re-login
  modal over the intact page, which is more code and more edge cases. Flagging
  it rather than deciding it — see Open question 1.
- **`npm test` currently runs against the live `cake-selector.db` and every test
  file begins with `DELETE FROM products`.** Adding journey tests multiplies that
  blast radius. The journey suite must point at its own database file via
  `DB_PATH` before a line of it is written. This is why the suite was not run
  while writing this spec.
- **Untracked strays:** `users.txt` and `varmuuskopio.db` sit in the repo root,
  neither ignored nor explained. `varmuuskopio.db` is a database backup;
  `users.txt` sits beside a credentials feature. Both need checking for secrets
  and either ignoring or deleting — your call on your own files, not a change
  this spec makes.
- **Rollback:** every change is additive UI state plus two Python fixes. Revert
  the commit; no schema change, no data migration, no config change.

## Testing Strategy

Route-level tests use the real routers and a dedicated database. Browser-level
ACs (keyboard, focus, announcements) are listed here as named manual cases — the
repo has no DOM harness, and introducing one is a task of its own, out of this
spec's scope.

| Function / Surface | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `authPolicy` | orderuser journey allow | orderuser cookie | each of the 6 journey endpoints | no 403 | AC1 |
| `authPolicy` | orderuser denial + no effect | orderuser cookie | `POST /api/products` | 403, admin `GET` row count unchanged | AC2, AC5 |
| `authPolicy` | anonymous | no cookie | `GET /api/products` | 401 + cleared cookie | AC3 |
| `authPolicy` | unlisted route | orderuser cookie | route absent from both tables | 403 | AC4 |
| `query_cakes` | empty is not failure | healthy list | `--query gluten-free --serves 500` | `count: 0`, exit `0` | AC7 |
| `query_cakes` | nut-free matches | healthy list | `--query nut-free` | every nut-free cake returned | AC22 |
| `query_cakes` | unknown filter | healthy list | `--query purple` | non-zero exit, error naming the filter | AC22 |
| `POST /recommend` | empty result | recommender up | no-match request | 200, `status: ok`, `cakes: []` | AC7 |
| `POST /recommend` | tool failure | tool made unreadable | any request | 500, message distinct from empty | AC7 |
| `agent-api` proxy | timeout | server accepts, never responds | `POST /api/agent/recommend` | 503 within 10s, timeout copy | AC11 |
| `agent-api` proxy | unreachable | nothing on the port | same | 503, no port in message | AC17 |
| `agent-api` proxy | catalog match | product named like the cake | `POST /api/agent/recommend` | cake carries matching `productId` | AC12 |
| `agent-api` proxy | no catalog match | no such product | same | cake carries `productId: null` | AC12, AC14 |
| `POST /api/orders` | happy path | valid cart | save | 201, `GET /api/orders/:id` matches item for item | AC15, AC16 |
| `POST /api/orders` | blank name | one item, blank name | save | 400 `Customer name is required` | AC18 |
| `POST /api/orders` | deleted product | product removed mid-session | save | 404 `Product not found: <id>` | AC19 |
| Order Builder (manual) | empty catalog | 0 products | open tab | `role="status"` message, Add Item disabled | AC6 |
| Order Builder (manual) | catalog load fails | `/api/products` returns 500 | open tab | error shown, not a silent empty select | AC10 |
| Order Builder (manual) | empty cart | fresh tab | render | empty copy, both buttons disabled | AC8 |
| Order Builder (manual) | save failure | DB unwritable | save | 500 copy, cart intact | AC20 |
| Order Builder (manual) | double submit | valid cart | activate save twice fast | one order, button disabled between | AC32 |
| Recommendations (manual) | loading | slow agent | click | button disabled, `aria-live` region visible, old list cleared | AC9 |
| Recommendations (manual) | handoff | matching cake | activate Add to order | Order Builder focused, product preselected, cart unchanged | AC13 |
| Recommendations (manual) | retry | agent restored after failure | click again | results render, error cleared, no reload | AC31 |
| Keyboard (manual) | full journey | keyboard only | steps 1–9 | order saved | AC23 |
| Keyboard (manual) | tab strip | focus on a tab | arrows, Home, End | selection moves, focus enters panel | AC24 |
| Keyboard (manual) | modal escape | open modal | Escape | closes, focus returns to opener | AC25 |
| Keyboard (manual) | focus trap | open modal | Tab past last control | wraps inside | AC26 |
| Keyboard (manual) | enter submits | focus in customer name | Enter | Add Item runs, no reload | AC27 |
| Keyboard (manual) | focus after render | focus in cart row | row re-renders | focus on stated element, not `<body>` | AC28 |
| Screen reader (manual) | announcements | any journey error | rendered | announced via `role="alert"` | AC21 |
| Recovery (manual) | expired session | 3-item cart, expired TTL | save | login screen, cart restored, message shown | AC29 |
| Recovery (manual) | restart | 3-item cart | restart server, act | same as AC29; saved orders intact | AC30 |
| Recovery (manual) | logout | items in cart | log out | draft cleared from `sessionStorage` | AC33 |

## Spec Readiness checklist

- [x] Every AC is Given/When/Then with a precise expected value
- [x] Files to modify are listed with what changes in each
- [x] Risk: what could break, and how to roll back
- [x] Testing strategy covers every AC, plus error and edge cases
- [x] Every AC has at least one named test case
- [x] Every AC can fail
- [x] No AC asserts security from the absence of a UI element

## Open questions — answer before this spec is approved

1. **Cart in `sessionStorage` (AC29)** — acceptable, or should an expired
   session show a re-login modal over the intact page instead?
2. **The two catalogs (AC12)** — is name matching the right stopgap, or should
   the recommender read the SQLite `products` table and the hardcoded `CAKES_DB`
   be retired? The second is the honest fix and is a larger job.
3. **Manual ACs** — accept them as manual for now, or add a DOM test harness
   first? A harness would be the first real build-tooling dependency in a repo
   whose `AGENTS.md` says no build step.
4. **`users.txt` and `varmuuskopio.db`** — what are they, and should they be
   ignored or removed?

Task list: [TASKS-service-readiness.md](../TASKS-service-readiness.md)
