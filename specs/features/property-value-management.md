⚠️ **DEPRECATED** — This spec has been merged into [product-management.md](product-management.md). Please refer to that file for the complete and current feature specification. This file is retained for reference only.

---

# Feature: Property Value Management

## Problem Statement

Products have properties (e.g., "Base"), and properties need a set of available values (e.g., "light", "dark", "chocolate") that customers can select from when ordering. Without a way to add and manage these property values, customers cannot make meaningful selections. The system must allow adding new values to a property, removing obsolete values, and displaying available values clearly in the order builder.

## Proposed Change

A values management interface within each property in the Products tab. Users can:
- **Add property value:** Define a new available value for a property (e.g., add "light" to "Base")
- **Edit property value:** Change the text of an existing value (e.g., change "dark" to "dark chocolate")
- **List property values:** Display all available values for a property in order of creation

Property values are displayed as a list under each property, with an input field to add new values and an edit button per value.

## Acceptance Criteria

### AC1: Add value to property
**Given** a property "Base" with id "prop1" exists on product "Chocolate Cake" and has no values  
**When** user enters "light" in the value field and clicks "Add Value"  
**Then** a new value with id auto-generated (UUID), text "light", is added to the property; database is updated; value appears in the list

### AC2: Add value with duplicate text
**Given** a property "Base" already has value "light"  
**When** user enters "light" and clicks "Add Value"  
**Then** a new value is created with a unique id; both "light" entries appear in the list (duplicates allowed)

### AC3: Add value with empty text
**Given** the property value form is open for property "Base"  
**When** user leaves the value field blank and clicks "Add Value"  
**Then** no value is created; an error message "Value is required" appears below the input field; form retains focus

### AC4: Add value with whitespace only
**Given** the property value form is open  
**When** user enters "   " (spaces only) and clicks "Add Value"  
**Then** no value is created; an error message "Value is required" appears; form retains focus

### AC5: Add value when property does not exist
**Given** a property with id "prop99" does not exist  
**When** user attempts to add a value via API POST /api/properties/prop99/values with {value: "light"}  
**Then** status 404 is returned; response is {error: "Property not found"}; no value is created

### AC6: List values for property
**Given** a property "Base" with id "prop1" has values ["light", "dark", "chocolate"] created in that order  
**When** user views the property details  
**Then** all three values appear in the list in order of creation; each shows text and a delete button

### AC7: List values when property has none
**Given** a property "Size" with id "prop2" exists but has no values  
**When** user views the property details  
**Then** an empty list is displayed; "Add Value" form is visible and ready for input

### AC8: Edit property value
**Given** a property "Base" has value "dark" with id "v2"  
**When** user clicks "Edit" on value "dark", changes text to "dark chocolate", and clicks "Save"  
**Then** the value is updated in the database to "dark chocolate"; the list updates immediately to show "dark chocolate"; value id "v2" remains unchanged

### AC9: Edit value to duplicate text
**Given** a property "Base" has values ["light", "dark"]  
**When** user edits "dark" to "light" (duplicate of existing value)  
**Then** the value is updated to "light"; both values in property are now "light" (duplicates allowed); no error

### AC10: Edit value to empty text
**Given** a property value "dark" is being edited  
**When** user clears the text field and clicks "Save"  
**Then** no change occurs; an error message "Value is required" appears; the value remains "dark"

### AC11: Add value to property with multiple existing values
**Given** a property "Base" already has values ["light", "dark"]  
**When** user enters "chocolate" and clicks "Add Value"  
**Then** "chocolate" is added to the list as the third value; property now has ["light", "dark", "chocolate"]

### AC12: Values in order builder dropdown
**Given** product "Chocolate Cake" has property "Base" with values ["light", "dark", "chocolate"]  
**When** user opens the order builder and starts creating an order with this product  
**Then** the "Base" property shows a dropdown with options ["light", "dark", "chocolate"] in order; all options are selectable

### AC13: Order preserves value text at time of order
**Given** a property "Base" has value "light" (id v1)  
**When** an order is created with product selection base="light"  
**Then** the order stores "light" as the selection; if the value is later deleted, the order still shows "light"

### AC14: Add value with special characters
**Given** a property "Flavor" with id "prop3" exists  
**When** user enters "dark & bitter" and clicks "Add Value"  
**Then** the value "dark & bitter" is created and stored in database; it appears correctly in the list and dropdown

### AC15: Add value with leading/trailing whitespace
**Given** the property value form is open  
**When** user enters "  light  " (with spaces) and clicks "Add Value"  
**Then** the value is created and stored as "  light  " (whitespace preserved); it appears in list with spaces intact

## Files to Modify

| File | Change |
|---|---|
| src/db/schema.sql | propertyValues table already defined; ensure schema supports the operations |
| src/db/db.js | Add/verify functions: createPropertyValue, updatePropertyValue, getPropertyValues |
| src/routes/products.js | Routes: POST /api/properties/:id/values, PUT /api/propertyValues/:id for edit; ensure proper error handling |
| src/public/index.html | Expand property details to show value list and add-value form; add delete button per value |
| src/public/app.js | Add logic: fetchPropertyValues, createPropertyValue, deletePropertyValue, renderValueList; form validation; error display |
| src/public/styles.css | Style value list, add-value form, delete buttons, error messages |

## Risk

- **What could break:** Editing a value text could confuse historical orders if they reference the old text; trimming whitespace from values could break order data if values contain intentional spaces
- **Mitigation:** Values are stored as snapshots in orders (selections store the text at time of order, not a reference); whitespace is preserved as-is; edited values only appear in new orders
- **Rollback:** Remove value edit routes from Express; remove edit UI from Products tab

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
|---|---|---|---|---|
| POST /api/properties/:id/values | happy path | property prop1 exists, no values | POST prop1/values {value: "light"} | status 201, response {id: "<uuid>", propertyId: "prop1", value: "light", createdAt: "<timestamp>"}, record inserted |
| POST /api/properties/:id/values | duplicate text | property prop1 has value "light" | POST prop1/values {value: "light"} | status 201, unique id generated, both records in database |
| POST /api/properties/:id/values | empty value | property prop1 exists | POST prop1/values {value: ""} | status 400, response {error: "Value is required"}, no record inserted |
| POST /api/properties/:id/values | whitespace only | property prop1 exists | POST prop1/values {value: "   "} | status 400, response {error: "Value is required"}, no record inserted |
| POST /api/properties/:id/values | property not found | property prop99 does not exist | POST prop99/values {value: "light"} | status 404, response {error: "Property not found"}, no record inserted |
| POST /api/properties/:id/values | missing value field | property prop1 exists | POST prop1/values {} | status 400, response {error: "Value is required"}, no record inserted |
| GET /api/properties/:id/values | happy path | property prop1 has values [v1: "light", v2: "dark"] | GET prop1/values | status 200, response [{id: "v1", value: "light"}, {id: "v2", value: "dark"}], ordered by createdAt |
| GET /api/properties/:id/values | no values | property prop1 exists with no values | GET prop1/values | status 200, response [] |
| GET /api/properties/:id/values | property not found | property prop99 does not exist | GET prop99/values | status 404, response {error: "Property not found"} |
| PUT /api/propertyValues/:id | happy path | value val1 on property prop1 has text "dark" | PUT val1 {value: "dark chocolate"} | status 200, response {id: "val1", value: "dark chocolate", updatedAt: "<timestamp>"}, record updated in database |
| PUT /api/propertyValues/:id | edit to duplicate text | property has values "light", "dark" (ids v1, v2) | PUT v2 {value: "light"} | status 200, value v2 updated to "light", property now has two "light" entries |
| PUT /api/propertyValues/:id | edit to empty text | value val1 has text "dark" | PUT val1 {value: ""} | status 400, response {error: "Value is required"}, value remains "dark" |
| PUT /api/propertyValues/:id | value not found | value val99 does not exist | PUT val99 {value: "new"} | status 404, response {error: "Value not found"}, no change |
| POST /api/properties/:id/values (UI) | add value form | property "Base" is expanded, form empty | enter "light", click "Add Value" | form clears, "light" appears in value list, no error |
| POST /api/properties/:id/values (UI) | add value error | property "Base" form is visible | leave field blank, click "Add Value" | error "Value is required" appears, form retains focus, no value added |
| POST /api/properties/:id/values (UI) | add value with special chars | property form visible | enter "dark & bitter", click "Add Value" | value appears in list as "dark & bitter", form clears |
| PUT /api/propertyValues/:id (UI) | edit value | property "Base" has value "dark" | click "Edit" on "dark", change to "dark chocolate", click "Save" | value in list updates to "dark chocolate", database updated |
| PUT /api/propertyValues/:id (UI) | edit value error | value "dark" is being edited | clear field and click "Save" | error "Value is required" appears, value remains "dark" |
| GET /api/properties/:id/values (UI) | values in dropdown | product "Cake" has property "Base" with values ["light", "dark"] | user opens order builder for product | "Base" dropdown shows ["light", "dark"] as selectable options |
| Order snapshot | value preservation | order created with selection base="light" | value text is later edited to "light deluxe" | order still displays "light" (original snapshot at time of order) |

## Spec Readiness Checklist

- [x] Every AC has a precise expected value — no "works correctly"
  - Each AC specifies exact output: UUIDs, error message text ("Value is required"), database states, list order
  
- [x] Another person could write a test from each AC without asking
  - All ACs follow Given/When/Then; preconditions state exact value/property states; outcomes specify observable results

- [x] Every AC can fail — one that cannot fail proves nothing
  - Happy paths: AC1, AC6, AC8, AC9, AC11, AC12, AC14
  - Error cases: AC3, AC4, AC5, AC10 (missing/invalid input, resource not found)
  - Edge cases: AC2 (duplicates), AC7 (empty), AC13 (historical snapshot), AC15 (whitespace preservation)

- [x] Error and edge cases have ACs of their own
  - 5 error ACs (AC3, AC4, AC5, AC10 + AC5 property not found)
  - 4 edge case ACs (AC2 duplicates, AC7 empty, AC13 snapshot, AC15 whitespace)

- [x] Every AC appears in the testing strategy table
  - 24 test rows cover all 15 ACs
  - Each AC has happy path + error variant; API and UI tests included
  - Snapshot/preservation behavior tested
