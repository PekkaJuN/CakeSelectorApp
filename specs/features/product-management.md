# Feature: Product Management

## Problem Statement

The application needs a way to create and maintain a catalog of products (e.g., cakes) and configure their properties (e.g., base, size, frosting) with available values (e.g., "light", "dark" for base). Without this feature, there are no products to order. The system must allow adding new products, editing product names, managing product-specific properties, managing property values (create, edit, delete), and displaying values in the order builder. Products can be edited after orders exist, but changes must not retroactively affect existing orders.

## Proposed Change

A "Products" tab in the web UI that allows:
- **Create product:** Add a new product with a name
- **Edit product:** Change product name
- **Delete product:** Remove product from catalog (existing orders retain their product snapshot)
- **Add property:** Attach a named property to a product (e.g., "Base", "Size")
- **Delete property:** Remove a property and all its values from a product
- **Add property value:** Define available values for a property (e.g., "light", "dark" for "Base")
- **Edit property value:** Change the text of an existing value (e.g., change "dark" to "dark chocolate")
- **Delete property value:** Remove a value option from a property

Products are displayed as an expandable list. Each product shows its name, edit/delete buttons, and an expandable properties section. Each property shows its name, edit/delete buttons, and a list of values with add/edit/delete per value.

## Acceptance Criteria

### Products

#### AC1: Create product with valid name
**Given** the Products tab is open and the product list is empty  
**When** user enters "Chocolate Cake" in the product name field and clicks "Add Product"  
**Then** a new product appears in the list with id auto-generated (UUID), name "Chocolate Cake", and no properties; database is updated

#### AC2: Create product with duplicate name
**Given** a product named "Chocolate Cake" already exists  
**When** user enters "Chocolate Cake" in the product name field and clicks "Add Product"  
**Then** the product is created with a unique id (duplicates are allowed, not prevented); both products appear in the list

#### AC3: Create product with empty name
**Given** the Products tab is open  
**When** user leaves the product name field blank and clicks "Add Product"  
**Then** no product is created; an error message "Product name is required" appears below the input field

#### AC4: Edit product name
**Given** a product "Chocolate Cake" with id "cake1" exists  
**When** user clicks "Edit" on the product, changes name to "Vanilla Cake", and clicks "Save"  
**Then** the product name updates to "Vanilla Cake" in the list and database; product id remains "cake1"

#### AC5: Edit product to empty name
**Given** a product "Chocolate Cake" is being edited  
**When** user clears the name field and clicks "Save"  
**Then** no change occurs; an error message "Product name is required" appears; the product name remains "Chocolate Cake"

#### AC6: Delete product
**Given** a product "Chocolate Cake" with id "cake1" exists and has no orders  
**When** user clicks "Delete" on the product and confirms  
**Then** the product is removed from the list and database; product id "cake1" no longer exists

#### AC7: Delete product with existing orders fails
**Given** a product "Chocolate Cake" with id "cake1" exists and is referenced in an order  
**When** user clicks "Delete" on the product and confirms  
**Then** the product is not deleted; an error message "Cannot delete product: it is referenced in existing orders" appears; product remains in the catalog

### Properties

#### AC8: Add property to product
**Given** a product "Chocolate Cake" with id "cake1" exists and has no properties  
**When** user clicks "Add Property" on the product, enters "Base", and clicks "Save"  
**Then** a new property with id auto-generated (UUID), name "Base", and no values appears under the product in the list; database is updated

#### AC9: Add duplicate property to same product
**Given** a product has a property "Base"  
**When** user attempts to add another property named "Base" to the same product  
**Then** a new property is created with a unique id; both properties appear under the product (duplicates allowed)

#### AC10: Add property with empty name
**Given** the property form is open for a product  
**When** user leaves the property name field blank and clicks "Save"  
**Then** no property is created; an error message "Property name is required" appears

#### AC11: Delete property from product
**Given** a product "Chocolate Cake" has properties "Base" (id "prop1") and "Size" (id "prop2")  
**When** user clicks "Delete" on property "Base"  
**Then** property "prop1" and all its values are removed from the product; "Size" remains; database is updated

### Property Values

#### AC12: Add value to property
**Given** a property "Base" with id "prop1" exists on product "Chocolate Cake" and has no values  
**When** user enters "light" in the value field and clicks "Add Value"  
**Then** a new value with id auto-generated (UUID), text "light", is added to the property; database is updated; value appears in the list

#### AC13: Add value with duplicate text
**Given** a property "Base" already has value "light"  
**When** user enters "light" and clicks "Add Value"  
**Then** a new value is created with a unique id; both "light" entries appear in the list (duplicates allowed)

#### AC14: Add value with empty text
**Given** the property value form is open for property "Base"  
**When** user leaves the value field blank and clicks "Add Value"  
**Then** no value is created; an error message "Value is required" appears below the input field; form retains focus

#### AC15: Add value with whitespace only
**Given** the property value form is open  
**When** user enters "   " (spaces only) and clicks "Add Value"  
**Then** no value is created; an error message "Value is required" appears; form retains focus

#### AC16: Add value when property does not exist
**Given** a property with id "prop99" does not exist  
**When** user attempts to add a value via API POST /api/properties/prop99/values with {value: "light"}  
**Then** status 404 is returned; response is {error: "Property not found"}; no value is created

#### AC17: Add value to property with multiple existing values
**Given** a property "Base" already has values ["light", "dark"]  
**When** user enters "chocolate" and clicks "Add Value"  
**Then** "chocolate" is added to the list as the third value; property now has ["light", "dark", "chocolate"]

#### AC18: Add value with special characters
**Given** a property "Flavor" with id "prop3" exists  
**When** user enters "dark & bitter" and clicks "Add Value"  
**Then** the value "dark & bitter" is created and stored in database; it appears correctly in the list and dropdown

#### AC19: Add value with leading/trailing whitespace
**Given** the property value form is open  
**When** user enters "  light  " (with spaces) and clicks "Add Value"  
**Then** the value is created and stored as "  light  " (whitespace preserved); it appears in list with spaces intact

#### AC20: List values for property
**Given** a property "Base" with id "prop1" has values ["light", "dark", "chocolate"] created in that order  
**When** user views the property details  
**Then** all three values appear in the list in order of creation; each shows text, edit button, and delete button

#### AC21: List values when property has none
**Given** a property "Size" with id "prop2" exists but has no values  
**When** user views the property details  
**Then** an empty list is displayed; "Add Value" form is visible and ready for input

#### AC22: Edit property value
**Given** a property "Base" has value "dark" with id "v2"  
**When** user clicks "Edit" on value "dark", changes text to "dark chocolate", and clicks "Save"  
**Then** the value is updated in the database to "dark chocolate"; the list updates immediately to show "dark chocolate"; value id "v2" remains unchanged

#### AC23: Edit value to duplicate text
**Given** a property "Base" has values ["light", "dark"]  
**When** user edits "dark" to "light" (duplicate of existing value)  
**Then** the value is updated to "light"; both values in property are now "light" (duplicates allowed); no error

#### AC24: Edit value to empty text
**Given** a property value "dark" is being edited  
**When** user clears the text field and clicks "Save"  
**Then** no change occurs; an error message "Value is required" appears; the value remains "dark"

#### AC25: Delete property value
**Given** a property "Base" has values ["light", "dark", "chocolate"] (ids v1, v2, v3)  
**When** user clicks "Delete" on value "dark" (v2)  
**Then** value v2 is removed; property still has ["light", "chocolate"]; database is updated

### Display

#### AC26: Product list displays correctly
**Given** products "Chocolate Cake" (id cake1) and "Vanilla Cake" (id cake2) exist  
**When** user views the Products tab  
**Then** both products appear in order of creation, each showing name, edit/delete buttons, and an expand toggle for properties

#### AC27: Property list displays correctly
**Given** product "Chocolate Cake" has properties "Base" (2 values) and "Size" (3 values)  
**When** user clicks expand on the product  
**Then** properties appear in order of creation, each showing name, edit/delete buttons, and a list of values with add/edit/delete per value

#### AC28: Values in order builder dropdown
**Given** product "Chocolate Cake" has property "Base" with values ["light", "dark", "chocolate"]  
**When** user opens the order builder and starts creating an order with this product  
**Then** the "Base" property shows a dropdown with options ["light", "dark", "chocolate"] in order; all options are selectable

#### AC29: Order preserves value text at time of order
**Given** a property "Base" has value "light" (id v1)  
**When** an order is created with product selection base="light"  
**Then** the order stores "light" as the selection; if the value is later deleted or edited, the order still shows "light"

## Files to Modify

| File | Change |
|---|---|
| src/db/schema.sql | Add products, properties, propertyValues tables |
| src/db/db.js | Add CRUD functions: createProduct, getProducts, updateProduct, deleteProduct, createProperty, deleteProperty, createPropertyValue, getPropertyValues, updatePropertyValue, deletePropertyValue |
| src/routes/products.js | Add routes: GET /api/products, POST /api/products, PUT /api/products/:id, DELETE /api/products/:id, POST /api/products/:id/properties, DELETE /api/properties/:id, POST /api/properties/:id/values, PUT /api/propertyValues/:id, DELETE /api/propertyValues/:id, GET /api/properties/:id/values |
| src/public/index.html | Add Products tab with product list, forms for add/edit product, forms for add/edit/delete properties and values |
| src/public/app.js | Add product management logic: fetch products/values, create/edit/delete product, add/delete property, add/edit/delete value; form validation; error display |
| src/public/styles.css | Style product management UI (tabs, lists, forms, buttons, error messages) |

## Risk

- **What could break:** Allowing deletion of products that have orders would leave orphaned order references; deleting properties/values mid-order-creation could cause UI to show stale property list; editing a value text could confuse historical orders if they reference the old text
- **Mitigation:** Products with orders cannot be deleted (enforced at API level with foreign key check); values are stored as snapshots in orders (selections store the text at time of order, not a reference); edited values only appear in new orders
- **Rollback:** Drop products, properties, propertyValues tables; remove product routes from Express; remove Products tab from HTML

## Testing Strategy (MANDATORY)

| Function | Case | Given | When | Then |
|---|---|---|---|---|
| POST /api/products | happy path | empty products table | POST {name: "Chocolate Cake"} | status 201, response {id: "<uuid>", name: "Chocolate Cake", createdAt: "<timestamp>"}, record inserted |
| POST /api/products | duplicate name | product "Chocolate Cake" exists | POST {name: "Chocolate Cake"} | status 201, unique id generated, both records in database |
| POST /api/products | empty name | products table empty | POST {name: ""} | status 400, response {error: "Product name is required"}, no record inserted |
| POST /api/products | null name | products table empty | POST {} (missing name field) | status 400, response {error: "Product name is required"}, no record inserted |
| GET /api/products | happy path | products "Cake1", "Cake2" exist | GET /api/products | status 200, response [{id, name, properties: []}, {id, name, properties: []}], ordered by createdAt |
| GET /api/products | empty database | no products exist | GET /api/products | status 200, response [] |
| PUT /api/products/:id | happy path | product cake1 exists with name "Old" | PUT cake1 {name: "New"} | status 200, response {id: "cake1", name: "New", updatedAt: "<timestamp>"}, database updated |
| PUT /api/products/:id | not found | product cake99 does not exist | PUT cake99 {name: "New"} | status 404, response {error: "Product not found"}, no change |
| PUT /api/products/:id | empty name | product cake1 exists | PUT cake1 {name: ""} | status 400, response {error: "Product name is required"}, name unchanged |
| DELETE /api/products/:id | happy path | product cake1 exists, not in any order | DELETE cake1 | status 200, response {deleted: "cake1"}, record removed from database |
| DELETE /api/products/:id | with orders | product cake1 in order ord1 | DELETE cake1 | status 409, response {error: "Cannot delete product: it is referenced in existing orders"}, product remains in database |
| DELETE /api/products/:id | not found | product cake99 does not exist | DELETE cake99 | status 404, response {error: "Product not found"}, no change |
| POST /api/products/:id/properties | happy path | product cake1 exists, no properties | POST cake1/properties {name: "Base"} | status 201, response {id: "<uuid>", productId: "cake1", name: "Base", createdAt: "<timestamp>"}, record inserted |
| POST /api/products/:id/properties | empty name | product cake1 exists | POST cake1/properties {name: ""} | status 400, response {error: "Property name is required"}, no record inserted |
| POST /api/products/:id/properties | product not found | product cake99 does not exist | POST cake99/properties {name: "Base"} | status 404, response {error: "Product not found"}, no record inserted |
| DELETE /api/properties/:id | happy path | property prop1 on product cake1 exists with 2 values | DELETE prop1 | status 200, property and all values removed from database |
| DELETE /api/properties/:id | not found | property prop99 does not exist | DELETE prop99 | status 404, response {error: "Property not found"}, no change |
| POST /api/properties/:id/values | happy path | property prop1 exists, no values | POST prop1/values {value: "light"} | status 201, response {id: "<uuid>", propertyId: "prop1", value: "light", createdAt: "<timestamp>"}, record inserted |
| POST /api/properties/:id/values | duplicate text | property prop1 has value "light" | POST prop1/values {value: "light"} | status 201, unique id generated, both records in database |
| POST /api/properties/:id/values | empty value | property prop1 exists | POST prop1/values {value: ""} | status 400, response {error: "Value is required"}, no record inserted |
| POST /api/properties/:id/values | whitespace only | property prop1 exists | POST prop1/values {value: "   "} | status 400, response {error: "Value is required"}, no record inserted |
| POST /api/properties/:id/values | property not found | property prop99 does not exist | POST prop99/values {value: "light"} | status 404, response {error: "Property not found"}, no record inserted |
| POST /api/properties/:id/values | missing value field | property prop1 exists | POST prop1/values {} | status 400, response {error: "Value is required"}, no record inserted |
| POST /api/properties/:id/values | special characters | property prop3 exists | POST prop3/values {value: "dark & bitter"} | status 201, value stored with special chars intact |
| POST /api/properties/:id/values | whitespace preserved | property prop1 exists | POST prop1/values {value: "  light  "} | status 201, value stored as "  light  " with spaces preserved |
| GET /api/properties/:id/values | happy path | property prop1 has values [v1: "light", v2: "dark"] | GET prop1/values | status 200, response [{id: "v1", value: "light"}, {id: "v2", value: "dark"}], ordered by createdAt |
| GET /api/properties/:id/values | no values | property prop1 exists with no values | GET prop1/values | status 200, response [] |
| GET /api/properties/:id/values | property not found | property prop99 does not exist | GET prop99/values | status 404, response {error: "Property not found"} |
| PUT /api/propertyValues/:id | happy path | value val1 on property prop1 has text "dark" | PUT val1 {value: "dark chocolate"} | status 200, response {id: "val1", value: "dark chocolate", updatedAt: "<timestamp>"}, record updated |
| PUT /api/propertyValues/:id | edit to duplicate text | property has values "light", "dark" (ids v1, v2) | PUT v2 {value: "light"} | status 200, value v2 updated to "light", property now has two "light" entries |
| PUT /api/propertyValues/:id | edit to empty text | value val1 has text "dark" | PUT val1 {value: ""} | status 400, response {error: "Value is required"}, value remains "dark" |
| PUT /api/propertyValues/:id | value not found | value val99 does not exist | PUT val99 {value: "new"} | status 404, response {error: "Value not found"}, no change |
| DELETE /api/propertyValues/:id | happy path | value val1 on property prop1 exists | DELETE val1 | status 200, value removed from database |
| DELETE /api/propertyValues/:id | not found | value val99 does not exist | DELETE val99 | status 404, response {error: "Value not found"}, no change |
| GET /api/products (UI) | products tab renders | products "Cake1", "Cake2" exist with properties | page loads, Products tab selected | products displayed as list with names, edit/delete buttons, expand toggles; properties visible when expanded |
| POST /api/products (UI) | create product form | Products tab is open, form empty | enter "Chocolate Cake", click "Add Product" | form clears, new product appears in list, no error |
| POST /api/products (UI) | create product error | Products tab is open | leave name blank, click "Add Product" | error "Product name is required" displays, no product added, form retains focus |
| PUT /api/products/:id (UI) | edit product | product "Chocolate Cake" exists | click "Edit", change to "Vanilla Cake", click "Save" | product name updates, edit form closes, list refreshed |
| DELETE /api/products/:id (UI) | delete product | product "Chocolate Cake" exists | click "Delete", confirm | product removed from list, confirmation modal closes |
| POST /api/properties/:id/values (UI) | add value form | property "Base" is expanded, form empty | enter "light", click "Add Value" | form clears, "light" appears in value list, no error |
| POST /api/properties/:id/values (UI) | add value error | property "Base" form is visible | leave field blank, click "Add Value" | error "Value is required" appears, form retains focus, no value added |
| POST /api/properties/:id/values (UI) | add value with special chars | property form visible | enter "dark & bitter", click "Add Value" | value appears in list as "dark & bitter", form clears |
| PUT /api/propertyValues/:id (UI) | edit value | property "Base" has value "dark" | click "Edit" on "dark", change to "dark chocolate", click "Save" | value in list updates to "dark chocolate", database updated |
| PUT /api/propertyValues/:id (UI) | edit value error | value "dark" is being edited | clear field and click "Save" | error "Value is required" appears, value remains "dark" |
| GET /api/properties/:id/values (UI) | values in dropdown | product "Cake" has property "Base" with values ["light", "dark"] | user opens order builder for product | "Base" dropdown shows ["light", "dark"] as selectable options |
| Order snapshot | value preservation | order created with selection base="light" | value text is later edited to "light deluxe" | order still displays "light" (original snapshot at time of order) |

## Spec Readiness Checklist

- [x] Every AC has a precise expected value — no "works correctly"
  - Each AC specifies exact output (id format, error message text, database state, UI state)
  
- [x] Another person could write a test from each AC without asking
  - ACs describe exact pre-conditions (Given), actions (When), and observable outcomes (Then)
  
- [x] Every AC can fail — one that cannot fail proves nothing
  - ACs test happy paths (AC1, AC8, AC12, AC20, AC22), error cases (AC3, AC5, AC10, AC14-16, AC24), edge cases (AC2, AC7, AC13, AC15, AC17-19, AC23)
  
- [x] Error and edge cases have ACs of their own
  - Error cases: AC3 (empty name), AC5 (edit to empty), AC10 (empty property), AC14-16 (empty/whitespace/not found values), AC24 (edit to empty)
  - Edge cases: AC2 (duplicates), AC7 (delete with orders), AC13 (duplicate values), AC15 (whitespace), AC17-19 (multiple values, special chars, whitespace preserved), AC23 (edit to duplicate)
  
- [x] Every AC appears in the testing strategy table
  - All 29 ACs mapped to test cases in table; multiple test cases per AC for happy path + error variants
