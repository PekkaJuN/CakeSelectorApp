# Test Plan: Order History

## AC to Test Mapping (Condensed)

| AC | Test | Type | Input | Expected | Checkable |
|----|------|------|-------|----------|-----------|
| AC1 | GET /api/orders - list | API | GET /api/orders (2 orders) | 200, [{id, customerName, createdAt, itemCount}, ...], descending | ✅ |
| AC2 | GET /api/orders - empty | API | GET /api/orders (no orders) | 200, [] | ✅ |
| AC3 | GET /api/orders/:id - details | API | GET /api/orders/ord1 | 200, {id, customerName, createdAt, updatedAt, items: [...]} | ✅ |
| AC4 | GET /api/orders/:id - not found | API | GET /api/orders/ord99 | 404, {error: "Order not found"} | ✅ |
| AC5 | DELETE /api/orders/:id | API | DELETE /api/orders/ord1 | 200, {deleted: "ord1"} | ✅ |
| AC6 | DELETE /api/orders/:id - not found | API | DELETE /api/orders/ord99 | 404, {error: "Order not found"} | ✅ |
| AC7-13 | UI: list, details, edit, delete | UI | Various interactions | Modals open/close, list updates | [?] UI |
| AC14-17 | Refresh, sort, format, special chars | API | Various orders | Correct order, timestamp format, preserved | ✅ |

## Test Summary

- **Total ACs:** 17
- **API Tests:** 12 machine-checkable
- **UI Tests:** 5 manual/E2E
- **All ACs covered**

## Notes

- No ACs blocked; all testable
- API tests verify order listing, retrieval, deletion
- UI tests deferred to E2E
- Timestamp format verified via API response
