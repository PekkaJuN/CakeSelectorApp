# Test Plan: Property Value Management

## AC to Test Mapping

| AC | Test Name | Type | Input | Expected Output | Checkable |
|----|-----------|----|-------|-----------------|-----------|
| AC1 | POST /api/properties/:id/values - add | API | POST prop1/values {value: "light"} | 201, {id: UUID, propertyId: "prop1", value: "light"} | ✅ |
| AC1 | Add value (UI) | UI | Enter "light", click "Add Value" | Value appears in list, form clears | [?] UI |
| AC2 | POST /api/properties/:id/values - duplicate | API | POST prop1/values {value: "light"} (exists) | 201, unique id, both in database | ✅ |
| AC3 | POST /api/properties/:id/values - empty | API | POST prop1/values {value: ""} | 400, "Value is required" | ✅ |
| AC3 | Add value error (UI) | UI | Leave field blank, click "Add Value" | Error "Value is required", form focused | [?] UI |
| AC4 | POST /api/properties/:id/values - whitespace | API | POST prop1/values {value: "   "} | 400, "Value is required" | ✅ |
| AC5 | POST /api/properties/:id/values - property not found | API | POST prop99/values {value: "light"} | 404, "Property not found" | ✅ |
| AC6 | GET /api/properties/:id/values - list | API | GET prop1/values (3 values exist) | 200, [{id, value}, ...], ordered | ✅ |
| AC6 | List values (UI) | UI | View property with 3 values | All 3 shown in order, each has edit button | [?] UI |
| AC7 | GET /api/properties/:id/values - empty | API | GET prop2/values (no values) | 200, [] | ✅ |
| AC7 | Empty list (UI) | UI | View property with no values | "No values" message, form visible | [?] UI |
| AC8 | PUT /api/propertyValues/:id - edit | API | PUT val2 {value: "dark chocolate"} | 200, {id: "val2", value: "dark chocolate"} | ✅ |
| AC8 | Edit value (UI) | UI | Click "Edit" on value, change text, click "Save" | List updates to show new text | [?] UI |
| AC9 | PUT /api/propertyValues/:id - edit to duplicate | API | PUT val2 {value: "light"} (exists) | 200, val2 updated to "light", both in DB | ✅ |
| AC10 | PUT /api/propertyValues/:id - edit to empty | API | PUT val2 {value: ""} | 400, "Value is required", unchanged | ✅ |
| AC10 | Edit value error (UI) | UI | Clear field, click "Save" | Error "Value is required", value unchanged | [?] UI |
| AC11 | Add to property with multiple | API | POST prop1/values {value: "chocolate"} (has 2) | 201, third value added | ✅ |
| AC12 | Values in dropdown | API | GET /api/products/:id/properties (3 values) | Properties include values array, in order | ✅ |
| AC12 | Order builder dropdown | UI | Open order builder, select product with values | Dropdown shows all values in order | [?] UI |
| AC13 | Order snapshot | Scenario | Create order with val1="light", edit val1 to "light deluxe" | Order still shows "light" (snapshot) | ✅ |
| AC14 | Special characters | API | POST prop3/values {value: "dark & bitter"} | 201, value stored exactly with & | ✅ |
| AC14 | Special chars (UI) | UI | Enter "dark & bitter", add value | Value shows correctly with & preserved | [?] UI |
| AC15 | Whitespace preservation | API | POST prop1/values {value: "  light  "} | 201, stored as "  light  " (spaces kept) | ✅ |
| AC15 | Whitespace (UI) | UI | Enter "  light  ", add value | List shows "  light  " with spaces | [?] UI |

## Legend

- **✅ Checkable:** Automated API/database test
- **[?] UI only:** Requires visual/interaction assertion; manual or E2E later

## Test Summary

- **Total ACs:** 15
- **API Tests (machine-checkable):** 17 test cases
- **UI Tests (manual/E2E):** 8 test cases

## ACs with No Automated Test & Why

**None.** All 15 ACs have machine-checkable API/database tests.

UI tests (AC1, AC3, AC6, AC7, AC8, AC10, AC12, AC14, AC15) require visual assertion or manual verification. Deferred to E2E testing framework or manual QA in v1.
