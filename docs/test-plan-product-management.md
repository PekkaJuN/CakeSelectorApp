# Test Plan: Product Management

## AC to Test Mapping

| AC | Test Name | Type | Input | Expected Output | Checkable |
|----|-----------|----|-------|-----------------|-----------|
| AC1: Create product with valid name | POST /api/products - happy path | API | {name: "Chocolate Cake"} | status 201, {id: UUID, name: "Chocolate Cake", createdAt: timestamp} | ✅ |
| AC1 | POST /api/products (UI) - create product form | UI | Enter "Chocolate Cake", click "Add Product" | Form clears, product appears in list | [?] UI snapshot only |
| AC2: Create product with duplicate name | POST /api/products - duplicate name | API | {name: "Chocolate Cake"} (exists) | status 201, unique id, both in database | ✅ |
| AC3: Create product with empty name | POST /api/products - empty name | API | {name: ""} | status 400, {error: "Product name is required"} | ✅ |
| AC3 | POST /api/products - null name | API | {} (missing name field) | status 400, {error: "Product name is required"} | ✅ |
| AC3 | POST /api/products (UI) - create product error | UI | Leave name blank, click "Add Product" | Error "Product name is required" displays | [?] UI error display |
| AC4: Edit product name | PUT /api/products/:id - happy path | API | PUT cake1 {name: "Vanilla Cake"} | status 200, {id: "cake1", name: "Vanilla Cake", updatedAt: timestamp} | ✅ |
| AC4 | PUT /api/products/:id (UI) - edit product | UI | Click "Edit", change to "Vanilla Cake", click "Save" | Product name updates in list, form closes | [?] UI state update |
| AC5: Edit product to empty name | PUT /api/products/:id - empty name | API | PUT cake1 {name: ""} | status 400, {error: "Product name is required"}, name unchanged | ✅ |
| AC6: Delete product | DELETE /api/products/:id - happy path | API | DELETE cake1 (not in orders) | status 200, {deleted: "cake1"}, removed from database | ✅ |
| AC6 | DELETE /api/products/:id (UI) - delete product | UI | Click "Delete", confirm | Product removed from list, confirmation modal closes | [?] UI modal interaction |
| AC7: Delete product with existing orders fails | DELETE /api/products/:id - with orders | API | DELETE cake1 (in order ord1) | status 409, {error: "Cannot delete product: it is referenced in existing orders"} | ✅ (requires Order feature setup) |
| AC8: Add property to product | POST /api/products/:id/properties - happy path | API | POST cake1/properties {name: "Base"} | status 201, {id: UUID, productId: "cake1", name: "Base"} | ✅ |
| AC9: Add duplicate property to same product | POST /api/products/:id/properties - duplicate property | API | POST cake1/properties {name: "Base"} (exists) | status 201, unique id, both in database | ✅ |
| AC10: Add property with empty name | POST /api/products/:id/properties - empty name | API | POST cake1/properties {name: ""} | status 400, {error: "Property name is required"} | ✅ |
| AC10 | POST /api/products/:id/properties - product not found | API | POST cake99/properties {name: "Base"} | status 404, {error: "Product not found"} | ✅ |
| AC11: Delete property from product | DELETE /api/properties/:id - happy path | API | DELETE prop1 (with 2 values) | status 200, prop1 and values removed, other properties remain | ✅ |
| AC11 | DELETE /api/properties/:id - not found | API | DELETE prop99 | status 404, {error: "Property not found"} | ✅ |
| AC12: Add value to property | POST /api/properties/:id/values - happy path | API | POST prop1/values {value: "light"} | status 201, {id: UUID, propertyId: "prop1", value: "light"} | ✅ |
| AC13: Add duplicate value to property | POST /api/properties/:id/values - duplicate value | API | POST prop1/values {value: "light"} (exists) | status 201, unique id, both in database | ✅ |
| AC14: Add value with empty text | POST /api/properties/:id/values - empty value | API | POST prop1/values {value: ""} | status 400, {error: "Value is required"} | ✅ |
| AC14 | POST /api/properties/:id/values - property not found | API | POST prop99/values {value: "light"} | status 404, {error: "Property not found"} | ✅ |
| AC15: Delete property value | DELETE /api/propertyValues/:id - happy path | API | DELETE val2 (from ["light", "dark", "chocolate"]) | status 200, val2 removed, others remain | ✅ |
| AC15 | DELETE /api/propertyValues/:id - not found | API | DELETE val99 | status 404, {error: "Value not found"} | ✅ |
| AC16: Product list displays correctly | GET /api/products (UI) - products tab renders | UI | Page loads, Products tab active | Products listed with names, edit/delete buttons, expand toggles | [?] UI rendering |
| AC16 | GET /api/products - happy path | API | GET /api/products (2 products exist) | status 200, [{id, name, properties: []}, {...}], ordered by createdAt | ✅ |
| AC16 | GET /api/products - empty database | API | GET /api/products (no products) | status 200, [] | ✅ |
| AC17: Property list displays correctly | GET /api/products (UI) - products with properties | UI | Click expand on product with 2 properties | Properties shown with names, edit/delete buttons, values with add/delete | [?] UI expansion/rendering |
| AC17 | GET /api/products - with nested properties | API | GET /api/products (product has 2 properties, 5 values) | status 200, product includes properties array with values arrays, all ordered | ✅ |

## Legend

- **✅ Checkable:** Automated test (API response verification, database state)
- **[?] UI snapshot only:** UI test requires visual assertion; recommend manual smoke test or E2E framework (Playwright/Cypress) later

## Test Summary

- **Total ACs:** 17
- **API Tests (machine-checkable):** 21 test cases
- **UI Tests (requires manual/E2E later):** 6 test cases
- **Not machine-checkable yet:** UI interactions (form submission, modal confirmation, list refresh, expand/collapse). These are handled by manual QA in v1, or deferred to E2E testing framework.

## AC with No Automated Test & Why

**AC7: Delete product with existing orders fails** — Cannot test without Order feature infrastructure in place. This test depends on:
1. Creating an order that references a product
2. Attempting to delete that product
3. Verifying the error response

**Action:** Skip AC7 automated test until Order Creation feature is built and orderItems table exists. Add integration test after.

All other 16 ACs have at least one machine-checkable test.
