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
**Closes:** AC8, AC9, AC10
- [ ] Implement `POST /api/products/:id/properties` → validate name, insert, return 201 + property object
- [ ] Implement `DELETE /api/properties/:id` → delete property and all its values, return 200
- [ ] Test AC8: Add property to product → 201, UUID id, appears in GET /api/products
- [ ] Test AC9: Add duplicate property name → 201, unique id, both in database
- [ ] Test AC10: Add property with empty name → 400, "Property name is required"
- [ ] Test AC10: Add property to non-existent product → 404, "Product not found"
- [ ] Test AC11: Delete property → 200, removed from database, other properties remain
- [ ] Test AC11: Delete non-existent property → 404, "Property not found"

### Task 1.6: Property value CRUD API
**Closes:** AC12, AC13, AC14, AC15
- [ ] Implement `POST /api/properties/:id/values` → validate value, insert, return 201 + value object
- [ ] Implement `DELETE /api/propertyValues/:id` → delete value, return 200
- [ ] Test AC12: Add value to property → 201, UUID id, appears in nested structure
- [ ] Test AC13: Add duplicate value text → 201, unique id, both in database
- [ ] Test AC14: Add value with empty text → 400, "Value is required"
- [ ] Test AC14: Add value to non-existent property → 404, "Property not found"
- [ ] Test AC15: Delete property value → 200, removed, others remain
- [ ] Test AC15: Delete non-existent value → 404, "Value not found"

## Phase 2: Frontend Setup

### Task 2.1: HTML structure
**Closes:** AC16 (partial)
- [ ] Create `src/public/index.html` with Products tab
- [ ] Add product list container (empty initially)
- [ ] Add "Add Product" form (name input, button)
- [ ] Add placeholder for expand/property sections
- [ ] Verify page loads, no JS errors

### Task 2.2: Fetch and render products
**Closes:** AC16, AC17 (UI tests)
- [ ] Create `src/public/app.js` with `fetchProducts()` function
- [ ] Implement product list rendering (name, edit/delete buttons, expand toggle)
- [ ] Implement property list rendering (nested, ordered, with delete buttons)
- [ ] Test AC16: Page loads, products displayed with names, buttons, toggles
- [ ] Test AC16: Empty list → no products shown
- [ ] Test AC17: Click expand → properties shown with values

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
- [ ] Add "Add Property" button to each product (inside expand section)
- [ ] Show property form (name input, save button)
- [ ] Call `POST /api/products/:id/properties` on save
- [ ] Refresh product details
- [ ] Display error on failure
- [ ] Test AC8: Add property → appears under product
- [ ] Test AC10: Add empty property → error displays

### Task 2.7: Delete property
**Closes:** AC11 (UI test)
- [ ] Implement delete button per property
- [ ] Call `DELETE /api/properties/:id`
- [ ] Refresh product details
- [ ] Test AC11: Delete property → removed from list, others remain

### Task 2.8: Add/delete property values
**Closes:** AC12, AC13, AC14, AC15 (UI tests)
- [ ] Add "Add Value" button per property
- [ ] Show value form (text input, save button)
- [ ] Call `POST /api/properties/:id/values` on save
- [ ] Display values as list under property
- [ ] Implement delete button per value → `DELETE /api/propertyValues/:id`
- [ ] Test AC12: Add value → appears in list
- [ ] Test AC14: Add empty value → error displays
- [ ] Test AC15: Delete value → removed from list

## Phase 3: Styling & Polish

### Task 3.1: CSS for Products tab
**Closes:** None (UI polish)
- [ ] Style product list (expandable rows, spacing)
- [ ] Style forms (inputs, buttons, error messages in red)
- [ ] Style nested properties/values (indentation, margins)
- [ ] Ensure responsive layout (mobile-friendly)

---

## Summary

**18 tasks total**
- **Phase 1 (Backend):** 6 tasks, closes API tests for all ACs except AC7
- **Phase 2 (Frontend):** 8 tasks, closes UI tests for ACs 1-6, 8-15, 16-17
- **Phase 3 (Polish):** 1 task, no AC closure
- **Deferred:** AC7 (delete with orders) — requires Order feature; add integration test then

**Blocked:**
- AC7 automated test — needs orderItems table and order records; add after Order Creation feature
