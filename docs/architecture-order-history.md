# Architecture: Order History

## Project Structure

```
src/
├── db/db.js                  (Updated) Add getAllOrders function
├── routes/orders.js          (Updated) Add GET /api/orders (list all)
└── public/
    ├── index.html            (Updated) Add Order History tab with list & delete modal
    ├── app.js                (Updated) Add order history logic: fetch list, open details, delete
    └── styles.css            (Updated) Style order list, modals)

(No new packages needed)
```

## File Ownership & Justification

| File | Responsibility | Why |
|------|-----------------|-----|
| `src/db/db.js` | (Updated) Add `getAllOrders()` | Fetch all orders for list view |
| `src/routes/orders.js` | (Updated) Add GET /api/orders, DELETE /api/orders/:id | List orders, delete orders |
| `src/public/index.html` | (Updated) Add Order History tab | UI for viewing/managing orders |
| `src/public/app.js` | (Updated) Add order history logic | Fetch list, open details, delete |
| `src/public/styles.css` | (Updated) Style list & modals | Visual presentation |

## API Endpoints (Order History)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/orders` | List all orders (new) |
| GET | `/api/orders/:id` | View order details (already exists) |
| PUT | `/api/orders/:id` | Edit order (already exists) |
| DELETE | `/api/orders/:id` | Delete order (new) |

## UI Flow

1. **Order History tab** → calls GET /api/orders → renders list (customer name, date, item count)
2. **Click order** → opens details modal (view only in this tab)
3. **Click "Edit"** → opens order edit modal (from Order Editing feature)
4. **Click "Delete"** → confirmation modal → DELETE /api/orders/:id
5. **List refreshes** after create/edit/delete

## Data Display

- Orders listed by creation date (newest first)
- Each row: customer name, formatted date, item count
- Click to view full details with all item selections
- Edit, delete buttons per order

## No-Op: What's Out of Scope

- ❌ Order search/filter (v2+)
- ❌ Order pagination (v1 assumes small data)
- ❌ Order sorting options
- ❌ Bulk operations
- ❌ Export/print orders
- ❌ Order status/workflow
