# Product Requirements Document: Authentication and Authorization

**Version:** 1.1
**Date:** 2026-09-21
**Author:** Claude Code
**Status:** Draft

**Changes in 1.1:** passwords are stored as scrypt hashes with a per-user salt held
as its own field, instead of plaintext (§3.1, §3.2); adds `npm run auth:hash`
(AC56–AC67).

---

## 1. Overview

The Cake Selector App currently has no access control: anyone who can reach
`http://localhost:3000` can manage the product catalog, read every order, run the
weekly report and use the recommender. This document specifies a login step and a
two-role permission model so the app can be used by two different kinds of people
on the same machine or the same small network.

**Roles**

| Role | Who they are | What they do |
|---|---|---|
| `admin` | The owner of the bakery / catalog | Everything the app offers |
| `orderuser` | A person who only takes orders | Builds and saves orders, asks the recommender |

Users are stored in a **configuration file**, not in the database and not in code.
Passwords are never written to that file in the clear: each user carries a
**scrypt hash** plus its own **salt**, held as two separate fields. There is no
self-service signup, no password reset and no user management UI — the operator
generates a hash with a CLI tool, edits the config file and restarts the app.

---

## 2. Goals and Non-Goals

### Goals
- Every request to the app is attributed to a known user before it does anything.
- An `orderuser` cannot reach Products, Order History or Reports — not through the
  UI, and not by calling the API directly.
- Adding, removing or repointing a user is a config-file edit plus a restart.
- A stolen `config/users.json` does not hand over the passwords: they are salted
  and hashed, with the salt stored as its own field next to the hash.
- No new npm dependency: sessions and password hashing are built on `node:crypto`
  and Express only (AGENTS.md: "Minimal dependencies — justify all npm packages").

### Non-Goals (out of scope for this version)
- Password rotation policy, password strength rules, account lockout after N
  failed attempts
- Self-service signup, password reset, "remember me"
- More than two roles, or per-user permission overrides
- Per-user data ownership (orders are **not** scoped to their creator — see §4.3)
- Audit log of who changed what
- HTTPS / TLS termination (the app stays local HTTP)

---

## 3. Functional Requirements

### 3.1 User store (configuration)

Users live in `config/users.json`, read once at server start. **No password appears
in this file.** Each user carries a hash and, as a separate sibling field, the salt
that hash was derived with.

```json
{
  "sessionTtlHours": 8,
  "hash": {
    "algorithm": "scrypt",
    "keyLength": 64,
    "cost": 16384,
    "blockSize": 8,
    "parallelization": 1
  },
  "users": [
    {
      "username": "admin",
      "role": "admin",
      "salt": "3f9a1c7d2e8b4a60f15c93d7b2e4a081",
      "passwordHash": "a1b2…(128 hex chars)…9f0e"
    },
    {
      "username": "orderuser",
      "role": "orderuser",
      "salt": "7c14e9b05a3d6f28c9017b4e5d2a8f63",
      "passwordHash": "0d4c…(128 hex chars)…3a7b"
    }
  ]
}
```

**Per-user fields**

| Field | Meaning |
|---|---|
| `username` | Case-insensitive on login; trimmed and lowercased before comparison |
| `role` | Exactly `"admin"` or `"orderuser"`; anything else is a startup error |
| `salt` | **The unhashing value, stored separately from the hash.** 16 random bytes, hex-encoded (32 characters). Generated fresh per user — never derived from the username, never reused between users, never a global constant |
| `passwordHash` | `scrypt(password, salt, keyLength)`, hex-encoded (128 characters) |

Keeping the salt in its own field rather than packing it into the hash string is
what makes the file legible: an operator can see at a glance that two users have
different salts, and a corrupted or hand-edited entry is obvious. The cost is that
both fields must be validated as a pair — §3.2 covers that.

**Top-level fields**

| Field | Meaning |
|---|---|
| `sessionTtlHours` | Optional, default `8`, must be a positive number |
| `hash.algorithm` | Must be `"scrypt"` — the only algorithm this version accepts |
| `hash.keyLength` | Hash length in bytes, default `64` |
| `hash.cost` / `blockSize` / `parallelization` | scrypt `N`, `r`, `p`; defaults `16384` / `8` / `1` |

The parameters live in the file rather than in code so they can be raised later
without invalidating existing hashes — a hash generated under the old parameters
still verifies as long as the file still describes them.

**Path override:** `AUTH_CONFIG_PATH` env var may point at a different file. This
lets tests load a fixture without touching the real config.

`config/users.json` is git-ignored. `config/users.example.json` is committed as the
template, carrying real hashes for throwaway passwords so a fresh clone can log in
and see the app before setting its own.

### 3.2 Hash generation and startup validation

**Generating a hash** — `npm run auth:hash` runs `scripts/hash-password.js`:

```
$ npm run auth:hash -- admin admin
Password: ********
Confirm:  ********

Add this to config/users.json:

{
  "username": "admin",
  "role": "admin",
  "salt": "3f9a1c7d2e8b4a60f15c93d7b2e4a081",
  "passwordHash": "a1b2…9f0e"
}
```

The role is a required second argument — the tool refuses to guess a privilege
level. The password is read from a TTY with echo disabled and is never taken as a
command argument — an argument would land in shell history and in the process list. The
tool only prints the JSON; it does not edit `config/users.json`, so it can never
clobber a working user list.

**Startup validation** — the server refuses to start (exit code 1, message on
stderr) when the config is missing, is not valid JSON, has zero users, has a
duplicate username, has a blank username, has an unknown role, has
`hash.algorithm` other than `"scrypt"`, or has any user whose `salt` or
`passwordHash` is missing, blank, not hex, or the wrong length for the configured
`keyLength`.

It also refuses to start if any user still carries a `password` field. That guard
exists for one specific accident: a half-migrated config where someone pasted a
plaintext password back in. Without it, the field would simply be ignored and the
operator would believe a password works when it does not — or, worse, a future
edit could resurrect plaintext matching unnoticed.

Failing loud at boot is deliberate throughout: a silently empty user list is an
app nobody can log into, or worse, one whose login check passes vacuously.

### 3.3 Login

- `POST /api/auth/login` with `{username, password}` — the password arrives in the
  clear from the browser and is hashed server-side for comparison; it is never
  logged, and never stored anywhere but the request lifetime
- Verification: look up the user, derive `scrypt(submitted, user.salt, keyLength)`
  with the configured parameters, and compare against `user.passwordHash` using
  `crypto.timingSafeEqual`
- On success: `200` with `{username, role}`, plus a session cookie (§3.5)
- On bad username **or** bad password: `401` with
  `{error: "Invalid username or password"}` — one message for both cases, so the
  response does not reveal which usernames exist
- **Unknown usernames still pay for a hash.** When no user matches, the server
  derives a hash against a dummy salt before replying, so a wrong username and a
  wrong password take comparable time. Skipping the work would turn response
  latency into a username oracle, undoing the shared error message above.
- On missing/blank `username`: `400` `{error: "Username is required"}`
- On missing/blank `password`: `400` `{error: "Password is required"}`
- The login endpoint itself requires no session

Hashing is deliberately slow (~100ms at `cost: 16384`). `crypto.scrypt`'s async
form is used, never `scryptSync` — the sync call would block the event loop for
every concurrent login, and this is a single-process app with nothing else to
serve requests.

### 3.4 Logout

- `POST /api/auth/logout` destroys the server-side session and clears the cookie
- Returns `200` `{ok: true}` whether or not a valid session was present — logout is
  idempotent
- The client then shows the login screen

### 3.5 Sessions

- On login the server generates a 32-byte random token
  (`crypto.randomBytes(32).toString('hex')`) and stores
  `{username, role, expiresAt}` against it in an in-memory `Map`.
- The token is returned as cookie `cake_session` with
  `HttpOnly; SameSite=Strict; Path=/; Max-Age=<ttl>`. The `Secure` flag is set only
  when `process.env.HTTPS === 'true'` — the app is served over plain HTTP on
  localhost, and an unconditional `Secure` flag would make the cookie never come
  back.
- Every protected request looks the token up. Missing, unknown or expired token →
  `401` `{error: "Unauthorized: valid session required"}`, and the cookie is
  cleared.
- Expiry is absolute, not sliding: a session issued at T dies at T + TTL regardless
  of activity. Simpler to reason about, and an 8-hour default covers a working day.
- Sessions are in memory only: **restarting the server logs everyone out.** For a
  single-process local app that is acceptable and avoids a session table.

### 3.6 Current user

- `GET /api/auth/me` → `200` `{username, role}` for a valid session, `401`
  otherwise.
- The frontend calls this on page load to decide which tabs to render. It is the
  only thing that decides the *initial* UI state.

---

## 4. Authorization Model

### 4.1 Tab access

| Tab | `admin` | `orderuser` |
|---|---|---|
| Products | ✅ | ❌ hidden |
| Order Builder | ✅ | ✅ |
| Order History | ✅ | ❌ hidden |
| Recommendations | ✅ | ✅ |
| Reports | ✅ | ❌ hidden |

An `orderuser` sees exactly two tabs: **Order Builder** and **Recommendations**.
Order Builder is the first active tab for that role (today it is Products, which
they cannot see).

### 4.2 Endpoint access

`A` = admin only, `A+O` = both roles, `—` = no session needed.

| Method | Endpoint | Access | Serves |
|---|---|---|---|
| POST | `/api/auth/login` | — | login |
| POST | `/api/auth/logout` | — | logout |
| GET | `/api/auth/me` | A+O | UI bootstrap |
| GET | `/api/products` | A+O | Products tab **and** Order Builder product picker |
| POST | `/api/products` | A | Products tab |
| PUT | `/api/products/:id` | A | Products tab |
| DELETE | `/api/products/:id` | A | Products tab |
| GET | `/api/products/:id/properties` | A+O | Products tab **and** Order Builder property pickers |
| POST | `/api/products/:id/properties` | A | Products tab |
| DELETE | `/api/products/properties/:id` | A | Products tab |
| GET | `/api/properties/:id/values` | A+O | Order Builder property pickers |
| POST | `/api/properties/:id/values` | A | Products tab |
| POST | `/api/products/properties/:id/values` | A | Products tab |
| PUT | `/api/products/values/:id` | A | Products tab |
| PUT | `/api/propertyValues/:id` | A | Products tab |
| DELETE | `/api/products/values/:id` | A | Products tab |
| DELETE | `/api/properties/:id` | A | Products tab |
| DELETE | `/api/propertyValues/:id` | A | Products tab |
| POST | `/api/orders` | A+O | Order Builder — save order |
| GET | `/api/orders` | A | Order History |
| GET | `/api/orders/:id` | A | Order History |
| PUT | `/api/orders/:id` | A | Order History — edit order |
| DELETE | `/api/orders/:id` | A | Order History — delete order |
| DELETE | `/api/orders/:orderId/items/:itemId` | A | Order History — remove item |
| POST | `/api/agent/recommend` | A+O | Recommendations tab |
| GET | `/api/agent/cakes` | A+O | Recommendations tab |
| GET | `/api/agent/health` | A+O | agent status indicator |
| POST | `/api/agent/report/weekly` | A | Reports tab |

**Read-only catalog access for `orderuser` is deliberate.** Order Builder cannot
populate its product dropdown or its property pickers without `GET /api/products`,
`GET /api/products/:id/properties` and `GET /api/properties/:id/values`. "Access to
the Products *tab*" means the management UI and every write to the catalog — those
stay admin-only. Reading the catalog is part of building an order.

### 4.3 Two consequences worth stating plainly

1. **An `orderuser` can save an order but cannot see it again.** Order History is
   admin-only, so after "Save Order" the order leaves their view for good. If the
   intent is that order takers should review or correct their own work, this PRD
   needs a third rule — per-user order ownership — which is listed as a non-goal
   above. Flagged here because it is the one place where the role split is likely
   to surprise a real user.
2. **Orders carry no author.** The `orders` table has `customerName` but no
   `createdBy`. Nothing in this document requires one, and nothing here can answer
   "which user entered this order".

### 4.4 Denial responses

| Situation | Status | Body |
|---|---|---|
| No session / expired / unknown token | `401` | `{error: "Unauthorized: valid session required"}` |
| Valid session, wrong role | `403` | `{error: "Access denied: admin only"}` |

Order matters: authentication is checked before authorization, so an anonymous
caller to an admin endpoint gets `401`, never `403`.

---

## 5. User Interface

### 5.1 Login screen

Shown whenever `GET /api/auth/me` returns `401`. It replaces the tab UI entirely —
the tab bar and all tab content are hidden, so nothing about the catalog or the
orders renders before a session exists.

- Username field (autofocus), password field (`type="password"`), "Log in" button
- Client-side check: blank username → "Username is required" under the field, no
  request sent. Same for password.
- Server `401` → "Invalid username or password" above the form; the password field
  is cleared and refocused; the username field keeps its value.
- Enter in either field submits.

### 5.2 Header

Once authenticated, the header shows `Signed in as <username> (<role>)` and a
**Log out** button, to the right of the app title. Neither is rendered on the login
screen.

### 5.3 Tab rendering

- After `GET /api/auth/me` resolves, tabs not permitted for the role are removed
  from the DOM — not merely hidden with CSS. A hidden-but-present button is one
  devtools click away from being pressed, and leaves dead handlers wired up.
- The first permitted tab is activated: Products for `admin`, Order Builder for
  `orderuser`.

### 5.4 Session loss mid-use

Any API call that returns `401` tears down the UI and returns to the login screen
with the message "Your session has expired. Please log in again." This is what a
user sees after the TTL lapses or after a server restart.

---

## 6. Technical Design

### 6.1 New files

| File | Purpose |
|---|---|
| `config/users.json` | The user store — hashes and salts only, git-ignored |
| `config/users.example.json` | Committed template with throwaway credentials |
| `src/auth/password.js` | `hashPassword(password, salt, params)`, `generateSalt()`, `verifyPassword(submitted, user, params)` — async scrypt + `timingSafeEqual` |
| `scripts/hash-password.js` | CLI that prompts for a password with echo off and prints the `{username, role, salt, passwordHash}` block to paste into the config |
| `src/auth/userStore.js` | Load + validate config at startup (including salt/hash shape); `findUser(username)`; `authenticate(username, password)` with the dummy-hash path for unknown users |
| `src/auth/sessions.js` | `createSession(user)`, `getSession(token)`, `destroySession(token)`, periodic sweep of expired entries |
| `src/routes/auth.js` | `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me` |
| `src/middleware/auth.js` | `requireAuth`, `requireAdmin` |
| `src/public/login.js` | Login form rendering and submit handling |

`src/auth/` and `src/middleware/` already exist and are empty — this is what they
were made for.

### 6.2 Modified files

| File | Change |
|---|---|
| `src/server.js` | Load user config at boot (exit 1 on invalid); parse the session cookie; mount `/api/auth`; apply `requireAuth` to all `/api/*` except `/api/auth/login` and `/api/auth/logout`; apply `requireAdmin` to the admin-only property/propertyValue routes defined inline here |
| `src/routes/products.js` | `requireAdmin` on every write; reads stay `requireAuth` |
| `src/routes/orders.js` | `requireAdmin` on every route except `POST /` |
| `src/routes/agent-api.js` | `requireAdmin` on `POST /report/weekly`; the rest stay `requireAuth` |
| `src/public/index.html` | Login screen markup; header user block and Log out button; `login.js` script tag |
| `src/public/app.js` | Bootstrap via `GET /api/auth/me`; remove non-permitted tabs; activate the first permitted tab; central `401` handler that returns to login |
| `src/public/styles.css` | Login screen, header user block, Log out button |
| `.gitignore` | `config/users.json` |
| `package.json` | Add `"auth:hash": "node scripts/hash-password.js"` |
| `AGENTS.md` | Replace the "No authentication" constraint with the two-role rule |

### 6.3 Cookie parsing

Express 4 does not parse cookies. Rather than add `cookie-parser`, the session
middleware reads `req.headers.cookie` and pulls out `cake_session` with a small
split — one cookie, one name, no need for a dependency.

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| **A leaked `config/users.json` exposes password hashes.** | Passwords are scrypt-hashed with a per-user random salt, so the file yields no plaintext and no rainbow-table shortcut. `cost: 16384` makes each guess cost ~100ms, which prices offline brute force out for anything but a trivially weak password. The file stays git-ignored regardless. |
| **Weak passwords survive hashing.** Hashing slows an attacker down; it does not rescue `admin`/`admin`. | The hash tool rejects passwords under 8 characters. Enforcing more (complexity rules, breach lists) is a non-goal for a local app. |
| **A recovered password cannot be recovered.** There is no way back from a hash, so a forgotten password means regenerating it. | `npm run auth:hash` regenerates in one command and the operator edits one field. Documented in the README section this change adds. |
| **No TLS.** Credentials cross the wire in the clear on POST /api/auth/login. | Acceptable on localhost. Documented as a hard limit on network deployment. |
| **Sessions die on restart.** `npm run dev` restarts on every file save. | Documented. Logging back in is a two-field form. |
| **A missed route = an open door.** Any `/api/*` route added later without a guard is public. | `requireAuth` is applied as blanket middleware on `/api` *before* the routers mount, so new routes are protected by default and must opt out explicitly. |
| **Admin-only UI removal is not security.** | Every hidden tab has a matching server-side `requireAdmin`. The DOM removal is UX; the middleware is the control. |
| **Shared accounts.** Two people using `orderuser` are indistinguishable. | Accepted — orders have no author field anyway (§4.3). |

**Rollback:** remove the blanket `requireAuth`/`requireAdmin` middleware from
`src/server.js` and the three routers, and stop hiding tabs in `app.js`. The auth
modules and config file can stay in place unused; nothing in the database schema
changes, so there is no data migration to undo.

---

## 8. Acceptance Criteria

AC numbers are stable identifiers referenced by the test tables in §9. New criteria
append rather than renumber, so the hashing group added in v1.1 is AC56–AC67.

### Configuration

**AC1** — **Given** `config/users.json` holds `admin` and `orderuser`, each with a
`salt` and a `passwordHash` generated from `admin123` and `order123` respectively,
**when** the server starts, **then** it starts successfully and both users can log
in with those plaintext passwords.

**AC2** — **Given** `config/users.json` does not exist, **when** the server starts,
**then** it exits with code 1 and prints
`Auth config not found at <path>` to stderr.

**AC3** — **Given** `config/users.json` contains a user with role `"superuser"`,
**when** the server starts, **then** it exits with code 1 and prints
`Invalid role "superuser" for user "<name>": must be "admin" or "orderuser"`.

**AC4** — **Given** `config/users.json` lists the username `admin` twice, **when**
the server starts, **then** it exits with code 1 and prints
`Duplicate username in auth config: admin`.

**AC5** — **Given** `config/users.json` has `"users": []`, **when** the server
starts, **then** it exits with code 1 and prints
`Auth config contains no users`.

**AC6** — **Given** `AUTH_CONFIG_PATH=./test/fixtures/users.json` is set, **when**
the server starts, **then** users are read from that path and `config/users.json`
is not read.

### Password hashing

**AC56** — **Given** a config user with `salt: "3f9a…"` and a `passwordHash`
derived from `admin123` under that salt, **when** `authenticate("admin",
"admin123")` runs, **then** it returns `{username: "admin", role: "admin"}`.

**AC57** — **Given** the same user, **when** `authenticate("admin", "admin124")`
runs, **then** it returns `null` — a one-character difference does not verify.

**AC58** — **Given** two config users created with the same password, **when** the
config is inspected, **then** their `salt` values differ and their `passwordHash`
values differ. Identical hashes would mean the salt is not being applied.

**AC59** — **Given** a config user whose `salt` is `"not-hex!!"`, **when** the
server starts, **then** it exits with code 1 and prints
`Invalid salt for user "<name>": must be hex`.

**AC60** — **Given** a config user with a `passwordHash` of 64 hex characters while
`hash.keyLength` is `64` (which requires 128), **when** the server starts, **then**
it exits with code 1 and prints
`Invalid passwordHash for user "<name>": expected 128 hex characters, got 64`.

**AC61** — **Given** a config user with a `passwordHash` but no `salt`, **when** the
server starts, **then** it exits with code 1 and prints
`Missing salt for user "<name>"`.

**AC62** — **Given** a config user that still carries a `password` field, **when**
the server starts, **then** it exits with code 1 and prints
`User "<name>" has a plaintext "password" field; hash it with npm run auth:hash`.

**AC63** — **Given** `hash.algorithm` is `"md5"`, **when** the server starts,
**then** it exits with code 1 and prints
`Unsupported hash algorithm "md5": only "scrypt" is supported`.

**AC64** — **Given** no `hash` block in the config, **when** the server starts,
**then** defaults apply: `algorithm: "scrypt"`, `keyLength: 64`, `cost: 16384`,
`blockSize: 8`, `parallelization: 1`.

**AC65** — **Given** `scripts/hash-password.js` is run with the username `admin`
and the password `admin123` entered twice, **when** it completes, **then** it
prints a JSON block containing `"username": "admin"`, a 32-character hex `salt` and
a 128-character hex `passwordHash`, and `config/users.json` is not modified.

**AC66** — **Given** the hash tool is run and the confirmation entry does not match
the first, **when** it completes, **then** it prints `Passwords do not match` and
exits with code 1 without printing a hash.

**AC67** — **Given** the hash tool is run with the password `short`, **when** it
completes, **then** it prints `Password must be at least 8 characters` and exits
with code 1 without printing a hash.

### Login and logout

**AC7** — **Given** the login screen, **when** `POST /api/auth/login`
`{username: "admin", password: "admin123"}` is sent, **then** status is `200`, the
body is `{username: "admin", role: "admin"}`, and the response sets cookie
`cake_session` with `HttpOnly`, `SameSite=Strict`, `Path=/`.

**AC8** — **Given** the login screen, **when** `POST /api/auth/login`
`{username: "orderuser", password: "order123"}` is sent, **then** status is `200`
and the body is `{username: "orderuser", role: "orderuser"}`.

**AC9** — **Given** the login screen, **when** `POST /api/auth/login`
`{username: "ADMIN", password: "admin123"}` is sent, **then** status is `200` and
the body is `{username: "admin", role: "admin"}` — username matching is
case-insensitive.

**AC10** — **Given** the login screen, **when** `POST /api/auth/login`
`{username: "admin", password: "wrong"}` is sent, **then** status is `401`, the body
is `{error: "Invalid username or password"}`, and no `cake_session` cookie is set.

**AC11** — **Given** the login screen, **when** `POST /api/auth/login`
`{username: "nobody", password: "whatever"}` is sent, **then** status is `401` and
the body is `{error: "Invalid username or password"}` — byte-identical to AC10.

**AC12** — **Given** the login screen, **when** `POST /api/auth/login` `{password:
"admin123"}` is sent, **then** status is `400` and the body is
`{error: "Username is required"}`.

**AC13** — **Given** the login screen, **when** `POST /api/auth/login` `{username:
"admin"}` is sent, **then** status is `400` and the body is
`{error: "Password is required"}`.

**AC14** — **Given** the login form is displayed, **when** the user leaves username
blank and clicks "Log in", **then** no request is sent and "Username is required"
appears under the username field.

**AC15** — **Given** the login form is displayed, **when** the user enters a
username, leaves password blank and clicks "Log in", **then** no request is sent
and "Password is required" appears under the password field.

**AC16** — **Given** a login attempt returned `401`, **when** the response is
rendered, **then** "Invalid username or password" is shown above the form, the
password field is empty and focused, and the username field still holds what was
typed.

**AC17** — **Given** a valid session, **when** `POST /api/auth/logout` is sent,
**then** status is `200`, the body is `{ok: true}`, the `cake_session` cookie is
cleared (`Max-Age=0`), and the next `GET /api/auth/me` with the old token returns
`401`.

**AC18** — **Given** no session, **when** `POST /api/auth/logout` is sent, **then**
status is `200` and the body is `{ok: true}`.

### Sessions

**AC19** — **Given** a session was created at time T with `sessionTtlHours: 8`,
**when** `GET /api/auth/me` is called at T + 7h59m, **then** status is `200`.

**AC20** — **Given** a session was created at time T with `sessionTtlHours: 8`,
**when** `GET /api/auth/me` is called at T + 8h01m, **then** status is `401`, the
body is `{error: "Unauthorized: valid session required"}`, and the cookie is
cleared.

**AC21** — **Given** a request carrying `cake_session=deadbeef` (a token the server
never issued), **when** any protected endpoint is called, **then** status is `401`
and the body is `{error: "Unauthorized: valid session required"}`.

**AC22** — **Given** a valid admin session, **when** `GET /api/auth/me` is called,
**then** status is `200` and the body is `{username: "admin", role: "admin"}`.

**AC23** — **Given** no cookie at all, **when** `GET /api/auth/me` is called,
**then** status is `401`.

### Admin authorization

**AC24** — **Given** an admin session, **when** `GET /api/products` is called,
**then** status is `200` and the product list is returned.

**AC25** — **Given** an admin session, **when** `POST /api/products {name: "Carrot
Cake"}` is called, **then** status is `201` and the product is created.

**AC26** — **Given** an admin session, **when** `GET /api/orders` is called, **then**
status is `200` and all orders are returned.

**AC27** — **Given** an admin session, **when** `POST /api/agent/report/weekly` is
called, **then** the request reaches the order reporter agent (status `200`, or
`503` if the agent is not running — the guard does not interfere either way).

**AC28** — **Given** an admin session, **when** `POST /api/agent/recommend` is
called, **then** the request reaches the cake recommender agent.

**AC29** — **Given** an admin session, **when** `POST /api/orders {customerName:
"Ada", items: [...]}` is called, **then** status is `201` — admins can build orders
too.

### OrderUser authorization

**AC30** — **Given** an orderuser session, **when** `GET /api/products` is called,
**then** status is `200` — the catalog is readable for the Order Builder pickers.

**AC31** — **Given** an orderuser session, **when** `GET
/api/products/:id/properties` is called, **then** status is `200`.

**AC32** — **Given** an orderuser session, **when** `GET /api/properties/:id/values`
is called, **then** status is `200`.

**AC33** — **Given** an orderuser session, **when** `POST /api/products {name:
"Carrot Cake"}` is called, **then** status is `403`, the body is
`{error: "Access denied: admin only"}`, and no product is created.

**AC34** — **Given** an orderuser session and an existing product `p1`, **when**
`PUT /api/products/p1 {name: "Renamed"}` is called, **then** status is `403` and the
product name is unchanged.

**AC35** — **Given** an orderuser session and an existing product `p1`, **when**
`DELETE /api/products/p1` is called, **then** status is `403` and the product still
exists.

**AC36** — **Given** an orderuser session, **when** `POST /api/products/:id/properties
{name: "Size"}` is called, **then** status is `403` and no property is created.

**AC37** — **Given** an orderuser session, **when** `POST /api/orders {customerName:
"Ada", items: [...]}` is called, **then** status is `201` and the order is saved.

**AC38** — **Given** an orderuser session, **when** `GET /api/orders` is called,
**then** status is `403` and the body is `{error: "Access denied: admin only"}`.

**AC39** — **Given** an orderuser session and an existing order `o1`, **when** `GET
/api/orders/o1` is called, **then** status is `403` and no order data is returned.

**AC40** — **Given** an orderuser session and an existing order `o1`, **when** `PUT
/api/orders/o1 {customerName: "Grace"}` is called, **then** status is `403` and the
order is unchanged.

**AC41** — **Given** an orderuser session and an existing order `o1`, **when**
`DELETE /api/orders/o1` is called, **then** status is `403` and the order still
exists.

**AC42** — **Given** an orderuser session, **when** `POST /api/agent/recommend
{dietary_restriction: "vegan", serves: 8}` is called, **then** the request reaches
the cake recommender agent (not `403`).

**AC43** — **Given** an orderuser session, **when** `GET /api/agent/cakes` is
called, **then** the request reaches the cake recommender agent (not `403`).

**AC44** — **Given** an orderuser session, **when** `POST /api/agent/report/weekly`
is called, **then** status is `403` and the body is
`{error: "Access denied: admin only"}`.

### Unauthenticated access

**AC45** — **Given** no session, **when** `GET /api/products` is called, **then**
status is `401` and the body is `{error: "Unauthorized: valid session required"}`.

**AC46** — **Given** no session, **when** `POST /api/orders` is called, **then**
status is `401` and no order is created.

**AC47** — **Given** no session, **when** `POST /api/agent/report/weekly` is called,
**then** status is `401` — not `403`. Authentication is evaluated before role.

**AC48** — **Given** no session, **when** `GET /api/agent/cakes` is called, **then**
status is `401`.

### UI

**AC49** — **Given** no session, **when** `/` is loaded, **then** the login screen is
displayed and the tab bar and all tab content are absent from the rendered page.

**AC50** — **Given** a successful admin login, **when** the page renders, **then**
five tab buttons are present — Products, Order Builder, Order History,
Recommendations, Reports — and Products is the active tab.

**AC51** — **Given** a successful orderuser login, **when** the page renders,
**then** exactly two tab buttons are present — Order Builder and Recommendations —
and Order Builder is the active tab.

**AC52** — **Given** an orderuser is logged in, **when** the DOM is inspected,
**then** no element with `data-tab="products"`, `data-tab="order-history"` or
`data-tab="order-reports"` exists — they are removed, not hidden.

**AC53** — **Given** any user is logged in, **when** the header is viewed, **then**
it reads `Signed in as <username> (<role>)` and a "Log out" button is present.

**AC54** — **Given** a user is logged in, **when** "Log out" is clicked, **then**
`POST /api/auth/logout` is sent and the login screen replaces the app UI.

**AC55** — **Given** a logged-in user whose session has expired, **when** any tab
action triggers an API call, **then** the login screen is shown with "Your session
has expired. Please log in again."

---

## 9. Testing Strategy

Tests use `node --test` (per `npm test`) with a fixture user file loaded via
`AUTH_CONFIG_PATH`, holding `admin` (password `admin123`, role `admin`) and
`orderuser` (password `order123`, role `orderuser`) as salt + hash pairs. The
fixture is generated once by a helper rather than hand-written, so the hashes
cannot drift from the passwords the tests type. The fixture uses `cost: 1024` —
production-strength scrypt at ~100ms per login would add minutes across the suite,
and the parameters are config-driven precisely so this is possible. API tests drive
the Express app directly; UI rows are manual until a browser harness exists.

### Config loading — `src/auth/userStore.js`

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `loadUsers` | happy path | fixture with 2 valid users | `loadUsers(path)` | returns 2 users with roles `admin`, `orderuser` | AC1 |
| `loadUsers` | file missing | no file at path | `loadUsers(path)` | throws `Auth config not found at <path>` | AC2 |
| `loadUsers` | malformed JSON | file contains `{` | `loadUsers(path)` | throws with the parse error and the path | AC2 |
| `loadUsers` | bad role | user with role `superuser` | `loadUsers(path)` | throws `Invalid role "superuser" …` | AC3 |
| `loadUsers` | duplicate username | `admin` listed twice | `loadUsers(path)` | throws `Duplicate username in auth config: admin` | AC4 |
| `loadUsers` | empty list | `"users": []` | `loadUsers(path)` | throws `Auth config contains no users` | AC5 |
| `loadUsers` | non-hex salt | user with `"salt": "not-hex!!"` | `loadUsers(path)` | throws `Invalid salt for user "admin": must be hex` | AC59 |
| `loadUsers` | short hash | 64-char `passwordHash`, `keyLength` 64 | `loadUsers(path)` | throws `… expected 128 hex characters, got 64` | AC60 |
| `loadUsers` | missing salt | user with hash but no `salt` | `loadUsers(path)` | throws `Missing salt for user "admin"` | AC61 |
| `loadUsers` | leftover plaintext field | user with `password` alongside the hash | `loadUsers(path)` | throws `… has a plaintext "password" field …` | AC62 |
| `loadUsers` | unsupported algorithm | `"algorithm": "md5"` | `loadUsers(path)` | throws `Unsupported hash algorithm "md5" …` | AC63 |
| `loadUsers` | default hash params | no `hash` block | `loadUsers(path)` | `{algorithm: "scrypt", keyLength: 64, cost: 16384, blockSize: 8, parallelization: 1}` | AC64 |
| `loadUsers` | default TTL | no `sessionTtlHours` key | `loadUsers(path)` | `sessionTtlHours === 8` | AC19 |
| `loadUsers` | env override | `AUTH_CONFIG_PATH` set to fixture | server boot | fixture users loaded, `config/users.json` untouched | AC6 |
| `authenticate` | correct credentials | loaded fixture | `authenticate("admin", "admin123")` | returns `{username: "admin", role: "admin"}` | AC56 |
| `authenticate` | case-insensitive username | loaded fixture | `authenticate("ADMIN", "admin123")` | returns the `admin` user | AC9 |
| `authenticate` | case-sensitive password | loaded fixture | `authenticate("admin", "ADMIN123")` | returns `null` | AC10 |
| `authenticate` | near-miss password | loaded fixture | `authenticate("admin", "admin124")` | returns `null` | AC57 |
| `authenticate` | wrong password | loaded fixture | `authenticate("admin", "wrong")` | returns `null` | AC10 |
| `authenticate` | unknown username | loaded fixture | `authenticate("nobody", "x")` | returns `null` | AC11 |
| `authenticate` | unknown user still hashes | spy on `hashPassword` | `authenticate("nobody", "x")` | `hashPassword` was called once — no early return | §3.3 |

### Password hashing — `src/auth/password.js` and `scripts/hash-password.js`

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `generateSalt` | shape | — | `generateSalt()` | 32-character lowercase hex string | AC65 |
| `generateSalt` | uniqueness | — | two calls | the two salts differ | AC58 |
| `hashPassword` | deterministic | salt `s`, params `p` | `hashPassword("admin123", s, p)` twice | both calls return the same 128-char hex string | AC56 |
| `hashPassword` | salt changes the hash | password `admin123`, two different salts | `hashPassword` with each | the two hashes differ | AC58 |
| `hashPassword` | keyLength honoured | `keyLength: 32` | `hashPassword(...)` | 64-character hex string | AC60 |
| `hashPassword` | non-blocking | — | 4 concurrent calls | all resolve; the async `scrypt` is used, not `scryptSync` | §3.3 |
| `verifyPassword` | match | user built from `admin123` | `verifyPassword("admin123", user, p)` | `true` | AC56 |
| `verifyPassword` | mismatch | user built from `admin123` | `verifyPassword("admin124", user, p)` | `false` | AC57 |
| `verifyPassword` | length-mismatched hash | user whose stored hash is truncated | `verifyPassword("admin123", user, p)` | `false`, and `timingSafeEqual` does not throw on unequal buffer lengths | AC60 |
| hash tool | happy path | username `admin`, password `admin123` entered twice | run the script | prints JSON with 32-char hex `salt`, 128-char hex `passwordHash`; `config/users.json` unchanged | AC65 |
| hash tool | confirmation mismatch | `admin123` then `admin124` | run the script | prints `Passwords do not match`, exit code 1, nothing else printed | AC66 |
| hash tool | too short | password `short` | run the script | prints `Password must be at least 8 characters`, exit code 1 | AC67 |
| hash tool | password not an argument | — | inspect the script | the password is read from the TTY; no `process.argv` entry holds it | §3.2 |

### Sessions — `src/auth/sessions.js`

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `createSession` | issues token | admin user object | `createSession(user)` | returns a 64-char hex token; `getSession(token)` yields `{username, role}` | AC7 |
| `createSession` | tokens are unique | two logins | two `createSession` calls | the two tokens differ | AC7 |
| `getSession` | within TTL | session created at T, TTL 8h | `getSession` at T+7h59m | returns the session | AC19 |
| `getSession` | past TTL | session created at T, TTL 8h | `getSession` at T+8h01m | returns `null` and drops the entry | AC20 |
| `getSession` | unknown token | empty store | `getSession("deadbeef")` | returns `null` | AC21 |
| `destroySession` | removes session | valid token | `destroySession(token)` then `getSession(token)` | returns `null` | AC17 |
| `destroySession` | unknown token | empty store | `destroySession("deadbeef")` | does not throw | AC18 |

### Auth routes — `src/routes/auth.js`

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `POST /api/auth/login` | admin happy path | fixture loaded | `{username: "admin", password: "admin123"}` | `200`, `{username: "admin", role: "admin"}`, `Set-Cookie` has `HttpOnly`, `SameSite=Strict`, `Path=/` | AC7 |
| `POST /api/auth/login` | orderuser happy path | fixture loaded | `{username: "orderuser", password: "order123"}` | `200`, `{username: "orderuser", role: "orderuser"}` | AC8 |
| `POST /api/auth/login` | uppercase username | fixture loaded | `{username: "ADMIN", password: "admin123"}` | `200`, `{username: "admin", role: "admin"}` | AC9 |
| `POST /api/auth/login` | wrong password | fixture loaded | `{username: "admin", password: "wrong"}` | `401`, `{error: "Invalid username or password"}`, no `Set-Cookie` | AC10 |
| `POST /api/auth/login` | unknown user | fixture loaded | `{username: "nobody", password: "x"}` | `401`, body identical to the wrong-password case | AC11 |
| `POST /api/auth/login` | missing username | fixture loaded | `{password: "admin123"}` | `400`, `{error: "Username is required"}` | AC12 |
| `POST /api/auth/login` | blank username | fixture loaded | `{username: "   ", password: "admin123"}` | `400`, `{error: "Username is required"}` | AC12 |
| `POST /api/auth/login` | missing password | fixture loaded | `{username: "admin"}` | `400`, `{error: "Password is required"}` | AC13 |
| `POST /api/auth/login` | no `Secure` on HTTP | `HTTPS` unset | successful login | `Set-Cookie` has no `Secure` attribute | §3.5 |
| `POST /api/auth/login` | `Secure` under HTTPS | `HTTPS=true` | successful login | `Set-Cookie` includes `Secure` | §3.5 |
| `POST /api/auth/login` | password never logged | log spy attached | failed and successful login | no log line contains `admin123` | §3.3 |
| `POST /api/auth/logout` | valid session | logged in | `POST /api/auth/logout` | `200`, `{ok: true}`, `Max-Age=0`, old token now `401` | AC17 |
| `POST /api/auth/logout` | no session | no cookie | `POST /api/auth/logout` | `200`, `{ok: true}` | AC18 |
| `GET /api/auth/me` | valid admin session | logged in as admin | `GET /api/auth/me` | `200`, `{username: "admin", role: "admin"}` | AC22 |
| `GET /api/auth/me` | valid orderuser session | logged in as orderuser | `GET /api/auth/me` | `200`, `{username: "orderuser", role: "orderuser"}` | AC8 |
| `GET /api/auth/me` | no cookie | not logged in | `GET /api/auth/me` | `401`, `{error: "Unauthorized: valid session required"}` | AC23 |
| `GET /api/auth/me` | expired session | session past TTL | `GET /api/auth/me` | `401`, cookie cleared | AC20 |
| `GET /api/auth/me` | forged token | `cake_session=deadbeef` | `GET /api/auth/me` | `401` | AC21 |

### Middleware — `src/middleware/auth.js`

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `requireAuth` | valid session | admin cookie | protected handler called | `next()` runs; `req.user` is `{username, role}` | AC24 |
| `requireAuth` | no cookie | no session | protected handler called | `401`, handler not reached | AC45 |
| `requireAuth` | malformed cookie header | `Cookie: garbage` | protected handler called | `401`, no throw | AC21 |
| `requireAdmin` | admin | admin session | admin handler called | `next()` runs | AC25 |
| `requireAdmin` | orderuser | orderuser session | admin handler called | `403`, `{error: "Access denied: admin only"}` | AC33 |
| `requireAdmin` | unauthenticated | no session | admin handler called | `401`, not `403` | AC47 |

### Products and properties

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `GET /api/products` | admin | admin session | request | `200`, list | AC24 |
| `GET /api/products` | orderuser | orderuser session | request | `200`, list | AC30 |
| `GET /api/products` | unauthenticated | no session | request | `401` | AC45 |
| `POST /api/products` | admin | admin session | `{name: "Carrot Cake"}` | `201`, created | AC25 |
| `POST /api/products` | orderuser | orderuser session | `{name: "Carrot Cake"}` | `403`; product count unchanged | AC33 |
| `POST /api/products` | unauthenticated | no session | `{name: "Carrot Cake"}` | `401`; product count unchanged | AC45 |
| `PUT /api/products/:id` | orderuser | orderuser session, product `p1` | `{name: "Renamed"}` | `403`; `p1.name` unchanged | AC34 |
| `DELETE /api/products/:id` | orderuser | orderuser session, product `p1` | request | `403`; `p1` still present | AC35 |
| `DELETE /api/products/:id` | admin | admin session, unreferenced product | request | `200`; deleted | AC25 |
| `GET /api/products/:id/properties` | orderuser | orderuser session | request | `200`, properties listed | AC31 |
| `POST /api/products/:id/properties` | orderuser | orderuser session | `{name: "Size"}` | `403`; no property created | AC36 |
| `GET /api/properties/:id/values` | orderuser | orderuser session | request | `200`, values listed | AC32 |
| `POST /api/properties/:id/values` | orderuser | orderuser session | `{value: "large"}` | `403`; no value created | AC36 |
| `PUT /api/propertyValues/:id` | orderuser | orderuser session | `{value: "x"}` | `403`; value unchanged | AC36 |
| `DELETE /api/properties/:id` | orderuser | orderuser session | request | `403`; property still present | AC36 |

### Orders

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `POST /api/orders` | orderuser | orderuser session | `{customerName: "Ada", items: [...]}` | `201`; order persisted | AC37 |
| `POST /api/orders` | admin | admin session | `{customerName: "Ada", items: [...]}` | `201`; order persisted | AC29 |
| `POST /api/orders` | unauthenticated | no session | `{customerName: "Ada", items: [...]}` | `401`; order count unchanged | AC46 |
| `GET /api/orders` | admin | admin session, 3 orders | request | `200`; all 3 returned | AC26 |
| `GET /api/orders` | orderuser | orderuser session | request | `403`, `{error: "Access denied: admin only"}` | AC38 |
| `GET /api/orders/:id` | orderuser | orderuser session, order `o1` | request | `403`; no order fields in body | AC39 |
| `GET /api/orders/:id` | admin | admin session, order `o1` | request | `200`; details returned | AC26 |
| `PUT /api/orders/:id` | orderuser | orderuser session, order `o1` | `{customerName: "Grace"}` | `403`; `o1.customerName` unchanged | AC40 |
| `DELETE /api/orders/:id` | orderuser | orderuser session, order `o1` | request | `403`; `o1` still present | AC41 |
| `DELETE /api/orders/:orderId/items/:itemId` | orderuser | orderuser session | request | `403`; item still present | AC41 |

### Agent endpoints

The two agent services are stubbed so these rows test the guard, not the agent.

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| `POST /api/agent/recommend` | orderuser | orderuser session, stub agent | `{dietary_restriction: "vegan", serves: 8}` | not `403`; stub received the call | AC42 |
| `POST /api/agent/recommend` | admin | admin session, stub agent | same body | not `403`; stub received the call | AC28 |
| `POST /api/agent/recommend` | unauthenticated | no session | same body | `401`; stub received nothing | AC48 |
| `GET /api/agent/cakes` | orderuser | orderuser session, stub agent | request | not `403`; stub received the call | AC43 |
| `GET /api/agent/cakes` | unauthenticated | no session | request | `401` | AC48 |
| `POST /api/agent/report/weekly` | admin | admin session, stub agent | `{reference_date: "2026-09-21"}` | not `403`; stub received the call | AC27 |
| `POST /api/agent/report/weekly` | orderuser | orderuser session, stub agent | same body | `403`, `{error: "Access denied: admin only"}`; stub received nothing | AC44 |
| `POST /api/agent/report/weekly` | unauthenticated | no session | same body | `401`, not `403` | AC47 |
| `GET /api/agent/health` | orderuser | orderuser session | request | not `403` | AC43 |
| `GET /api/agent/health` | unauthenticated | no session | request | `401` | AC48 |

### UI (manual until a browser harness exists)

| Function | Case | Given | When | Then | AC |
|---|---|---|---|---|---|
| Page bootstrap | unauthenticated | no session | load `/` | login screen shown; no tab bar, no tab content in the DOM | AC49 |
| Page bootstrap | admin | logged in as admin | load `/` | 5 tabs present; Products active | AC50 |
| Page bootstrap | orderuser | logged in as orderuser | load `/` | exactly 2 tabs — Order Builder, Recommendations; Order Builder active | AC51 |
| Tab removal | orderuser | logged in as orderuser | inspect the DOM | no `data-tab="products"`, `="order-history"` or `="order-reports"` element exists | AC52 |
| Header | any role | logged in | view header | `Signed in as <username> (<role>)` and a "Log out" button | AC53 |
| Header | unauthenticated | login screen | view header | no username, no "Log out" button | AC49 |
| Login form | blank username | login screen | click "Log in" with username empty | "Username is required"; no network request | AC14 |
| Login form | blank password | login screen | click "Log in" with password empty | "Password is required"; no network request | AC15 |
| Login form | rejected credentials | login screen | submit wrong password | "Invalid username or password"; password cleared and focused; username retained | AC16 |
| Login form | Enter key | login screen | press Enter in the password field | the form submits | §5.1 |
| Log out | click | logged in | click "Log out" | `POST /api/auth/logout` sent; login screen replaces the app UI | AC54 |
| Expired session | mid-use `401` | session expired while the page is open | trigger any tab action | login screen with "Your session has expired. Please log in again." | AC55 |
| Server restart | session lost | logged in, server restarted | trigger any tab action | same expiry message; login works again after re-entering credentials | §3.5 |

---

## 10. Spec Readiness Checklist

- [x] **Every AC has a precise expected value** — each AC names the HTTP status, the
      exact response body, the cookie attributes or the exact DOM/message state. No
      AC says "works correctly".
- [x] **Another person could write a test from each AC without asking** — fixture
      credentials (`admin`/`admin123`, `orderuser`/`order123`), endpoint paths and
      error strings are given literally.
- [x] **Every AC can fail** — each asserts behaviour that does not exist today; on
      the current codebase every one of AC7–AC55 fails, since there is no login and
      no guard on any route, and AC56–AC67 fail for want of a password module.
- [x] **Error and edge cases have ACs of their own** — bad config (AC2–AC5),
      malformed salts and hashes (AC59–AC63), bad credentials (AC10–AC13), expired
      and forged tokens (AC20, AC21), `401` before `403` ordering (AC47), idempotent
      logout (AC18), case-insensitive username (AC9), session loss mid-use (AC55),
      hash-tool misuse (AC66, AC67).
- [x] **Files to modify are listed with what changes in each** — §6.1 and §6.2.
- [x] **Risk: what could break, and how to roll back** — §7, including the plaintext
      password limit and the rollback path.
- [x] **Every AC appears in the testing strategy table** — the AC column in §9 maps
      every row back; AC1–AC67 each appear at least once.

---

## 11. Open Question for the Reviewer

**Should an `orderuser` be able to see the orders they entered?** As specified they
cannot — Order History is admin-only, so a saved order disappears from their view.
That follows the requirement as given ("Order user has access only to Order Builder
and Recommendations"), and it is coherent if order takers work from paper and the
owner reviews everything. If it is wrong, the fix is a `createdBy` column on
`orders` plus a filtered Order History for `orderuser`, which is a larger change
than this document covers.
