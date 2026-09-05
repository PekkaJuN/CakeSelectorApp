# Tasks: Order Editing

Smallest sensible step at a time, in order. Each task closes one or more ACs.

## Phase 1: Database & Backend Setup

### Task 1.1: Extend db.js with order edit functions
**Closes:** None (foundation)
- [ ] Add `updateOrder(id, customerName)` → update orders table, set updatedAt to current time
- [ ] Add `removeOrderItem(itemId)` → delete from orderItems by id
- [ ] Add `deleteAllOrderItems(orderId)` → delete all items for order (bulk operation)
- [ ] Verify functions work with test data

### Task 1.2: Implement PUT /api/orders/:id endpoint
**Closes:** AC2, AC5, AC9, AC11, AC13, AC16
- [ ] Implement PUT `/api/orders/:id` route
  - Accept {customerName, items} payload
  - Validate customerName (not empty, not whitespace)
  - Fetch existing order (ensure exists, return 404 if not)
  - If customerName provided: update it in database
  - If items provided: validate all items, delete old items, insert new items
  - Always update updatedAt to current time server-side
  - Preserve createdAt unchanged
  - Return updated order with all fields
- [ ] Test AC2: Edit customer name → 200, name updated, timestamps correct
- [ ] Test AC5: Add item to order → 200, new item in database
- [ ] Test AC9: Save changes (name + item) → 200, both updated
- [ ] Test AC11: createdAt preserved → verify via response
- [ ] Test AC13: New item snapshot → verify in database
- [ ] Test AC16: Multiple items saved together → 200, all items persisted

### Task 1.3: Validate order edit errors
**Closes:** AC3, AC4, AC6, AC8
- [ ] Test AC3: Empty customer name → 400, "Customer name is required", order unchanged
- [ ] Test AC4: Whitespace customer name → 400, "Customer name is required"
- [ ] Test AC6: Item with incomplete properties → 400, "All properties must be selected for [product]"
- [ ] Test AC8: Remove last item → 400, "Order must contain at least one item", item remains

### Task 1.4: Preserve order identity and timestamps
**Closes:** AC11, AC12, AC17
- [ ] Test AC11: Edit order → createdAt unchanged, updatedAt newer
- [ ] Test AC12: Product snapshot preserved → edited order still shows original product name
- [ ] Test AC17: Edit order never edited before → createdAt ≈ old updatedAt, new updatedAt = current

### Task 1.5: Special character and complex scenarios
**Closes:** AC14, AC18, AC20
- [ ] Test AC14: Save customer name with special chars → "Jean-Luc O'Brien & Co." preserved exactly
- [ ] Test AC18: Concurrent edits (manual or mock) → both PUT succeed, last write wins
- [ ] Test AC20: Remove and re-add item → same product/selections, new item id

### Task 1.6: Order retrieval for editing
**Closes:** AC1
- [ ] Ensure GET `/api/orders/:id` works correctly (already implemented)
- [ ] Test AC1: Retrieve order → status 200, all fields present, items array populated
- [ ] Test order not found → 404, "Order not found"

## Phase 2: Frontend Setup

### Task 2.1: Order edit modal HTML
**Closes:** None (foundation)
- [ ] Add order edit modal to index.html
  - Customer name input (editable)
  - Creation date display (read-only)
  - Items list container
  - Product/property selectors for adding items
  - "Add Item" button
  - Per-item "Remove" button
  - "Save Changes" and "Cancel" buttons
  - Error message container
- [ ] Verify modal markup loads without errors

### Task 2.2: Fetch and display order
**Closes:** AC1, AC15 (UI test)
- [ ] Implement modal open handler
  - Fetch GET `/api/orders/:id` when modal opens
  - Populate customer name field
  - Display creation date (read-only)
  - Render items list with all selections
  - Test AC1: Modal shows order details
  - Test AC15: Both items display with full selections

### Task 2.3: Edit customer name
**Closes:** AC2 (UI test)
- [ ] Allow editing customer name field in modal
- [ ] On "Save Changes": send updated name to API
- [ ] Verify response updates database
- [ ] Refresh modal/Order History with new name
- [ ] Test AC2: Name updated in list after save

### Task 2.4: Add item to order
**Closes:** AC5, AC6 (UI tests)
- [ ] Implement "Add Item" within edit modal (similar to Order Creation flow)
  - Product selector populated from GET /api/products
  - Property selectors appear based on product selection
  - Value selectors populated from API
  - Validate all properties selected
  - Add to in-memory cart
  - Refresh item preview
- [ ] Test AC5: Add item to order → appears in items list
- [ ] Test AC6: Add with incomplete properties → error "All properties must be selected"

### Task 2.5: Remove item from order
**Closes:** AC7, AC8 (UI tests)
- [ ] Implement "Remove" button per item
  - Delete from in-memory cart
  - Refresh item list
  - Validate: cannot remove if only 1 item (AC8)
- [ ] Test AC7: Remove item → deleted from order
- [ ] Test AC8: Try to remove last item → error "Order must contain at least one item"

### Task 2.6: Save and cancel
**Closes:** AC9, AC10
- [ ] Implement "Save Changes" button
  - Call PUT `/api/orders/:id` with updated customerName + items
  - On success: close modal, refresh Order History, show confirmation
  - On error: display error message
- [ ] Implement "Cancel" button
  - Close modal without saving
  - Discard any changes made
- [ ] Test AC9: Save changes → 200, modal closes, changes persisted
- [ ] Test AC10: Cancel → modal closes, order unchanged in database

### Task 2.7: Modal interaction flow
**Closes:** AC1 (full UI flow)
- [ ] Open modal via Order History (deferred; placeholder for now)
- [ ] Test full flow: open → edit name → add item → save → close
- [ ] Verify UI responds correctly at each step

## Phase 3: Styling & Polish

### Task 3.1: CSS for order edit modal
**Closes:** None (UI polish)
- [ ] Style modal container (overlay, centered, scrollable)
- [ ] Style form fields (customer name input)
- [ ] Style items list (clear display of selections)
- [ ] Style buttons (Save/Cancel prominence)
- [ ] Style error messages (red, clear visibility)
- [ ] Ensure responsive (mobile-friendly)

### Task 3.2: UX refinements
**Closes:** None (polish)
- [ ] Auto-focus customer name field when modal opens
- [ ] Disable "Save Changes" if no changes made
- [ ] Show item count in modal header
- [ ] Disable "Remove" button for last item (visual feedback)
- [ ] Show success toast/message after save
- [ ] Loading state while saving

---

## Summary

**13 tasks total**
- **Phase 1 (Backend):** 6 tasks, closes API tests for ACs 1-20 (except AC18, AC19 edge cases)
- **Phase 2 (Frontend):** 7 tasks, closes UI flows and interactions
- **Phase 3 (Polish):** 2 tasks, no AC closure

**Blocked:**
- Order History integration (separate Order History feature)
- AC18, AC19 (concurrent/stale data) — manual tests only in v1

**Dependencies:**
- Requires Order Creation (already complete)
- Requires Product Management (already complete)
- Requires database with orders and orderItems
