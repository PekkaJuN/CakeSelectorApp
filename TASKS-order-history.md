# Tasks: Order History

## Phase 1: Backend

### Task 1.1: Database functions
- [ ] Add `getAllOrders()` → SELECT all orders, ordered by createdAt DESC
- [ ] Add `deleteOrder(id)` → DELETE order + cascade items

### Task 1.2: API endpoints
- [ ] Implement GET `/api/orders` → return all orders with itemCount
- [ ] Implement DELETE `/api/orders/:id` → delete order, return {deleted: id}
- [ ] Test: list all, empty list, delete, not found

## Phase 2: Frontend

### Task 2.1: Order History tab UI
- [ ] Add Order History tab to index.html
- [ ] List container (table or div rows)
- [ ] Add details modal (view-only, buttons for edit/delete)
- [ ] Add delete confirmation modal
- [ ] Add error message container

### Task 2.2: Fetch and display
- [ ] Fetch GET `/api/orders` on tab load
- [ ] Render list: customer name, date, item count
- [ ] Implement click to open details modal
- [ ] Display all items with selections

### Task 2.3: Edit and delete
- [ ] "Edit" button → open order edit modal (from Order Editing)
- [ ] "Delete" button → confirmation → DELETE /api/orders/:id
- [ ] On success: refresh list
- [ ] On error: show error message

### Task 2.4: Refresh on changes
- [ ] Auto-refresh list after order created (from Order Creation)
- [ ] Auto-refresh after order edited (from Order Editing)
- [ ] Auto-refresh after order deleted

## Phase 3: Polish
- [ ] CSS for list and modals
- [ ] Date formatting (human-readable)
- [ ] Responsive layout
- [ ] Empty state message

---

**7 tasks total** | No blockers | Depends on: Product Management, Order Creation, Order Editing
