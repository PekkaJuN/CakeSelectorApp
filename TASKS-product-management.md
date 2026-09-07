# Tasks: Product Management

Smallest sensible step at a time, in order. Each task closes one or more ACs.

## Phase 1: Database & Backend Setup

### Task 1.1: Initialize SQLite schema
**Closes:** None (foundation)
- [ ] Create `src/db/schema.sql` with products, properties, propertyValues tables
- [ ] Create `src/db/db.js` with connection and query helpers
- [ ] Run `npm run db:init` to create database file
- [ ] Verify tables exist

### Task 1.2: Create product CRUD API
**Closes:** AC1, AC2, AC3
- [ ] Implement `POST /api/products` → validate name, insert, return 201 + product object
- [ ] Implement `GET /api/products` → return all products with properties array (empty for now)
- [ ] Test AC1: Create product with valid name → 201, UUID id, database updated
- [ ] Test AC2: Create product with duplicate name → 201, unique id, both in database
- [ ] Test AC3: Create product with empty name → 400, "Product name is required"
- [ ] Test AC3: Create product with missing name field → 400, "Product name is required"

### Task 1.3: Edit product API
**Closes:** AC4, AC5
- [ ] Implement `PUT /api/products/:id` → validate name, update, return 200 + updated product
- [ ] Test AC4: Edit product name → 200, name updated, id unchanged
- [ ] Test AC4: Product not found → 404, "Product not found"
- [ ] Test AC5: Edit product to empty name → 400, "Product name is required", unchanged
- [ ] Verify updatedAt timestamp updates on save

### Task 1.4: Delete product API (without order check)
**Closes:** AC6
- [ ] Implement `DELETE /api/products/:id` → delete product and all its properties/values, return 200 + {deleted: id}
- [ ] Test AC6: Delete product → 200, removed from database
- [ ] Test AC6: Delete non-existent product → 404, "Product not found"
- [ ] **Note:** AC7 (with order dependency) deferred until Order feature exists

### Task 1.5: Property CRUD API
**Closes:** AC8, AC9, AC10, AC11
- [ ] Implement `POST /api/products/:id/properties` → validate name, insert, return 201 + property object
- [ ] Implement `DELETE /api/properties/:id` → delete property and all its values, return 200
- [ ] Test AC8: Add property to product → 201, UUID id, appears in GET /api/products
- [ ] Test AC9: Add duplicate property name → 201, unique id, both in database
- [ ] Test AC10: Add property with empty name → 400, "Property name is required"
- [ ] Test AC10: Add property to non-existent product → 404, "Product not found"
- [ ] Test AC11: Delete property → 200, removed from database, other properties remain
- [ ] Test AC11: Delete non-existent property → 404, "Property not found"

### Task 1.6: Property value add/delete API
**Closes:** AC12, AC13, AC14, AC15, AC16, AC17, AC18, AC19
- [ ] Implement `POST /api/properties/:id/values` → validate value (not empty, not whitespace only), insert, return 201 + value object
- [ ] Implement `DELETE /api/propertyValues/:id` → delete value, return 200
- [ ] Test AC12: Add value to property → 201, UUID id, appears in nested structure
- [ ] Test AC13: Add duplicate value text → 201, unique id, both in database
- [ ] Test AC14: Add value with empty text → 400, "Value is required"
- [ ] Test AC15: Add value with whitespace only → 400, "Value is required"
- [ ] Test AC16: Add value to non-existent property → 404, "Property not found"
- [ ] Test AC17: Add value to property with multiple existing values → appended to list
- [ ] Test AC18: Add value with special characters "dark & bitter" → stored and retrieved correctly
- [ ] Test AC19: Add value with leading/trailing whitespace "  light  " → whitespace preserved
- [ ] Test AC25: Delete property value → 200, removed, others remain
- [ ] Test AC25: Delete non-existent value → 404, "Value not found"

### Task 1.7: Property value retrieval and listing API
**Closes:** AC20, AC21
- [ ] Implement `GET /api/properties/:id/values` → return all values for property, ordered by createdAt
- [ ] Test AC20: List values for property → 200, all values in creation order
- [ ] Test AC21: List values when property has none → 200, returns []
- [ ] Test retrieval: Ensure values appear in GET /api/products nested response

### Task 1.8: Property value edit API
**Closes:** AC22, AC23, AC24
- [ ] Add `updatePropertyValue(id, value)` to db.js → UPDATE propertyValues SET value WHERE id
- [ ] Implement `PUT /api/propertyValues/:id` route
  - Validate value (not empty, not whitespace only)
  - Fetch value (return 404 if not found)
  - Update value text in database
  - Return updated value object
- [ ] Test AC22: Edit value → 200, text updated, id unchanged
- [ ] Test AC23: Edit to duplicate text → 200, duplicate allowed
- [ ] Test AC24: Edit to empty text → 400, "Value is required", unchanged

## Phase 2: Frontend Setup

### Task 2.1: HTML structure
**Closes:** AC26 (partial)
- [ ] Create `src/public/index.html` with Products tab
- [ ] Add product list container (empty initially)
- [ ] Add "Add Product" form (name input, button)
- [ ] Add placeholder for expand/property sections
- [ ] Verify page loads, no JS errors

### Task 2.2: Fetch and render products
**Closes:** AC26, AC27 (UI tests)
- [ ] Create `src/public/app.js` with `fetchProducts()` function
- [ ] Implement product list rendering (name, edit/delete buttons, expand toggle)
- [ ] Implement property list rendering (nested, ordered, with delete buttons)
- [ ] Test AC26: Page loads, products displayed with names, buttons, toggles
- [ ] Test AC26: Empty list → no products shown
- [ ] Test AC27: Click expand → properties shown with values

### Task 2.3: Add product form
**Closes:** AC1, AC2, AC3 (UI tests)
- [ ] Implement form submission handler for "Add Product"
- [ ] Call `POST /api/products`, validate response
- [ ] Refresh product list on success
- [ ] Display error message on failure (400/404)
- [ ] Clear form after success
- [ ] Test AC1: Add valid product → appears in list, form clears
- [ ] Test AC3: Add with empty name → error message displays, list unchanged

### Task 2.4: Edit product form
**Closes:** AC4, AC5 (UI tests)
- [x] Implement "Edit" button handler → show edit modal/form
- [x] Call `PUT /api/products/:id` on save
- [x] Refresh list on success
- [x] Display error on failure
- [x] Test AC4: Edit product name → list updates, form closes
- [ ] Test AC5: Edit to empty name → error displays, product unchanged

### Task 2.5: Delete product confirmation
**Closes:** AC6 (UI test)
- [x] Implement "Delete" button → confirmation modal
- [x] Call `DELETE /api/products/:id` on confirm
- [x] Refresh list on success
- [x] Display error if delete fails
- [x] Test AC6: Delete product → confirmation modal, removed from list

### Task 2.6: Add property form
**Closes:** AC8, AC9, AC10 (UI tests)
- [x] Add "Add Property" button to each product (inside expand section)
- [x] Show property form (name input, save button)
- [x] Call `POST /api/products/:id/properties` on save
- [x] Refresh product details
- [x] Display error on failure
- [x] Test AC8: Add property → appears under product
- [x] Test AC10: Add empty property → error displays

### Task 2.7: Delete property
**Closes:** AC11 (UI test)
- [x] Implement delete button per property
- [x] Call `DELETE /api/properties/:id`
- [x] Refresh product details
- [x] Test AC11: Delete property → removed from list, others remain

### Task 2.8: Add/delete property values
**Closes:** AC12, AC13, AC14, AC15, AC18, AC19 (UI tests)
- [x] Add "Add Value" button per property
- [x] Show value form (text input, save button)
- [x] Call `POST /api/properties/:id/values` on save
- [x] Display values as list under property
- [x] Implement delete button per value → `DELETE /api/propertyValues/:id`
- [x] Test AC12: Add value → appears in list
- [x] Test AC14: Add empty value → error displays
- [x] Test AC15: Add whitespace-only value → error displays
- [x] Test AC18: Add value with special characters → displays correctly
- [x] Test AC19: Add value with whitespace → spaces preserved in display
- [x] Test AC25: Delete value → removed from list

### Task 2.9: Edit property value form
**Closes:** AC22, AC23, AC24 (UI tests)
- [ ] Add edit button per value in property list
- [ ] Add edit modal to index.html (reuse or extend Product Management modal)
  - Value text input (editable)
  - "Save" and "Cancel" buttons
  - Error message container
- [ ] On edit button click: open modal with current value text
- [ ] User edits text, clicks "Save" → call `PUT /api/propertyValues/:id`
- [ ] On success: close modal, refresh value list
- [ ] On error: show error message "Value is required" and keep modal open
- [ ] Test AC22: Edit value → list updates immediately
- [ ] Test AC23: Edit to duplicate text → allowed, no error
- [ ] Test AC24: Edit to empty text → error displays, value unchanged

### Task 2.10: Property value list display
**Closes:** AC20, AC21 (UI tests)
- [ ] Ensure all values display under each property
- [ ] Order values by creation date
- [ ] Handle empty state: show "Add Value" form when property has no values
- [ ] Test AC20: Multiple values display in order with edit/delete buttons
- [ ] Test AC21: Empty property shows only "Add Value" form

## Phase 3: Styling & Polish

### Task 3.1: CSS for Products tab
**Closes:** None (UI polish)
- [x] Style product list (expandable rows, spacing)
- [x] Style forms (inputs, buttons, error messages in red)
- [x] Style nested properties/values (indentation, margins)
- [x] Ensure responsive layout (mobile-friendly)

### Task 3.2: CSS for value edit modal
**Closes:** None (polish)
- [ ] Style edit modal (align with other modals)
- [ ] Style value list (clear display with edit/delete buttons side-by-side)
- [ ] Responsive layout for edit controls
- [ ] Consistent error message styling

### Task 3.3: UX refinements
**Closes:** None (polish)
- [ ] Auto-focus value input when add/edit modal opens
- [ ] Show success toast after value edit
- [ ] Disable "Save" button if no changes made in edit modal
- [ ] Keyboard support: Escape to cancel, Enter to submit

---

## Summary

**25 tasks total**
- **Phase 1 (Backend):** 8 tasks, closes API tests for all ACs except AC7
- **Phase 2 (Frontend):** 9 tasks, closes UI tests for ACs 1-6, 8-15, 18-29
- **Phase 3 (Polish):** 3 tasks, no AC closure
- **Deferred:** AC7 (delete with orders), AC16 (add to non-existent property in full flow), AC28-29 (order builder integration) — requires Order feature or scope refinement; add integration tests then

**Completed tasks (from prior work):** 2.4, 2.5, 2.6, 2.7, 2.8, 3.1

**Blocked:**
- AC7 automated test — needs orderItems table and order records; add after Order Creation feature
- AC28 (order builder dropdown) — requires Order Creation feature to show value selection UI
- AC29 (order snapshot) — requires Order Creation feature to store and verify snapshots
