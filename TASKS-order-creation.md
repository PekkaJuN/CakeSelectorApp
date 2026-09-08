# Tasks: Order Creation

Smallest sensible step at a time, in order. Each task closes one or more ACs.

## Phase 1: Database & Backend Setup

### Task 1.1: Extend db.js with order functions
**Closes:** None (foundation)
- [x] Add `createOrder(id, customerName)` → insert into orders table
- [x] Add `createOrderItem(id, orderId, productId, selections)` → insert into orderItems table
- [x] Add `getOrder(id)` → retrieve order by id (with items)
- [x] Add `getOrdersForCustomer(customerName)` → (future; not needed for v1)
- [x] Verify functions work with test data

### Task 1.2: Create order API endpoint
**Closes:** AC1, AC2, AC3, AC8
- [x] Implement `POST /api/orders` route
  - Validate customerName (not empty, not whitespace)
  - Validate items array (not empty)
  - For each item: validate productId, validate selections complete for product
  - Insert order and items to database
  - Return 201 + full order object
- [x] Test AC1: Create order with single item → 201, order with uuid, timestamp
- [x] Test AC2: Multiple items same product, different selections → both in database
- [x] Test AC3: Multiple items different products → 201, both in database
- [x] Test AC8: Full order save → createdAt timestamp set

### Task 1.3: Validate order creation errors
**Closes:** AC9, AC10, AC11
- [x] Test AC9: Empty customer name → 400, "Customer name is required"
- [x] Test AC9: Whitespace customer name → 400, "Customer name is required"
- [x] Test AC9: Missing customerName field → 400, "Customer name is required"
- [x] Test AC10: Empty items array → 400, "Order must contain at least one item"
- [x] Test AC10: Missing items field → 400, "Order must contain at least one item"
- [x] Test AC11: Whitespace-only name → 400, "Customer name is required"

### Task 1.4: Validate item property selections
**Closes:** AC4, AC5, AC19
- [x] Test AC4: Item with incomplete properties → 400, "All properties must be selected for [product]"
- [x] Test AC4: Item missing property from required set → 400 error
- [x] Test AC5: Item without productId → 400, "Product id is required for each item"
- [x] Test AC5: Missing productId field → 400 error
- [x] Test AC19: Item with incomplete selections on edit → 400, "All properties must be selected"

### Task 1.5: Product catalog API (read-only)
**Closes:** AC14, AC15, AC16
- [x] Ensure GET `/api/products` returns all products with properties and values (already implemented)
- [x] Ensure GET `/api/products/:id/properties` returns properties for product (already implemented)
- [x] Ensure GET `/api/properties/:id/values` returns values for property (already implemented)
- [x] Test AC14: GET /api/products → exactly configured products in response
- [x] Test AC15: GET /api/products/:id → only that product's properties
- [x] Test AC16: GET /api/properties/:id/values → all values for property

### Task 1.6: Special character handling
**Closes:** AC20
- [x] Test AC20: Save order with customer name "Jean-Luc O'Brien & Co." → name preserved in database
- [x] Verify special chars not escaped/truncated

### Task 1.7: Timestamp verification
**Closes:** AC18
- [x] Test AC18: POST order → createdAt timestamp within 1 second of current time
- [x] Verify ISO 8601 format
- [x] Verify timestamp stored correctly in database

### Task 1.8: Order retrieval
**Closes:** AC13, AC12 (partial)
- [x] Implement `GET /api/orders/:id` route
- [x] Return full order with all items and selections
- [x] Test AC13: GET /api/orders/:id → response includes all property selections
- [x] Test AC12: Create order, verify product snapshot stored with item

## Phase 2: Frontend Setup

### Task 2.1: Order Builder tab HTML
**Closes:** None (foundation)
- [x] Add "Order Builder" tab to index.html (next to Products tab)
- [x] Add customer name input field
- [x] Add product selector (dropdown)
- [x] Add property selector area (will be dynamic)
- [x] Add "Add Item" button
- [x] Add cart preview area (list of items)
- [x] Add "Clear Cart" button
- [x] Add "Save Order" button
- [x] Add error message container
- [x] Verify HTML loads, tab switches

### Task 2.1b: Order Builder JavaScript (implemented with Task 2.1)
**Closes:** None (foundation + basic cart management)
- [x] Implement updateCartDisplay() function for cart rendering
- [x] Implement removeCartItem(index) function
- [x] Implement editCartItem(index) function with modal
- [x] Implement closeEditItemModal() function
- [x] Implement save item changes handler
- [x] Implement Clear Cart button handler with confirmation
- [x] Add Edit Item modal to HTML
- [x] Enable/disable buttons based on cart state

### Task 2.2: Fetch dropdown data
**Closes:** AC14, AC15, AC16 (UI tests)
- [x] On Order Builder tab load: fetch `/api/products`
- [x] Populate product dropdown
- [x] When product selected: fetch `/api/products/:id/properties`
- [x] Dynamically create property dropdowns
- [x] When property selected: fetch `/api/properties/:id/values`
- [x] Populate value dropdowns
- [x] Test AC14: Page loads, product dropdown shows all products
- [x] Test AC15: Select product, property dropdowns appear
- [x] Test AC16: Select property, value dropdown shows all values

### Task 2.3: Add item to cart
**Closes:** AC1, AC4, AC5 (UI tests)
- [ ] Implement "Add Item" button handler
- [ ] Validate: product selected (AC5)
- [ ] Validate: all properties selected (AC4)
- [ ] If valid: add item to in-memory cart array
- [ ] Refresh cart preview
- [ ] Clear form/dropdowns
- [ ] Test AC1: Add valid item → appears in cart
- [ ] Test AC4: Add with incomplete properties → error "All properties must be selected"
- [ ] Test AC5: Add without product → error "Product is required"

### Task 2.4: Cart management
**Closes:** AC6, AC7, AC17
- [ ] Implement "Edit" button per item → open edit modal with current selections
- [ ] Allow changing property selections in modal
- [ ] Validate: all properties still required (AC19)
- [ ] Save edited item → update cart array
- [ ] Implement "Remove" button per item → delete from cart
- [ ] Implement "Clear Cart" button → empty cart, clear customer name
- [ ] Test AC6: Remove item → cart updates, count decreases
- [ ] Test AC7: Edit item selections → updates in cart
- [ ] Test AC17: Clear cart → all items removed, form clears

### Task 2.5: Save order
**Closes:** AC8, AC9, AC10, AC11, AC18, AC20 (UI tests)
- [ ] Implement "Save Order" button handler
- [ ] Validate customer name (not empty, not whitespace)
- [ ] Validate cart not empty
- [ ] Call `POST /api/orders` with customerName + items
- [ ] On success: show confirmation (order id, timestamp), clear form
- [ ] On error: display error message from server
- [ ] Test AC8: Save valid order → saved successfully, form clears
- [ ] Test AC9: Save without customer name → error "Customer name is required"
- [ ] Test AC10: Save empty cart → error "Order must contain at least one item"
- [ ] Test AC20: Save with special characters in name → name preserved

### Task 2.6: Cart preview styling
**Closes:** AC13 (UI test)
- [ ] Display each item clearly: "Product Name - Property1: value1, Property2: value2"
- [ ] Show all selected properties for each item
- [ ] Add edit/remove buttons per item
- [ ] Test AC13: Cart shows all property selections for each item

## Phase 3: Styling & Polish

### Task 3.1: CSS for Order Builder tab
**Closes:** None (UI polish)
- [ ] Style customer name input
- [ ] Style product/property/value dropdowns
- [ ] Style "Add Item" button
- [ ] Style cart preview (items list, edit/remove buttons)
- [ ] Style error messages (red, clear visibility)
- [ ] Style modal for editing items
- [ ] Ensure responsive layout (mobile-friendly)
- [ ] Test AC2: Multiple items displayed clearly
- [ ] Test AC6/AC7: Buttons functional and visible

### Task 3.2: UX refinements
**Closes:** None (polish)
- [ ] Auto-focus customer name input on tab load
- [ ] Disable "Save Order" button if cart empty
- [ ] Show item count in cart preview
- [ ] Confirm before "Clear Cart"
- [ ] Show success toast/message after save
- [ ] Smooth transitions between steps

---

## Summary

**16 tasks total**
- **Phase 1 (Backend):** 8 tasks, closes API tests for ACs 1-20 (except AC12 scenario)
- **Phase 2 (Frontend):** 6 tasks, closes UI tests and flows for ACs 1-20
- **Phase 3 (Polish):** 2 tasks, no AC closure

**Blocked:**
- AC12 (product snapshot) — Requires product to be edited after order; verify via manual inspection or defer full test to Order Editing feature

**Dependencies:**
- Requires Product Management (already complete)
- Requires product catalog in database (created by Product Management feature)
