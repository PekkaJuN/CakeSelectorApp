# Architecture: Order Editing

## Project Structure

```
src/
├── server.js                  (Unchanged) Routes already registered
├── db/
│   ├── schema.sql            (Unchanged) Tables exist
│   └── db.js                 (Updated) Add order update/delete item functions
├── routes/
│   └── orders.js             (Updated) Add PUT /api/orders/:id, DELETE /api/orders/:id/items/:id
└── public/
    ├── index.html            (Updated) Add order edit modal
    ├── app.js                (Updated) Add order editing logic
    └── styles.css            (Updated) Style edit modal

(No new packages needed; reuse express, sqlite3, uuid)
```

## File Ownership & Justification

| File | Responsibility | Why |
|------|-----------------|-----|
| `src/db/db.js` | (Updated) Add `updateOrder()`, `removeOrderItem()` | Centralizes order updates; atomic database changes |
| `src/routes/orders.js` | (Updated) Add PUT /api/orders/:id, DELETE /api/orders/:id/items/:id | API for order editing, item removal |
| `src/public/index.html` | (Updated) Add order edit modal | UI for viewing and editing orders |
| `src/public/app.js` | (Updated) Add order editing flow | Client-side edit logic: fetch order, show modal, handle updates |
| `src/public/styles.css` | (Updated) Style modal and forms | Visual presentation |

## What Will NOT Be Built (v1)

- ❌ Order history listing (separate Order History feature)
- ❌ Order deletion from edit modal (separate Order History feature)
- ❌ Order versioning / audit trail
- ❌ Rollback of edits
- ❌ Edit history
- ❌ Concurrent edit conflict UI (last-write-wins silently)

## Data Flow: Order Editing

1. **User opens Order History** → sees list of orders (deferred feature)
2. **User clicks order** → calls GET `/api/orders/:id` → opens edit modal
3. **User edits customer name** → form state in memory
4. **User adds items** → same flow as Order Creation (validate, add to local array)
5. **User removes items** → delete from local array
6. **User clicks "Save Changes"** → PUT `/api/orders/:id` {customerName, items} → backend validates → updates database (order customer name + item list) → returns updated order
7. **Backend ensures** → createdAt unchanged, updatedAt updated to current time

## Database Changes

**No schema changes needed.**

**Existing tables:**
- **orders** (id, customerName, createdAt, updatedAt) — updatedAt already exists
- **orderItems** (id, orderId FK, productId FK, selections JSON, createdAt)

**New queries:**
- `updateOrder(orderId, customerName)` → update customer name only
- `removeOrderItem(itemId)` → delete one item by id
- `deleteAllOrderItems(orderId)` → delete all items for order (for bulk replace)

## API Endpoints (Order Editing Only)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/orders/:id` | Retrieve order for editing (already exists from Order Creation) |
| PUT | `/api/orders/:id` | Update customer name and/or items (new) |
| DELETE | `/api/orders/:id/items/:itemId` | Remove single item (new, optional; PUT handles via item list) |

## UI Flow: Order Edit Modal

1. **Modal shows** — customer name (editable), creation date (read-only), items list
2. **Edit name** — text field, can be changed
3. **Add item** — same product/property selectors as Order Builder
4. **Remove item** — "Remove" button per item, prevents removing last item
5. **Save Changes** — PUT /api/orders/:id {customerName, items}
6. **Cancel** — close modal without saving

## Error Handling

- Empty customer name → "Customer name is required" (400)
- Whitespace-only name → "Customer name is required" (400)
- Removing last item → "Order must contain at least one item" (400)
- Adding item with incomplete properties → "All properties must be selected for [product]" (400)
- Order not found → 404 response
- Concurrent edit conflict → Last write wins (no optimistic locking)

## Timestamp Behavior

- **createdAt:** Immutable; never changes after order creation
- **updatedAt:** Updated server-side to current time on PUT /api/orders/:id
- **Verification:** Both timestamps stored and returned in response

## No-Op: What's Out of Scope

- Multi-step undo/redo
- Order deletion (handled by Order History feature)
- Order listing (handled by Order History feature)
- Conflict resolution UI (last-write-wins is acceptable for v1)
- Edit permissions / role-based access
