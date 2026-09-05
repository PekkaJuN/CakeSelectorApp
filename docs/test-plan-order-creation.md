# Test Plan: Order Creation

## AC to Test Mapping

| AC | Test Name | Type | Input | Expected Output | Checkable |
|----|-----------|----|-------|-----------------|-----------|
| AC1: Create order with single item | POST /api/orders - happy path | API | {customerName: "Alice", items: [{productId: "cake1", selections: {base: "light", size: "large"}}]} | status 201, {id: UUID, customerName: "Alice", createdAt: timestamp, items: [...]} | ✅ |
| AC1 | POST /api/orders (UI) - create order form | UI | Enter "Alice", select product, select properties, click "Add Item", click "Save Order" | Order created, list refreshes, confirmation shows | [?] UI flow |
| AC2: Create order with multiple items (same product, different selections) | POST /api/orders - multiple items same product | API | {customerName: "Alice", items: [{productId: "cake1", selections: {base: "light", ...}}, {productId: "cake1", selections: {base: "dark", ...}}]} | status 201, order with 2 items, both with cake1, different selections | ✅ |
| AC3: Create order with multiple items (different products) | POST /api/orders - multiple items different products | API | {customerName: "Alice", items: [{productId: "cake1", ...}, {productId: "cake2", ...}]} | status 201, order with 2 items, different product ids | ✅ |
| AC4: Add item without selecting all required properties | POST /api/orders - incomplete properties (UI validation) | UI | Select product, leave "Size" blank, click "Add Item" | Error "All properties must be selected for [product]" displays | [?] UI validation |
| AC4 | POST /api/orders - incomplete properties (API test) | API | {customerName: "Alice", items: [{productId: "cake1", selections: {base: "light"}}]} (missing size) | status 400, {error: "All properties must be selected for [product]"} | ✅ |
| AC5: Add item with product not selected | POST /api/orders - no product selected (UI validation) | UI | Leave product blank, click "Add Item" | Error "Product is required" displays | [?] UI validation |
| AC5 | POST /api/orders - product field missing | API | {customerName: "Alice", items: [{selections: {...}}]} (no productId) | status 400, {error: "Product id is required for each item"} | ✅ |
| AC6: Remove item from cart | Remove item from cart (UI) | UI | Cart has 2 items, click "Remove" on first item | First item deleted, cart shows 1 item | [?] UI cart update |
| AC6 | Remove item (state management) | UI Logic | Item in cart, trigger remove | Cart array updated, list re-renders | [?] State update |
| AC7: Edit item in cart | Edit item in cart (UI) | UI | Cart has item "Cake1 - Base: light", click "Edit", change "Size" to "medium", click "Save" | Item updated in cart | [?] UI modal update |
| AC8: Save order with customer name and items | POST /api/orders - happy path (full order) | API | {customerName: "Alice", items: [...]} | status 201, order id, createdAt timestamp, items persisted to database | ✅ |
| AC8 | POST /api/orders (UI) - save order success | UI | Order builder with customer "Alice" and 2 items, click "Save Order" | Order saved, form clears, success feedback shown | [?] UI feedback |
| AC9: Save order without customer name | POST /api/orders - empty customer name | API | {customerName: "", items: [...]} | status 400, {error: "Customer name is required"} | ✅ |
| AC9 | POST /api/orders - whitespace customer name | API | {customerName: "   ", items: [...]} | status 400, {error: "Customer name is required"} | ✅ |
| AC9 | Save order (UI) - no customer name | UI | Leave customer name blank, click "Save Order" | Error "Customer name is required" displays | [?] UI validation |
| AC10: Save order with empty cart | POST /api/orders - empty cart | API | {customerName: "Alice", items: []} | status 400, {error: "Order must contain at least one item"} | ✅ |
| AC10 | Save order (UI) - empty cart | UI | No items in cart, click "Save Order" | Error "Order must contain at least one item" displays | [?] UI validation |
| AC11: Save order with whitespace-only customer name | POST /api/orders - whitespace name | API | {customerName: "   ", items: [...]} | status 400, {error: "Customer name is required"} | ✅ |
| AC12: Order preserves product snapshot at creation time | Order snapshot - product edit after | Scenario | 1) Create order with "Chocolate Cake" base=light; 2) Edit product name to "Dark Chocolate"; 3) Retrieve order | Order shows "Chocolate Cake" (original snapshot) | ✅ (GET /api/orders/:id) |
| AC13: Item displays all selected property values | GET /api/orders/:id - full selections | API | POST order with 3 properties selected; GET order | Response includes all selections in item | ✅ |
| AC14: Product dropdown shows only products from catalog | Dropdown population (UI) | UI | Page loads Order Builder, click product dropdown | Exactly configured products shown | [?] UI rendering |
| AC14 | GET /api/products - for dropdown | API | GET /api/products | status 200, [{id, name, properties: [...]}, ...] | ✅ |
| AC15: Property dropdown shows only properties for selected product | Property dropdown population (UI) | UI | Select "Chocolate Cake" in product dropdown | "Base", "Size" dropdowns appear; "Frosting" not shown | [?] UI dynamic |
| AC15 | GET /api/products/:id/properties - for dropdown | API | GET /api/products/cake1/properties | status 200, [{id, name}, ...] | ✅ |
| AC16: Property value dropdown shows all available values | Value dropdown population (UI) | UI | Click "Base" property dropdown | ["light", "dark", "chocolate"] options shown | [?] UI rendering |
| AC16 | GET /api/properties/:id/values - for dropdown | API | GET /api/properties/prop1/values | status 200, [{id, value}, ...] | ✅ |
| AC17: Clear cart | Clear cart (UI) | UI | Cart has 3 items, click "Clear Cart" button | All items removed, form clears | [?] UI state |
| AC18: Save order generates correct timestamp | POST /api/orders - timestamp accuracy | API | POST order at 14:30:00Z | createdAt within 1 second of 14:30:00Z, ISO 8601 format | ✅ |
| AC19: Cannot edit item to remove all property values | Edit item validation (UI) | UI | Click "Edit" on item, clear all properties, click "Save" | Error displays, item unchanged | [?] UI validation |
| AC19 | POST /api/orders - edit with incomplete selections | API | PUT order with item missing required selections | status 400, {error: "All properties must be selected"} | ✅ |
| AC20: Save order with special characters in customer name | POST /api/orders - special chars | API | {customerName: "Jean-Luc O'Brien & Co.", items: [...]} | status 201, name preserved exactly as input | ✅ |

## Legend

- **✅ Checkable:** Automated test (API response verification, database state)
- **[?] UI flow:** UI test requires visual/interaction assertion; recommend manual smoke test or E2E framework later

## Test Summary

- **Total ACs:** 20
- **API Tests (machine-checkable):** 17 test cases
- **UI Tests (requires manual/E2E):** 12 test cases
- **Scenario Tests (requires Order History):** 1 test case (AC12 snapshot)

## ACs with No Automated Test & Why

**AC12: Order preserves product snapshot at creation time**
- **Why:** Requires product to be edited after order creation to verify snapshot
- **Action:** Manual verification or add after Order Editing feature allows product edits
- **Current state:** Can be partially tested via database inspection after POST /api/orders

All other 19 ACs have machine-checkable tests defined.
