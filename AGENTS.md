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
