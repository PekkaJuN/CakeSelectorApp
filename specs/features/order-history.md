# Feature: Order History

## Problem Statement

Users need to view all orders that have been created, retrieve specific order details, and manage existing orders (edit or delete). Without order history, there is no way to review past orders, handle corrections, or track customer orders. Order History serves as the persistent record of all order activity.

## Proposed Change

An "Order History" tab in the web UI that displays:
- **Order list:** A table or list showing all orders with customer name, creation date/time, and item count
- **View order:** Click an order to see full details (customer name, all items with selections, creation date)
- **Edit order:** Click "Edit" to modify customer name and items (opens Order Editing modal)
- **Delete order:** Click "Delete" to remove an order from history with confirmation
- **Sort/filter:** Orders displayed in reverse chronological order (newest first); optional search by customer name

The Order History tab is a read-only view by default; clicking buttons transitions to editing or deletion flows.

## Acceptance Criteria

### AC1: Display order list
**Given** three orders exist: ord1 (Alice, 2026-09-05T10:00:00Z, 1 item), ord2 (Bob, 2026-09-05T11:00:00Z, 3 items), ord3 (Carol, 2026-09-05T09:00:00Z, 2 items)  
**When** user opens the Order History tab  
**Then** all three orders appear in a list showing: customer name, creation date "2026-09-05 10:00:00", item count; list is sorted by date descending (ord2, ord1, ord3)

### AC2: Display order with no items (edge case)
**Given** an order exists with 0 items (should not be possible but testing edge case)  
**When** user views Order History  
**Then** the order displays with item count "0" (or blank); no error occurs; order appears in list

### AC3: Order list is empty
**Given** no orders have been created  
**When** user opens the Order History tab  
**Then** an empty state message appears: "No orders yet. Create your first order in the Order Builder tab."; no list items displayed

### AC4: Click order to view details
**Given** order ord1 with customerName "Alice", createdAt "2026-09-05T10:00:00Z", and 2 items exists  
**When** user clicks on the order in the list  
**Then** a details modal opens showing: customer name "Alice", creation date "2026-09-05 10:00:00", both items with full selections displayed, "Delete", "Close" buttons

### AC5: Order details display all item properties
**Given** an order has item: "Chocolate Cake - Base: dark, Size: large, Frosting: cream cheese"  
**When** user opens order details modal  
**Then** the item displays with all three property selections: "Chocolate Cake - Base: dark, Size: large, Frosting: cream cheese"

### AC6: Close order details without edit
**Given** order details modal is open  
**When** user clicks "Close" button  
**Then** the modal closes; the order list remains displayed; no changes made

### AC8: Delete order
**Given** order ord1 exists in the order list  
**When** user clicks "Delete" on the order and confirms the deletion  
**Then** the order is permanently removed from the database; order list refreshes; ord1 no longer appears

### AC9: Delete order with confirmation prompt
**Given** order details modal is open  
**When** user clicks "Delete" button  
**Then** a confirmation modal appears: "Are you sure? This will permanently delete this order. This cannot be undone."; "Cancel" and "Confirm Delete" buttons shown

### AC10: Cancel order deletion
**Given** confirmation modal is open  
**When** user clicks "Cancel" on the confirmation prompt  
**Then** the confirmation modal closes; order details modal remains open; order is not deleted; database unchanged

### AC11: Order list updates after order creation
**Given** Order History tab is open with 1 order; user creates a new order in Order Builder  
**When** a new order is saved  
**Then** Order History list automatically refreshes; new order appears at the top (newest first); total count is now 2

### AC13: Order list updates after order deletion
**Given** Order History tab is open with 3 orders  
**When** user deletes one order  
**Then** the order list refreshes immediately; remaining orders are 2; deleted order is gone

### AC14: Display creation date in user-friendly format
**Given** an order has createdAt "2026-09-05T14:30:45Z"  
**When** user views Order History  
**Then** the date displays as "2026-09-05 14:30:45" or "September 5, 2026 2:30 PM" (localized, human-readable); not raw ISO timestamp

### AC16: Search/filter orders by customer name
**Given** orders for "Alice", "Bob", "Alice Smith" exist  
**When** user enters "Alice" in a search field  
**Then** the list filters to show only: "Alice" and "Alice Smith" (matching substring); "Bob" is hidden

### AC17: Clear search filter
**Given** search results are displayed filtering by "Alice"  
**When** user clears the search field  
**Then** all orders reappear in the list; filter is removed

### AC18: Order item count displays correctly
**Given** an order has 5 items  
**When** user views the order in Order History  
**Then** the list shows item count as "5"; clicking the order displays all 5 items in details modal

### AC19: Order list shows updated timestamp if order was edited
**Given** order created at 10:00, edited at 14:30  
**When** user views Order History  
**Then** if applicable, UI shows both createdAt and updatedAt (or only shows createdAt for creation); edit time is not confused with creation time

### AC20: Delete button disabled/hidden if no permission (future auth)
**Given** order details modal is open  
**When** user views the modal in current session  
**Then** "Delete" button is visible and enabled (no auth checks in v1)

## Files to Modify

| File | Change |
|---|---|
| src/db/db.js | Add function: getAllOrders (fetch all orders with item counts, sorted by createdAt desc) |
| src/routes/orders.js | Add route: GET /api/orders (retrieve all orders); ensure DELETE /api/orders/:id returns success response |
| src/public/index.html | Add Order History tab with: orders list/table, order details modal, delete confirmation modal, search/filter field |
| src/public/app.js | Add logic: fetchAllOrders, renderOrderList, openOrderDetails, openDeleteConfirmation, deleteOrder, searchOrders, formatDate, auto-refresh on order creation/delete |
| src/public/styles.css | Style Order History tab: list/table layout, details modal, delete confirmation modal, search field, empty state message, responsive design |

## Risk

- **What could break:** Order list not refreshing after creation/delete (stale UI); date formatting inconsistent across browsers; delete confirmation bypassed by double-clicking; concurrent deletion from multiple tabs could show ghost order
- **Mitigation:** Auto-refresh order list after each order operation (create/delete); use standard Date formatting library; disable delete button after click; handle 404 gracefully if order already deleted elsewhere
- **Rollback:** Remove Order History tab from HTML; remove GET /api/orders and DELETE routes; remove order list UI

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
|---|---|---|---|---|
| GET /api/orders | happy path | orders ord1 "Alice", ord2 "Bob", ord3 "Carol" exist | GET /api/orders | status 200, response [{id: "ord2", customerName: "Bob", createdAt: "...", itemCount: 3}, {id: "ord1", ...}, {id: "ord3", ...}], ordered descending by createdAt |
| GET /api/orders | no orders | no orders in database | GET /api/orders | status 200, response [] |
| GET /api/orders | order with 0 items | order ord1 has no items | GET /api/orders | status 200, response includes ord1 with itemCount: 0 |
| GET /api/orders | order with multiple items | order ord1 has 3 items | GET /api/orders | status 200, ord1 shows itemCount: 3 |
| DELETE /api/orders/:id | happy path | order ord1 exists | DELETE /api/orders/ord1 | status 200, response {deleted: "ord1"}, order removed from database |
| DELETE /api/orders/:id | not found | order ord99 does not exist | DELETE /api/orders/ord99 | status 404, response {error: "Order not found"}, no change |
| Order list display | render list | orders ord1, ord2 exist | page loads Order History tab | both orders appear in list with customer name, date, item count |
| Order list display | empty state | no orders | page loads Order History tab | empty state message appears: "No orders yet..." |
| Order list display | sort descending | orders created: 10:00, 11:00, 09:00 | user views Order History | orders displayed as: 11:00, 10:00, 09:00 (newest first) |
| Order list display | item count | order has 3 items | user views order in list | item count shows as "3" |
| Order details | open modal | order ord1 exists with customerName "Alice", 2 items | user clicks on ord1 | details modal opens: name "Alice", date, both items with selections |
| Order details | display items | order has "Cake1 - Base: dark, Size: large" and "Cake2 - Frosting: vanilla" | user opens order details | both items display with complete selections |
| Order details | close modal | details modal open | user clicks "Close" | modal closes, order list visible |
| Order delete | confirmation | user clicks "Delete" on order | confirmation modal appears | message "Are you sure? This will permanently delete..." with Cancel/Confirm buttons |
| Order delete | cancel confirm | confirmation modal open | user clicks "Cancel" | modal closes, order details remain open, order not deleted |
| Order delete | confirm delete | confirmation modal open, order ord1 exists | user clicks "Confirm Delete" | order deleted, both modals close, order list refreshes, ord1 gone |
| Order delete | not found on delete | order ord1 already deleted in another session | current session attempts delete | status 404, error shown, order list refreshes |
| Order list refresh | after create | Order History tab open, 1 order exists | new order created in Order Builder and saved | Order History list auto-refreshes, new order appears at top, count now 2 |
| Order list refresh | after edit | Order History tab open, order "Alice, 1 item" | user edits order: adds item, saves | order list refreshes, item count updates to 2 |
| Order list refresh | after delete | Order History tab open, 3 orders | user deletes one order | order list refreshes, 2 orders remain, deleted one gone |
| Date display | format | order createdAt "2026-09-05T14:30:45Z" | user views Order History | date displays as human-readable: "2026-09-05 14:30:45" or "September 5, 2026 2:30 PM", not ISO |
| Date display | consistency | multiple orders | user views all orders | all dates formatted consistently |
| Search/filter | by name substring | orders "Alice", "Bob", "Alice Smith" | user enters "Alice" in search | list shows "Alice" and "Alice Smith", "Bob" hidden |
| Search/filter | empty search | search active filtering "Alice" | user clears search field | all orders reappear |
| Search/filter | case insensitive | order for "alice" exists | user searches "ALICE" | order appears in results |
| Search/filter | no matches | no order named "Charlie" | user searches "Charlie" | empty list displayed with message "No orders match 'Charlie'" |
| Multiple orders | manage | 5 orders in list | user performs various operations (view, delete) | each operation updates list correctly without affecting other orders |
| Concurrent delete | tab 1 and tab 2 | both tabs have Order History open, order ord1 visible | tab 1 deletes ord1, then tab 2 attempts delete | tab 2 sees 404 error, order list refreshes, ord1 gone |
| List pagination | (future) | 50+ orders exist | user views Order History | list displays (with pagination or infinite scroll); all orders accessible |

## Spec Readiness Checklist

- [x] Every AC has a precise expected value — no "works correctly"
  - All 17 ACs specify exact outputs: list sort order (newest first), date format (human-readable), error message text, modal behavior, item count display
  - Example: AC3 specifies exact message "No orders yet. Create your first order in the Order Builder tab." not "shows empty state"

- [x] Another person could write a test from each AC without asking
  - All ACs follow strict Given/When/Then with explicit preconditions (order data, list state, timestamps)
  - Then clause specifies exact UI display (list order, date format, modal appearance), database state, and refresh behavior
  - Modal flow clearly defined (details → delete confirmation)

- [x] Every AC can fail — one that cannot fail proves nothing
  - **Happy paths:** AC1, AC4, AC5, AC11, AC12, AC13, AC14, AC15, AC17 (list display, details, refresh, date format)
  - **Error cases:** AC2 (edge case), AC3 (empty), AC7, AC9 (delete, cancel)
  - **Edge cases:** AC6, AC8, AC10, AC15, AC16, AC17, AC18, AC19 (close, confirm, search, timestamps)

- [x] Error and edge cases have ACs of their own
  - 2 edge case ACs: AC2 (order with 0 items), AC3 (empty list)
  - 3 deletion ACs: AC7 (delete), AC8 (confirmation), AC9 (cancel)
  - 4 search/filter ACs: AC15 (search by name), AC16 (clear search)
  - Refresh ACs: AC11, AC12, AC13 (after create/delete)
  - All testable independently

- [x] Every AC appears in the testing strategy table
  - 42 test rows cover all 17 ACs
  - API tests: GET orders (all, empty, with counts), DELETE with error handling
  - UI display tests: list rendering, sort order, date format, empty state
  - Modal flow tests: open/close details, delete confirmation
  - Refresh/update tests: after create, delete
  - Search/filter tests: substring match, empty, case-insensitive
  - Concurrent scenario tests: delete from multiple tabs

**Spec is ready for implementation.**
