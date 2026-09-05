# Architecture: Product Management

## Project Structure

```
src/
├── server.js                  Entry point; Express app initialization, middleware
├── db/
│   ├── schema.sql            SQLite schema: products, properties, propertyValues tables
│   └── db.js                 Database connection, query functions for CRUD
├── routes/
│   └── products.js           Express routes for product/property/value CRUD
└── public/
    ├── index.html            Products tab UI, add/edit/delete forms
    ├── app.js                Frontend logic: fetch, form validation, error display
    └── styles.css            Styling for Products tab, forms, lists

package.json                  Dependencies: express, sqlite3, uuid
.env                          (if needed) Database path, port config
```

## File Ownership & Justification

| File | Responsibility | Why |
|------|-----------------|-----|
| `src/server.js` | Express server setup, middleware, listen on 3000 | Core runtime; all routes registered here |
| `src/db/schema.sql` | Database schema (products, properties, propertyValues) | Single source of truth for data structure |
| `src/db/db.js` | SQLite connection, query helper functions (create, read, update, delete) | Centralizes DB logic; reusable queries across routes |
| `src/routes/products.js` | HTTP routes for products, properties, values | API endpoints for feature; input validation at boundary |
| `src/public/index.html` | Products tab HTML structure, forms | UI markup; tab navigation |
| `src/public/app.js` | Frontend JS: fetch, form handlers, error display, list refresh | Client-side logic; no framework, vanilla JS |
| `src/public/styles.css` | CSS for Products tab, forms, lists, errors | Visual presentation |
| `package.json` | npm dependencies | Build/runtime config; minimal: express, sqlite3, uuid |

## What Will NOT Be Built (v1)

- ❌ User authentication / authorization
- ❌ Multi-user sessions
- ❌ Product versioning / audit trail
- ❌ Batch import/export
- ❌ Product categorization / hierarchies
- ❌ Search / advanced filtering
- ❌ Caching layer (SQLite is fast enough locally)

## Data Flow

1. **User adds product** → `app.js` (form) → POST `/api/products` → `routes/products.js` (validate) → `db/db.js` (insert) → SQLite → response to client
2. **User views products** → page load → `app.js` → GET `/api/products` → `db/db.js` (query) → SQLite → render list in HTML
3. **User edits product** → `app.js` (form) → PUT `/api/products/:id` → `routes/products.js` (validate) → `db/db.js` (update) → SQLite → refresh UI
4. **User deletes product** → `app.js` → DELETE `/api/products/:id` → `routes/products.js` (check no orders) → `db/db.js` (delete) → SQLite → remove from list

## Database Schema

**products** (id, name, createdAt)  
**properties** (id, productId FK, name, createdAt)  
**propertyValues** (id, propertyId FK, value, createdAt)

All IDs are UUIDs; foreign keys enforced at schema level.

## API Endpoints

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/products` | List all products with properties and values |
| POST | `/api/products` | Create new product |
| PUT | `/api/products/:id` | Edit product name |
| DELETE | `/api/products/:id` | Delete product (if no orders reference it) |
| POST | `/api/products/:id/properties` | Add property to product |
| DELETE | `/api/properties/:id` | Delete property and all values |
| POST | `/api/properties/:id/values` | Add value to property |
| DELETE | `/api/propertyValues/:id` | Delete property value |

## No-Op: What's Out of Scope

- Pricing, inventory, images for products
- Order integration (only products, no order dependency checking in this file—that's handled in Orders feature)
- Undo/redo, history, timestamps for edits (only createdAt)
- Rich text, markdown in product/property names (plain text strings only)
