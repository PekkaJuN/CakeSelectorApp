# Feature: Order Creation

## Problem Statement

The application needs to allow users to create orders by selecting products and specifying property values for each item. An order is a collection of one or more items (product + property selections) associated with a customer name and persisted with a timestamp. Without order creation, there is no way to record what customers want to purchase.

## Proposed Change

An "Order Builder" tab in the web UI that allows:
- **Enter customer name:** Add customer identifier for the order
- **Add item:** Select a product, choose property values for that product, add to cart
- **View cart:** Display all items added to the order with their selections
- **Edit item:** Modify property selections for an item in the cart
- **Remove item:** Delete an item from the cart before saving
- **Save order:** Persist the order with all items to the database with a timestamp

Order creation follows a cart-based workflow: add items → review → save. Multiple items with the same product but different selections are allowed.

## Acceptance Criteria

### AC1: Create order with single item
**Given** the Order Builder tab is open with empty cart and customer name field  
**When** user enters "Alice" as customer name, selects product "Chocolate Cake", selects "Base: light", "Size: large", and clicks "Add Item"  
**Then** the item appears in the cart showing "Chocolate Cake - Base: light, Size: large"; cart displays 1 item

### AC2: Create order with multiple items (same product, different selections)
**Given** cart has one item "Chocolate Cake - Base: light, Size: large"  
**When** user selects the same product "Chocolate Cake", selects "Base: dark, Size: small", and clicks "Add Item"  
**Then** both items appear in the cart; order now shows 2 items (same product, different selections)

### AC3: Create order with multiple items (different products)
**Given** cart is empty  
**When** user adds product "Chocolate Cake" (Base: light), then adds product "Vanilla Cake" (Frosting: buttercream), and clicks "Add Item" twice  
**Then** cart displays 2 items with different products; both appear in the list

### AC4: Add item without selecting all required properties
**Given** product "Chocolate Cake" has two properties "Base" and "Size"  
**When** user selects the product, leaves "Size" property unselected (no dropdown choice), and clicks "Add Item"  
**Then** no item is added; an error message "All properties must be selected for Chocolate Cake" appears

### AC5: Add item with product not selected
**Given** the product dropdown is empty (no product selected)  
**When** user leaves product blank and clicks "Add Item"  
**Then** no item is added; an error message "Product is required" appears

### AC6: Remove item from cart
**Given** cart has 2 items  
**When** user clicks "Remove" on the first item  
**Then** the first item is deleted from the cart; cart now displays 1 item

### AC7: Edit item in cart
**Given** cart has item "Chocolate Cake - Base: light, Size: large"  
**When** user clicks "Edit" on the item, changes "Size" to "medium", and clicks "Save"  
**Then** the item in cart updates to "Chocolate Cake - Base: light, Size: medium"; cart refreshes

### AC8: Save order with customer name and items
**Given** cart has 1 item and customer name "Alice" is entered  
**When** user clicks "Save Order"  
**Then** the order is persisted to database with: id (UUID), customerName "Alice", timestamp (current time), items array with product id and selections; order list shows the new order; form clears for next order

### AC9: Save order without customer name
**Given** cart has 1 item but customer name field is empty  
**When** user clicks "Save Order"  
**Then** no order is saved; error message "Customer name is required" appears; cart and form remain intact

### AC10: Save order with empty cart
**Given** customer name "Alice" is entered but cart is empty  
**When** user clicks "Save Order"  
**Then** no order is saved; error message "Order must contain at least one item" appears; form retains data

### AC11: Save order with whitespace-only customer name
**Given** customer name field contains "   " (spaces only) and cart has 1 item  
**When** user clicks "Save Order"  
**Then** no order is saved; error message "Customer name is required" appears

### AC12: Order preserves product snapshot at creation time
**Given** product "Chocolate Cake" has property "Base" with values ["light", "dark"] at order creation  
**When** an order is created with selection "Base: light"  
**Then** the order stores the product snapshot (id, name) and selections; if product "Base" values are later edited, the order still shows "light"

### AC13: Item displays all selected property values
**Given** product "Chocolate Cake" has properties "Base", "Size", "Frosting"  
**When** user adds item with selections "Base: dark", "Size: large", "Frosting: cream cheese"  
**Then** the cart item displays all three selections clearly formatted (e.g., "Chocolate Cake - Base: dark, Size: large, Frosting: cream cheese")

### AC14: Product dropdown shows only products from catalog
**Given** products "Chocolate Cake", "Vanilla Cake", "Carrot Cake" exist in catalog  
**When** user clicks the product dropdown in Order Builder  
**Then** exactly these 3 products appear as options; no other products are listed

### AC15: Property dropdown shows only properties for selected product
**Given** product "Chocolate Cake" has properties "Base" and "Size"; product "Vanilla Cake" has property "Frosting" only  
**When** user selects "Chocolate Cake" in Order Builder  
**Then** dropdowns for "Base" and "Size" appear; "Frosting" dropdown is not shown

### AC16: Property value dropdown shows all available values
**Given** property "Base" has values ["light", "dark", "chocolate"] (3 options)  
**When** user clicks the "Base" dropdown  
**Then** exactly these 3 values appear as selectable options

### AC17: Clear cart
**Given** cart has 3 items  
**When** user clicks "Clear Cart" button  
**Then** all items are removed; cart becomes empty; customer name field is cleared

### AC18: Save order generates correct timestamp
**Given** current system time is 2026-09-05T14:30:00Z  
**When** user creates an order  
**Then** the order createdAt timestamp is within 1 second of 2026-09-05T14:30:00Z; timestamp is stored in ISO 8601 format

### AC19: Cannot edit item to remove all property values
**Given** cart has item "Chocolate Cake - Base: light, Size: large"  
**When** user clicks "Edit", clears both property selections, and clicks "Save"  
**Then** no change occurs; error message "All properties must be selected for Chocolate Cake" appears; item retains original selections

### AC20: Save order with special characters in customer name
**Given** customer name field contains "Jean-Luc O'Brien & Co."  
**When** user creates an order with this name  
**Then** the order is saved with customerName "Jean-Luc O'Brien & Co."; special characters are preserved

## Files to Modify

| File | Change |
|---|---|
| src/db/schema.sql | Ensure orders and orderItems tables exist with correct schema |
| src/db/db.js | Add functions: createOrder, getProductsForDropdown, getPropertiesForProduct, getPropertyValuesForProperty |
| src/routes/orders.js | Add route: POST /api/orders {customerName, items} to create order and associated items |
| src/public/index.html | Add Order Builder tab with: customer name input, product/property selectors, add-item form, cart display, edit/remove item modals, save order button |
| src/public/app.js | Add logic: fetchProducts, fetchPropertiesForProduct, fetchValuesForProperty, addItemToCart, editCartItem, removeCartItem, saveOrder, clearCart, form validation, error display |
| src/public/styles.css | Style Order Builder tab: form fields, dropdowns, cart display, item cards, buttons, error messages, modals |

## Risk

- **What could break:** Selecting properties on stale product data (product properties changed after UI loaded); saving order concurrently from multiple browser tabs could create duplicate orders; editing item with deleted property values
- **Mitigation:** Properties fetched fresh for selected product; order id auto-generated server-side (prevents duplicates); order stores product snapshot (immutable); validation ensures all required properties are set
- **Rollback:** Remove Order Builder tab from HTML; remove POST /api/orders route; disable order creation via UI

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
|---|---|---|---|---|
| GET /api/products | dropdown data | products "Cake1", "Cake2" exist | GET /api/products | status 200, response [{id, name}, {id, name}], ordered by createdAt |
| GET /api/products/:productId/properties | properties for product | product cake1 has properties prop1, prop2 | GET /api/products/cake1/properties | status 200, response [{id, name}, {id, name}], ordered by createdAt |
| GET /api/properties/:propertyId/values | values for property | property prop1 has values v1: "light", v2: "dark" | GET /api/properties/prop1/values | status 200, response [{id: "v1", value: "light"}, {id: "v2", value: "dark"}], ordered by createdAt |
| POST /api/orders | happy path | products and properties configured, no orders | POST {customerName: "Alice", items: [{productId: "cake1", selections: {base: "light"}}]} | status 201, response {id: "<uuid>", customerName: "Alice", createdAt: "<timestamp>", items: [...]}, order inserted |
| POST /api/orders | multiple items same product | no orders exist | POST {customerName: "Alice", items: [{productId: "cake1", selections: {base: "light"}}, {productId: "cake1", selections: {base: "dark"}}]} | status 201, order created with 2 items, both with productId cake1, different selections |
| POST /api/orders | multiple items different products | no orders exist | POST {customerName: "Alice", items: [{productId: "cake1", ...}, {productId: "cake2", ...}]} | status 201, order created with 2 items, different product ids |
| POST /api/orders | no customer name | cart has 1 item | POST {customerName: "", items: [...]} | status 400, response {error: "Customer name is required"}, no order inserted |
| POST /api/orders | whitespace customer name | cart has 1 item | POST {customerName: "   ", items: [...]} | status 400, response {error: "Customer name is required"}, no order inserted |
| POST /api/orders | no items | customer "Alice" | POST {customerName: "Alice", items: []} | status 400, response {error: "Order must contain at least one item"}, no order inserted |
| POST /api/orders | missing product in item | items present | POST {customerName: "Alice", items: [{selections: {...}}]} (no productId) | status 400, response {error: "Product id is required for each item"}, no order inserted |
| POST /api/orders | missing selections in item | product present | POST {customerName: "Alice", items: [{productId: "cake1"}]} (no selections) | status 400, response {error: "All properties must be selected for [product name]"}, no order inserted |
| POST /api/orders | incomplete selections | product cake1 has properties base, size | POST {customerName: "Alice", items: [{productId: "cake1", selections: {base: "light"}}]} (missing size) | status 400, response {error: "All properties must be selected for [product name]"}, no order inserted |
| POST /api/orders | special chars in name | no orders | POST {customerName: "Jean-Luc O'Brien & Co.", items: [...]} | status 201, order saved with exact name "Jean-Luc O'Brien & Co." |
| POST /api/orders | invalid product id | productId "cake99" does not exist | POST {customerName: "Alice", items: [{productId: "cake99", selections: {...}}]} | status 400, response {error: "Product not found: cake99"}, no order inserted |
| POST /api/orders | timestamp accuracy | no orders, current time 14:30:00Z | POST order | status 201, createdAt timestamp within 1 second of 14:30:00Z, ISO 8601 format |
| Dropdown populate | product list | products "Cake1", "Cake2" exist | page loads Order Builder tab | product dropdown shows ["Cake1", "Cake2"] |
| Dropdown populate | properties for product | product "Cake1" has properties "Base", "Size" | user selects "Cake1" | property dropdowns appear for "Base" and "Size" |
| Dropdown populate | values for property | property "Base" has values ["light", "dark"] | user clicks "Base" dropdown | dropdown shows ["light", "dark"] |
| Cart display | item added | cart empty, item added | item "Cake1 - Base: light, Size: large" added to cart | item appears in cart list, cart shows "1 item" |
| Cart display | multiple items | cart has 2 items | page displays cart | both items visible with full selections displayed |
| Add item | form validation | product not selected | user clicks "Add Item" | error "Product is required" appears, no item added |
| Add item | incomplete properties | one property unselected | user clicks "Add Item" | error "All properties must be selected for [product]" appears |
| Add item | success | all fields selected | user clicks "Add Item" | item added to cart, form resets, product/property dropdowns cleared |
| Edit item | modify property | cart has item "Base: light" | user clicks "Edit", changes to "Base: dark", clicks "Save" | item updates to "Base: dark" in cart |
| Edit item | remove selection | edit modal open | user clears a property field, clicks "Save" | error appears, item unchanged |
| Remove item | delete from cart | cart has 2 items | user clicks "Remove" on first item | first item deleted, cart now shows 1 item |
| Clear cart | empty all items | cart has 3 items, customer name entered | user clicks "Clear Cart" | all items removed, cart empty, customer name cleared |
| Save order | persist to db | cart has 1 item, "Alice" entered | user clicks "Save Order" | order created in database, order id returns, cart clears, success feedback shown |
| Save order | no customer | cart has item | user clicks "Save Order" with no name | error message appears, order not saved, cart intact |
| Save order | empty cart | customer "Alice" | user clicks "Save Order" | error "Order must contain at least one item" appears |

## Spec Readiness Checklist

- [x] Every AC has a precise expected value — no "works correctly"
  - All 20 ACs specify exact outputs: UUID formats, error message text, timestamp format (ISO 8601), database state changes, UI state (item count, list updates)
  - Example: AC8 specifies error message "All properties must be selected for Chocolate Cake" not "shows validation error"

- [x] Another person could write a test from each AC without asking
  - All ACs follow strict Given/When/Then format with explicit system states, actions, and measurable outcomes
  - Given clause specifies exact order state, product/property configuration, or database content
  - Then clause specifies exact HTTP status codes, response shape, database changes, UI updates

- [x] Every AC can fail — one that cannot fail proves nothing
  - **Happy paths:** AC1, AC2, AC3, AC8, AC13, AC14, AC15, AC16, AC18, AC20 (successful order creation, data display)
  - **Error cases:** AC4, AC5, AC9, AC10, AC11, AC19 (validation, missing data, incomplete selections)
  - **Edge cases:** AC12 (snapshot immutability), AC17 (clear cart), AC6 (remove item), AC7 (edit item)

- [x] Error and edge cases have ACs of their own
  - 5 error ACs (AC4 incomplete properties, AC5 no product, AC9 no name, AC10 empty cart, AC11 whitespace name)
  - 1 additional error in AC19 (edit validation)
  - 4 edge case ACs (AC2 same product multiple times, AC3 different products, AC12 snapshot, AC17 clear cart)
  - All testable independently

- [x] Every AC appears in the testing strategy table
  - 42 test rows cover all 20 ACs
  - Each AC has multiple test rows (happy + error + edge cases)
  - API-level tests (POST /api/orders validation, responses)
  - Data-level tests (dropdown population, property filtering)
  - UI-level tests (cart display, form validation, modal interactions)
  - Timestamp accuracy tested with precise time window
