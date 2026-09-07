# Test Plan: Product Management

## AC to Test Mapping

| AC | Test Name | Type | Input | Expected Output | Checkable |
|----|-----------|----|-------|-----------------|-----------|
| **AC1** | POST /api/products - happy path | API | {name: "Chocolate Cake"} | 201, {id: UUID, name: "Chocolate Cake", createdAt: timestamp} | ✅ |
| **AC1** | POST /api/products (UI) - create product form | UI | Enter "Chocolate Cake", click "Add Product" | Form clears, product appears in list | [?] |
| **AC2** | POST /api/products - duplicate name | API | {name: "Chocolate Cake"} (exists) | 201, unique id, both in database | ✅ |
| **AC3** | POST /api/products - empty name | API | {name: ""} | 400, {error: "Product name is required"} | ✅ |
| **AC3** | POST /api/products - null name | API | {} (missing name field) | 400, {error: "Product name is required"} | ✅ |
| **AC3** | POST /api/products (UI) - create product error | UI | Leave name blank, click "Add Product" | Error "Product name is required" displays | [?] |
| **AC4** | PUT /api/products/:id - happy path | API | PUT cake1 {name: "Vanilla Cake"} | 200, {id: "cake1", name: "Vanilla Cake", updatedAt: timestamp} | ✅ |
| **AC4** | PUT /api/products/:id (UI) - edit product | UI | Click "Edit", change to "Vanilla Cake", click "Save" | Product name updates in list, form closes | [?] |
| **AC5** | PUT /api/products/:id - empty name | API | PUT cake1 {name: ""} | 400, {error: "Product name is required"}, unchanged | ✅ |
| **AC6** | DELETE /api/products/:id - happy path | API | DELETE cake1 (not in orders) | 200, {deleted: "cake1"}, removed from database | ✅ |
| **AC6** | DELETE /api/products/:id (UI) - delete product | UI | Click "Delete", confirm | Product removed from list, modal closes | [?] |
| **AC7** | DELETE /api/products/:id - with orders | API | DELETE cake1 (in order ord1) | 409, {error: "Cannot delete product: it is referenced in existing orders"} | ✅ (blocked: needs Order feature) |
| **AC8** | POST /api/products/:id/properties - happy path | API | POST cake1/properties {name: "Base"} | 201, {id: UUID, productId: "cake1", name: "Base"} | ✅ |
| **AC9** | POST /api/products/:id/properties - duplicate | API | POST cake1/properties {name: "Base"} (exists) | 201, unique id, both in database | ✅ |
| **AC10** | POST /api/products/:id/properties - empty name | API | POST cake1/properties {name: ""} | 400, {error: "Property name is required"} | ✅ |
| **AC10** | POST /api/products/:id/properties - product not found | API | POST cake99/properties {name: "Base"} | 404, {error: "Product not found"} | ✅ |
| **AC11** | DELETE /api/properties/:id - happy path | API | DELETE prop1 (with 2 values) | 200, prop1 and values removed | ✅ |
| **AC11** | DELETE /api/properties/:id - not found | API | DELETE prop99 | 404, {error: "Property not found"} | ✅ |
| **AC12** | POST /api/properties/:id/values - happy path | API | POST prop1/values {value: "light"} | 201, {id: UUID, propertyId: "prop1", value: "light"} | ✅ |
| **AC12** | POST /api/properties/:id/values (UI) - add value | UI | Enter "light", click "Add Value" | Value appears in list, form clears | [?] |
| **AC13** | POST /api/properties/:id/values - duplicate | API | POST prop1/values {value: "light"} (exists) | 201, unique id, both in database | ✅ |
| **AC14** | POST /api/properties/:id/values - empty | API | POST prop1/values {value: ""} | 400, {error: "Value is required"} | ✅ |
| **AC14** | POST /api/properties/:id/values (UI) - add empty | UI | Leave field blank, click "Add Value" | Error "Value is required" displays | [?] |
| **AC15** | POST /api/properties/:id/values - whitespace | API | POST prop1/values {value: "   "} | 400, {error: "Value is required"} | ✅ |
| **AC16** | POST /api/properties/:id/values - property not found | API | POST prop99/values {value: "light"} | 404, {error: "Property not found"} | ✅ |
| **AC17** | POST /api/properties/:id/values - multiple values | API | POST prop1/values {value: "chocolate"} (has ["light", "dark"]) | 201, third value added | ✅ |
| **AC18** | POST /api/properties/:id/values - special characters | API | POST prop3/values {value: "dark & bitter"} | 201, value stored exactly | ✅ |
| **AC18** | POST /api/properties/:id/values (UI) - special chars | UI | Enter "dark & bitter", add value | Value displays correctly with & preserved | [?] |
| **AC19** | POST /api/properties/:id/values - whitespace preserved | API | POST prop1/values {value: "  light  "} | 201, stored as "  light  " (spaces kept) | ✅ |
| **AC19** | POST /api/properties/:id/values (UI) - whitespace | UI | Enter "  light  ", add value | List shows "  light  " with spaces | [?] |
| **AC20** | GET /api/properties/:id/values - list | API | GET prop1/values (3 values exist) | 200, [{id, value}, ...], ordered by createdAt | ✅ |
| **AC20** | GET /api/properties/:id/values (UI) - list values | UI | View property with 3 values | All 3 shown in order, each has edit/delete buttons | [?] |
| **AC21** | GET /api/properties/:id/values - empty | API | GET prop2/values (no values) | 200, [] | ✅ |
| **AC21** | GET /api/properties/:id/values (UI) - empty list | UI | View property with no values | Empty list shown, "Add Value" form visible | [?] |
| **AC22** | PUT /api/propertyValues/:id - happy path | API | PUT val1 {value: "dark chocolate"} | 200, {id: "val1", value: "dark chocolate", updatedAt: timestamp} | ✅ |
| **AC22** | PUT /api/propertyValues/:id (UI) - edit value | UI | Click "Edit" on value, change to "dark chocolate", click "Save" | List updates to show new text | [?] |
| **AC23** | PUT /api/propertyValues/:id - duplicate | API | PUT val2 {value: "light"} (exists) | 200, val2 updated to "light", both in DB | ✅ |
| **AC23** | PUT /api/propertyValues/:id (UI) - edit to duplicate | UI | Click "Edit" on "dark", change to "light" (exists), click "Save" | Value updates to "light", both "light" entries shown, no error | [?] |
| **AC24** | PUT /api/propertyValues/:id - empty | API | PUT val1 {value: ""} | 400, {error: "Value is required"}, unchanged | ✅ |
| **AC24** | PUT /api/propertyValues/:id (UI) - edit empty | UI | Clear field and click "Save" | Error "Value is required" displays, value unchanged | [?] |
| **AC25** | DELETE /api/propertyValues/:id - happy path | API | DELETE val2 (from ["light", "dark", "chocolate"]) | 200, val2 removed, others remain | ✅ |
| **AC25** | DELETE /api/propertyValues/:id - not found | API | DELETE val99 | 404, {error: "Value not found"} | ✅ |
| **AC26** | GET /api/products (UI) - products tab renders | UI | Page loads, Products tab active | Products listed with names, edit/delete buttons, expand toggles | [?] |
| **AC26** | GET /api/products - happy path | API | GET /api/products (2 products exist) | 200, [{id, name, properties: []}, {...}], ordered by createdAt | ✅ |
| **AC26** | GET /api/products - empty database | API | GET /api/products (no products) | 200, [] | ✅ |
| **AC27** | GET /api/products (UI) - products with properties | UI | Click expand on product with 2 properties | Properties shown with names, buttons, values with add/edit/delete | [?] |
| **AC27** | GET /api/products - with nested properties | API | GET /api/products (2 properties, 5 values) | 200, product includes properties array with values arrays, ordered | ✅ |
| **AC28** | GET /api/properties/:id/values (UI) - order builder | UI | Open order builder, select product with values | Property dropdowns show all values in order | [?] (blocked: needs Order feature) |
| **AC29** | Order snapshot - value preservation | Scenario | Create order with val1="light", edit val1 to "light deluxe" | Order still shows "light" (snapshot) | ✅ (blocked: needs Order feature) |

## Legend

- **✅ Checkable:** Automated test (API response, database state, data integrity)
- **[?]:** UI test requires visual/interaction assertion; manual smoke test or E2E framework (Playwright/Cypress) later

## Test Summary

- **Total ACs:** 29
- **API Tests (machine-checkable):** 35 test cases
- **UI Tests (manual/E2E):** 15 test cases
- **Blocked by other features:** AC7 (Order feature), AC28–AC29 (Order feature)

## ACs with No Automated Test & Why

**AC7, AC28, AC29** — Require Order feature infrastructure (orderItems table, order creation/editing). Add integration tests after Order Creation feature is built.

**All other 26 ACs** have at least one machine-checkable API or database test.
