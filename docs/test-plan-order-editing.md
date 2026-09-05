# Test Plan: Order Editing

## AC to Test Mapping (Condensed)

| AC | Test Name | Type | Input | Expected Output | Checkable |
|----|-----------|----|-------|-----------------|-----------|
| AC1 | GET /api/orders/:id - retrieve for edit | API | GET /api/orders/ord1 (2 items) | 200, {id, customerName, createdAt, updatedAt, items: [...]} | ✅ |
| AC2 | PUT /api/orders/:id - edit name | API | PUT ord1 {customerName: "Alice Smith"} | 200, name updated, createdAt unchanged, updatedAt current | ✅ |
| AC3 | PUT /api/orders/:id - empty name | API | PUT ord1 {customerName: ""} | 400, "Customer name is required", unchanged | ✅ |
| AC4 | PUT /api/orders/:id - whitespace name | API | PUT ord1 {customerName: "   "} | 400, "Customer name is required" | ✅ |
| AC5 | PUT /api/orders/:id - add item | API | PUT ord1 {items: [old item, new item]} | 200, 2 items in database | ✅ |
| AC6 | PUT /api/orders/:id - incomplete properties | API | PUT ord1 with item missing required property | 400, "All properties must be selected" | ✅ |
| AC7 | PUT /api/orders/:id - remove item | API | PUT ord1 {items: [i1]} (omit i2) | 200, 1 item remains | ✅ |
| AC8 | PUT /api/orders/:id - remove last item | API | PUT ord1 {items: []} | 400, "Order must contain at least one item" | ✅ |
| AC9 | PUT /api/orders/:id - save changes | UI | Edit name, add item, click "Save Changes" | 200, modal closes, Order History updated | [?] UI flow |
| AC10 | Cancel editing | UI | Change name, click "Cancel" | Modal closes, order in database unchanged | [?] UI behavior |
| AC11 | createdAt preserved | API/Data | Edit order, verify timestamp | createdAt matches original, updatedAt newer | ✅ |
| AC12 | Product snapshot preserved | API/Data | Edit order, verify product name in item | Item still shows original product name | ✅ |
| AC13 | New item snapshot | API/Data | Add item, verify snapshot | Item stores current product/value state | ✅ |
| AC14 | Special characters in name | API | PUT ord1 {customerName: "Jean-Luc O'Brien & Co."} | 200, name preserved with special chars | ✅ |
| AC15 | Item display | UI | Open edit modal with 2 items | Both items show with all selections | [?] UI rendering |
| AC16 | Multiple adds in one session | API | PUT ord1 with 3 items (1 original + 2 new) | 200, 3 items, single updatedAt | ✅ |
| AC17 | Edit never-edited order | API | Edit order where createdAt ≈ updatedAt | createdAt unchanged, updatedAt updated | ✅ |
| AC18 | Concurrent edits - last write wins | Scenario | Tab1 saves "Alice Smith", Tab2 saves "Alice Johnson" | DB: "Alice Johnson", both succeed | ✅ Manual |
| AC19 | Stale order refresh | UI | Another session edits, current session views | UI shows current database state | [?] Cache invalidation |
| AC20 | Item identity on re-add | API/Data | Remove item, add identical one | Same product/selections, new item id | ✅ |

## Legend

- **✅ Checkable:** Automated API/database test
- **[?] UI flow:** Requires visual/interaction assertion; manual or E2E later

## Test Summary

- **Total ACs:** 20
- **API Tests (machine-checkable):** 14 test cases
- **UI Tests (manual/E2E):** 4 test cases
- **Data/Scenario Tests:** 2 cases (snapshot, stale data)

## ACs with No Automated Test & Why

**AC18: Concurrent edit prevention**
- **Why:** Requires two simultaneous sessions; hard to automate
- **Action:** Manual test or integration test with mock timing
- **Current state:** Last-write-wins is acceptable; test that both PUTs succeed

**AC19: Viewing stale order version**
- **Why:** Requires cache invalidation timing; hard to automate reliably
- **Action:** Manual test or integration test with mock cache
- **Current state:** GET /api/orders/:id always returns current data; no caching issue in v1

All other 18 ACs have machine-checkable tests.
