# Tasks: Order History

## Phase 1: Backend

### Task 1.1: Database functions
- [x] Add `getAllOrders()` → SELECT all orders, ordered by createdAt DESC
- [x] Add `deleteOrder(id)` → DELETE order + cascade items

### Task 1.2: API endpoints
- [x] Implement GET `/api/orders` → return all orders with itemCount
- [x] Implement DELETE `/api/orders/:id` → delete order, return {deleted: id}
- [x] Test: list all, empty list, delete, not found

## Phase 2: Frontend

### Task 2.1: Order History tab UI
- [x] Add Order History tab to index.html
- [x] List container (table or div rows)
- [x] Add details modal (view-only, buttons for edit/delete)
- [x] Add delete confirmation modal
- [x] Add error message container

### Task 2.2: Fetch and display
- [x] Fetch GET `/api/orders` on tab load
- [x] Render list: customer name, date, item count
- [x] Implement click to open details modal
- [x] Display all items with selections (formatted: ProductName - PropName: value)

### Task 2.3: Edit and delete
- [x] "Edit" button → open order edit modal (from Order Editing)
- [x] "Delete" button → confirmation → DELETE /api/orders/:id
- [x] On success: refresh list
- [x] On error: show error message

### Task 2.4: Refresh on changes
- [x] Auto-refresh list after order created (from Order Creation)
- [x] Auto-refresh after order edited (from Order Editing)
- [x] Auto-refresh after order deleted

## Phase 3: Polish
- [x] CSS for list and modals
- [x] Date formatting (human-readable)
- [x] Responsive layout
- [x] Empty state message

---

**7 tasks total** | No blockers | Depends on: Product Management, Order Creation, Order Editing
