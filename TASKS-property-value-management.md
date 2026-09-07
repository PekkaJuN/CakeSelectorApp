⚠️ **DEPRECATED** — This task list has been merged into [TASKS-product-management.md](TASKS-product-management.md). Please refer to that file for the current task breakdown. This file is retained for reference only.

---

# Tasks: Property Value Management

Smallest sensible step at a time, in order. Each task closes one or more ACs.

## Phase 1: Database & Backend Setup

### Task 1.1: Add updatePropertyValue to db.js
**Closes:** None (foundation)
- [ ] Add `updatePropertyValue(id, value)` → UPDATE propertyValues SET value WHERE id
- [ ] Verify function works with test data

### Task 1.2: Implement PUT /api/propertyValues/:id endpoint
**Closes:** AC8, AC9, AC10
- [ ] Implement PUT `/api/propertyValues/:id` route
  - Validate value (not empty, not whitespace)
  - Fetch value (return 404 if not found)
  - Update value text in database
  - Return updated value
- [ ] Test AC8: Edit value → 200, text updated, id unchanged
- [ ] Test AC9: Edit to duplicate text → 200, duplicate allowed
- [ ] Test AC10: Edit to empty → 400, "Value is required", unchanged

### Task 1.3: Validate add value errors
**Closes:** AC3, AC4, AC5
- [ ] (Values add/list already implemented in Product Management)
- [ ] Test AC3: Add empty value → 400, "Value is required"
- [ ] Test AC4: Add whitespace → 400, "Value is required"
- [ ] Test AC5: Add to non-existent property → 404, "Property not found"

### Task 1.4: Verify value retrieval and listing
**Closes:** AC1, AC2, AC6, AC7, AC11
- [ ] Ensure GET `/api/properties/:id/values` works (already implemented)
- [ ] Test AC1: Add value → 201, appears in GET
- [ ] Test AC2: Duplicate allowed → both in database
- [ ] Test AC6: List values → ordered by createdAt
- [ ] Test AC7: Empty property → returns []
- [ ] Test AC11: Add third value → appends to list

### Task 1.5: Special cases and snapshots
**Closes:** AC12, AC13, AC14, AC15
- [ ] Test AC12: Values appear in property GET response
- [ ] Test AC13: Order snapshot preserves value text (manual/data check)
- [ ] Test AC14: Add value "dark & bitter" → & preserved
- [ ] Test AC15: Add "  light  " → spaces preserved in database

## Phase 2: Frontend Setup

### Task 2.1: Add value edit modal HTML
**Closes:** None (foundation)
- [ ] Add edit modal to index.html (reuse or extend Product Management modal)
  - Value text input (editable)
  - "Save" and "Cancel" buttons
  - Error message container
- [ ] Verify modal loads

### Task 2.2: Edit value form UI
**Closes:** AC8 (UI test)
- [ ] Implement edit button per value in property list
- [ ] On click: open modal with current value text
- [ ] User edits text, clicks "Save"
- [ ] Call PUT `/api/propertyValues/:id`
- [ ] On success: close modal, refresh value list
- [ ] On error: show error message
- [ ] Test AC8: Value updates in list after save

### Task 2.3: Validation and error display
**Closes:** AC3, AC10 (UI tests)
- [ ] Validate empty/whitespace on edit
- [ ] Show error message "Value is required"
- [ ] Test AC3: Add empty → error displays
- [ ] Test AC10: Edit to empty → error displays, value unchanged

### Task 2.4: Value list display
**Closes:** AC6, AC7 (UI tests)
- [ ] Show all values in property list
- [ ] Order by creation date
- [ ] Empty state when no values
- [ ] Test AC6: Multiple values display in order
- [ ] Test AC7: Empty property shows "No values"

### Task 2.5: Special character handling
**Closes:** AC14, AC15 (UI tests)
- [ ] Ensure special chars and whitespace preserved in UI
- [ ] Test AC14: "dark & bitter" displays correctly
- [ ] Test AC15: "  light  " shows with spaces

## Phase 3: Polish

### Task 3.1: CSS for value edit
**Closes:** None (polish)
- [ ] Style edit modal (align with other modals)
- [ ] Style value list (clear display)
- [ ] Responsive layout

### Task 3.2: UX refinements
**Closes:** None (polish)
- [ ] Auto-focus value input when edit modal opens
- [ ] Show success toast after edit
- [ ] Disable "Save" if no changes made

---

## Summary

**8 tasks total**
- **Phase 1 (Backend):** 5 tasks, closes API tests for ACs 1-15
- **Phase 2 (Frontend):** 3 tasks, closes UI flows
- **Phase 3 (Polish):** 2 tasks, no AC closure

**No blockers.** Property Value Management is independent; can run in parallel with Order Creation/Editing.

**Dependencies:**
- Requires Product Management (already complete)
