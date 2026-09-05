# Feature: Product Management

## Problem Statement

The application needs a way to create and maintain a catalog of products (e.g., cakes) and configure their properties (e.g., base, size, frosting). Without this feature, there are no products to order. The system must allow adding new products, editing product names, managing product-specific properties, and managing property values. Products can be edited after orders exist, but changes must not retroactively affect existing orders.

## Proposed Change

A "Products" tab in the web UI that allows:
- **Create product:** Add a new product with a name
- **Edit product:** Change product name
- **Delete product:** Remove product from catalog (existing orders retain their product snapshot)
- **Add property:** Attach a named property to a product (e.g., "Base", "Size")
- **Delete property:** Remove a property and all its values from a product
- **Add property value:** Define available values for a property (e.g., "light", "dark" for "Base")
- **Delete property value:** Remove a value option from a property

Products are displayed as an expandable list. Each product shows its name, edit/delete buttons, and an expandable properties section.

## Acceptance Criteria

### AC1: Create product with valid name
**Given** the Products tab is open and the product list is empty  
**When** user enters "Chocolate Cake" in the product name field and clicks "Add Product"  
**Then** a new product appears in the list with id auto-generated (UUID), name "Chocolate Cake", and no properties; database is updated

### AC2: Create product with duplicate name
**Given** a product named "Chocolate Cake" already exists  
**When** user enters "Chocolate Cake" in the product name field and clicks "Add Product"  
**Then** the product is created with a unique id (duplicates are allowed, not prevented); both products appear in the list

### AC3: Create product with empty name
**Given** the Products tab is open  
**When** user leaves the product name field blank and clicks "Add Product"  
**Then** no product is created; an error message "Product name is required" appears below the input field

### AC4: Edit product name
**Given** a product "Chocolate Cake" with id "cake1" exists  
**When** user clicks "Edit" on the product, changes name to "Vanilla Cake", and clicks "Save"  
**Then** the product name updates to "Vanilla Cake" in the list and database; product id remains "cake1"

### AC5: Edit product to empty name
**Given** a product "Chocolate Cake" is being edited  
**When** user clears the name field and clicks "Save"  
**Then** no change occurs; an error message "Product name is required" appears; the product name remains "Chocolate Cake"

### AC6: Delete product
**Given** a product "Chocolate Cake" with id "cake1" exists and has no orders  
**When** user clicks "Delete" on the product and confirms  
**Then** the product is removed from the list and database; product id "cake1" no longer exists

### AC7: Delete product with existing orders fails
**Given** a product "Chocolate Cake" with id "cake1" exists and is referenced in an order  
**When** user clicks "Delete" on the product and confirms  
**Then** the product is not deleted; an error message "Cannot delete product: it is referenced in existing orders" appears; product remains in the catalog

### AC8: Add property to product
**Given** a product "Chocolate Cake" with id "cake1" exists and has no properties  
**When** user clicks "Add Property" on the product, enters "Base", and clicks "Save"  
**Then** a new property with id auto-generated (UUID), name "Base", and no values appears under the product in the list; database is updated

### AC9: Add duplicate property to same product
**Given** a product has a property "Base"  
**When** user attempts to add another property named "Base" to the same product  
**Then** a new property is created with a unique id; both properties appear under the product (duplicates allowed)

### AC10: Add property with empty name
**Given** the property form is open for a product  
**When** user leaves the property name field blank and clicks "Save"  
**Then** no property is created; an error message "Property name is required" appears

### AC11: Delete property from product
**Given** a product "Chocolate Cake" has properties "Base" (id "prop1") and "Size" (id "prop2")  
**When** user clicks "Delete" on property "Base"  
**Then** property "prop1" and all its values are removed from the product; "Size" remains; database is updated

### AC12: Add value to property
**Given** a product has property "Base" with id "prop1" and no values  
**When** user clicks "Add Value" on the property, enters "light", and clicks "Save"  
**Then** a new value with id auto-generated (UUID), text "light", is added to the property; database is updated

### AC13: Add duplicate value to property
**Given** a property "Base" already has value "light"  
**When** user enters "light" and clicks "Save"  
**Then** a new value is created with a unique id; both "light" entries appear in the list (duplicates allowed)

### AC14: Add value with empty text
**Given** a property value form is open  
**When** user leaves the value field blank and clicks "Save"  
**Then** no value is created; an error message "Value is required" appears

### AC15: Delete property value
**Given** a property "Base" has values ["light", "dark", "chocolate"] (ids v1, v2, v3)  
**When** user clicks "Delete" on value "dark" (v2)  
**Then** value v2 is removed; property still has ["light", "chocolate"]; database is updated

### AC16: Product list displays correctly
**Given** products "Chocolate Cake" (id cake1) and "Vanilla Cake" (id cake2) exist  
**When** user views the Products tab  
**Then** both products appear in order of creation, each showing name, edit/delete buttons, and an expand toggle for properties

### AC17: Property list displays correctly
**Given** product "Chocolate Cake" has properties "Base" (2 values) and "Size" (3 values)  
**When** user clicks expand on the product  
**Then** properties appear in order of creation, each showing name, edit/delete buttons, and a list of values with add/delete per value

## Files to Modify

| File | Change |
|---|---|
| src/db/schema.sql | Add products, properties, propertyValues tables |
| src/db/db.js | Add CRUD functions: createProduct, getProducts, updateProduct, deleteProduct, createProperty, deleteProperty, createPropertyValue, deletePropertyValue |
| src/routes/products.js | Add routes: GET /api/products, POST /api/products, PUT /api/products/:id, DELETE /api/products/:id, POST /api/products/:id/properties, DELETE /api/properties/:id, POST /api/properties/:id/values, DELETE /api/propertyValues/:id |
| src/public/index.html | Add Products tab with product list, forms for add/edit product, forms for add/edit properties and values |
| src/public/app.js | Add product management logic: fetch products, create/edit/delete product, add/delete property, add/delete value; form validation; error display |
| src/public/styles.css | Style product management UI (tabs, lists, forms, buttons, error messages) |

## Risk

- **What could break:** Allowing deletion of products that have orders would leave orphaned order references; deleting properties/values mid-order-creation could cause UI to show stale property list
- **Mitigation:** Products with orders cannot be deleted (enforced at API level with foreign key check)
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
| POST /api/properties/:id/values | empty value | property prop1 exists | POST prop1/values {value: ""} | status 400, response {error: "Value is required"}, no record inserted |
| POST /api/properties/:id/values | property not found | property prop99 does not exist | POST prop99/values {value: "light"} | status 404, response {error: "Property not found"}, no record inserted |
| DELETE /api/propertyValues/:id | happy path | value val1 on property prop1 exists | DELETE val1 | status 200, value removed from database |
| DELETE /api/propertyValues/:id | not found | value val99 does not exist | DELETE val99 | status 404, response {error: "Value not found"}, no change |
| GET /api/products (UI) | products tab renders | products "Cake1", "Cake2" exist with properties | page loads, Products tab selected | products displayed as list with names, edit/delete buttons, expand toggles; properties visible when expanded |
| POST /api/products (UI) | create product form | Products tab is open, form empty | enter "Chocolate Cake", click "Add Product" | form clears, new product appears in list, no error |
| POST /api/products (UI) | create product error | Products tab is open | leave name blank, click "Add Product" | error "Product name is required" displays, no product added, form retains focus |
| PUT /api/products/:id (UI) | edit product | product "Chocolate Cake" exists | click "Edit", change to "Vanilla Cake", click "Save" | product name updates, edit form closes, list refreshed |
| DELETE /api/products/:id (UI) | delete product | product "Chocolate Cake" exists | click "Delete", confirm | product removed from list, confirmation modal closes |

## Spec Readiness Checklist

- [x] Every AC has a precise expected value — no "works correctly"
  - Each AC specifies exact output (id format, error message text, database state, UI state)
  
- [x] Another person could write a test from each AC without asking
  - ACs describe exact pre-conditions (Given), actions (When), and observable outcomes (Then)
  
- [x] Every AC can fail — one that cannot fail proves nothing
  - ACs test happy paths (AC1, AC8, AC12), error cases (AC3, AC5, AC10, AC14), edge cases (AC2, AC7, AC13)
  
- [x] Error and edge cases have ACs of their own
  - Error cases: AC3 (empty name), AC5 (edit to empty), AC10 (empty property), AC14 (empty value)
  - Edge cases: AC2 (duplicates), AC7 (delete with orders), AC13 (duplicate values), AC9 (duplicate properties)
  
- [x] Every AC appears in the testing strategy table
  - All 17 ACs mapped to test cases in table above; multiple test cases per AC for happy path + error variants
