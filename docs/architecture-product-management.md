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
| `src/db/db.js` | SQLite connection, query helper functions (create, read, update, delete); includes `updatePropertyValue()` | Centralizes DB logic; reusable queries across routes |
| `src/routes/products.js` | HTTP routes for products, properties, values | API endpoints for feature; input validation at boundary |
| `src/public/index.html` | Products tab HTML structure, forms (add/edit/delete products, properties, values) | UI markup; tab navigation; edit modals |
| `src/public/app.js` | Frontend JS: fetch, form handlers, error display, list refresh; includes value editing logic | Client-side logic; no framework, vanilla JS |
| `src/public/styles.css` | CSS for Products tab, forms, lists, errors, edit modals | Visual presentation |
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

### Products
1. **User adds product** → `app.js` (form) → POST `/api/products` → `routes/products.js` (validate) → `db/db.js` (insert) → SQLite → response to client
2. **User views products** → page load → `app.js` → GET `/api/products` → `db/db.js` (query) → SQLite → render list in HTML
3. **User edits product** → `app.js` (form) → PUT `/api/products/:id` → `routes/products.js` (validate) → `db/db.js` (update) → SQLite → refresh UI
4. **User deletes product** → `app.js` → DELETE `/api/products/:id` → `routes/products.js` (check no orders) → `db/db.js` (delete) → SQLite → remove from list

### Properties
5. **User adds property** → `app.js` (modal) → POST `/api/products/:id/properties` → `routes/products.js` (validate) → `db/db.js` (insert) → SQLite → refresh product details
6. **User deletes property** → `app.js` (confirmation) → DELETE `/api/properties/:id` → `routes/products.js` → `db/db.js` (cascade delete values) → SQLite → remove from UI

### Property Values
7. **User adds value** → `app.js` (modal) → POST `/api/properties/:id/values` → `routes/products.js` (validate) → `db/db.js` (insert) → SQLite → append to values list
8. **User edits value** → `app.js` (edit modal, form) → PUT `/api/propertyValues/:id` → `routes/products.js` (validate) → `db/db.js` (update) → SQLite → refresh values list
9. **User deletes value** → `app.js` (confirmation) → DELETE `/api/propertyValues/:id` → `routes/products.js` → `db/db.js` (delete) → SQLite → remove from UI

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
| GET | `/api/properties/:id/values` | List all values for a property |
| POST | `/api/properties/:id/values` | Add value to property |
| PUT | `/api/propertyValues/:id` | Edit property value text |
| DELETE | `/api/propertyValues/:id` | Delete property value |

## UI Flow: Property Value Editing

1. **Product expanded** → property shown with values list (in-place display)
2. **Per-value row** → shows value text + "Edit" button + "Delete" button
3. **Click "Edit" on value** → edit modal/form opens with current value text pre-filled
4. **User changes text and clicks "Save"** → calls PUT `/api/propertyValues/:id` {value: "new text"}
5. **On success (200)** → modal closes, products list reloaded, values list updates immediately with new text
6. **On error (400/404)** → error message displays in modal ("Value is required", "Value not found", etc.); modal remains open for correction

## Error Handling & Validation

| Scenario | HTTP Status | Error Message | Action |
|----------|---|---|---|
| Empty value text | 400 | "Value is required" | Form validation prevents save; user retries |
| Whitespace-only value | 400 | "Value is required" | Form validation prevents save; user retries |
| Value not found (404) | 404 | "Value not found" | Modal closes; product list reloaded (handles race condition) |
| Property not found (add) | 404 | "Property not found" | Modal closes; product list reloaded |
| Duplicate value text | 201/200 | None (allowed) | Duplicate created; no error (design choice for flexibility) |
| Special characters (edit) | 200 | None | Preserved and stored as-is (e.g., "dark & bitter", "  light  ") |

## No-Op: What's Out of Scope

- Pricing, inventory, images for products
- Order integration (only products, no order dependency checking in this file—that's handled in Orders feature)
- Undo/redo, history, timestamps for edits (only createdAt)
- Rich text, markdown in product/property names (plain text strings only)
