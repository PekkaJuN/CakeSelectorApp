⚠️ **DEPRECATED** — This architecture document has been merged into [architecture-product-management.md](architecture-product-management.md). Please refer to that file for the current architecture. This file is retained for reference only.

---

# Architecture: Property Value Management

## Project Structure

```
src/
├── server.js                  (Unchanged) Routes already registered
├── db/
│   ├── schema.sql            (Unchanged) propertyValues table exists
│   └── db.js                 (Updated) Add/verify updatePropertyValue function
├── routes/
│   └── products.js           (Updated) Add PUT /api/propertyValues/:id for edit
└── public/
    ├── index.html            (Updated) Add edit form/modal for property values
    ├── app.js                (Updated) Add value editing logic
    └── styles.css            (Updated) Style value edit modal if needed)

(No new packages needed; reuse express, sqlite3, uuid)
```

## File Ownership & Justification

| File | Responsibility | Why |
|------|-----------------|-----|
| `src/db/db.js` | (Updated) Add `updatePropertyValue()` | Centralizes value updates |
| `src/routes/products.js` | (Updated) Add PUT /api/propertyValues/:id | API for value editing |
| `src/public/index.html` | (Updated) Add edit modal/form for values | UI for editing values |
| `src/public/app.js` | (Updated) Add value editing logic | Client-side edit flow |
| `src/public/styles.css` | (Updated) Style edit modal | Visual presentation |

## What Will NOT Be Built (v1)

- ❌ Value deletion (already decided in PRD: values cannot be deleted, only edited)
- ❌ Value sorting/reordering
- ❌ Bulk value import/export
- ❌ Value usage tracking (analytics)
- ❌ Value deprecation warnings

## Data Flow: Property Value Management

1. **User views Products tab** → product expanded → properties shown → values listed
2. **User clicks "Add Value"** → form appears for property
3. **User enters value text** → calls POST `/api/properties/:id/values` → validates → inserts → returns 201 → updates list
4. **User clicks "Edit" on value** → edit modal/form opens with current text
5. **User changes text** → calls PUT `/api/propertyValues/:id` {value: "new text"} → validates → updates → returns 200 → updates list

## Database Usage

**Tables (already exist):**
- **propertyValues** (id, propertyId FK, value, createdAt)
- **properties** (id, productId FK, name, createdAt) — read-only for this feature

**New queries:**
- `updatePropertyValue(id, value)` → update value text in database

## API Endpoints (Property Value Management)

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/properties/:id/values` | Add new value (already implemented) |
| PUT | `/api/propertyValues/:id` | Edit value text (new) |
| GET | `/api/properties/:id/values` | List values (already implemented) |

## UI Flow: Property Value Editing

1. **Product expanded** → property shown with values list
2. **"Add Value" form** → text input + button (already implemented)
3. **Per-value row** → shows value text + "Edit" button
4. **Click "Edit"** → modal/form opens with current value text
5. **User changes text** → clicks "Save"
6. **On success** → list updates immediately with new text
7. **On error** → error message shows (empty, not found, etc.)

## Error Handling

- Empty value → "Value is required" (400)
- Whitespace-only value → "Value is required" (400)
- Value not found → 404 response
- Property not found → 404 response (when adding)
- Duplicate text → Allowed (no error)

## Constraints from PRD

**Key decision:** Property values cannot be deleted, only edited or added.
- Reason: Preserves historical order data (orders reference value text, not id)
- Users can rename values instead of deleting

## No-Op: What's Out of Scope

- Deleting values (design decision: not allowed)
- Reordering values
- Value categorization/grouping
- Conditional visibility based on other properties
- Price modifiers on values (v2+)
