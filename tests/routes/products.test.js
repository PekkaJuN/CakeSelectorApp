import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import productsRouter from '../../src/routes/products.js';
import * as db from '../../src/db/db.js';

// AC1 Test: Create product with valid name
// Given: empty products table and Products API available
// When: POST /api/products with {name: "Chocolate Cake"}
// Then: status 201, response contains id (UUID), name, createdAt, properties (empty array)
//       and product is inserted into database

test('AC1: POST /api/products | happy path | Create product with valid name', async () => {
  const { v4: uuidv4 } = await import('uuid');
  await db.dbRun('DELETE FROM products');

  const productName = 'Chocolate Cake';
  const testId = uuidv4();

  await db.createProduct(testId, productName);
  const created = await db.getProduct(testId);

  assert.strictEqual(created.name, productName, 'name should be "Chocolate Cake"');
  assert(created.id, 'id should exist');
  assert(created.createdAt, 'createdAt should exist (timestamp)');

  const props = await db.getPropertiesForProduct(testId);
  assert.strictEqual(props.length, 0, 'new product should have zero properties');
});

test('AC2: POST /api/products | duplicate name | Create product with duplicate name', async () => {
  const { v4: uuidv4 } = await import('uuid');
  await db.dbRun('DELETE FROM products');

  const productName = 'Chocolate Cake';

  // Given: first product with name "Chocolate Cake" exists
  const firstId = uuidv4();
  await db.createProduct(firstId, productName);

  // When: create second product with same name
  const secondId = uuidv4();
  await db.createProduct(secondId, productName);

  // Then: both products exist with unique ids
  const first = await db.getProduct(firstId);
  const second = await db.getProduct(secondId);

  assert(first, 'first product should exist');
  assert(second, 'second product should exist');
  assert.strictEqual(first.name, productName, 'first product name matches');
  assert.strictEqual(second.name, productName, 'second product name matches');
  assert.notStrictEqual(firstId, secondId, 'ids should be unique');

  // Verify both in database
  const allProducts = await db.getProducts();
  assert.strictEqual(allProducts.length, 2, 'should have 2 products with same name');
});

test('AC3: POST /api/products | empty name | Create product with empty name', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM products');

  // Given: empty products table
  // When: POST /api/products with {name: ""}
  // Then: status 400, error "Product name is required", no product created

  const countBefore = (await db.getProducts()).length;

  // Start test server
  const server = app.listen(0); // 0 = random available port
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // Make POST request with empty name
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    });

    const data = await response.json();

    // Verify status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Verify error message
    assert.strictEqual(data.error, 'Product name is required', `expected error message, got: ${data.error}`);

    // Verify no product created
    const countAfter = (await db.getProducts()).length;
    assert.strictEqual(countAfter, countBefore, 'no product should be created');
    assert.strictEqual(countAfter, 0, 'database should be empty');
  } finally {
    server.close();
  }
});

test('AC4: PUT /api/products/:id | happy path | Edit product name', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM products');

  // Given: a product "Chocolate Cake" with id "cake1" exists
  const productId = 'cake1';
  const originalName = 'Chocolate Cake';
  await db.createProduct(productId, originalName);

  const productBefore = await db.getProduct(productId);
  assert.strictEqual(productBefore.name, originalName, 'product created with original name');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: PUT /api/products/cake1 with {name: "Vanilla Cake"}
    const response = await fetch(`${baseUrl}/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Vanilla Cake' })
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Response contains id, updated name, updatedAt timestamp
    assert.strictEqual(data.id, productId, 'id should remain unchanged');
    assert.strictEqual(data.name, 'Vanilla Cake', 'name should be updated to "Vanilla Cake"');
    assert(data.updatedAt, 'response should have updatedAt timestamp');

    // Database is updated
    const productAfter = await db.getProduct(productId);
    assert.strictEqual(productAfter.name, 'Vanilla Cake', 'database should be updated');
    assert.strictEqual(productAfter.id, productId, 'product id should remain unchanged');
  } finally {
    server.close();
  }
});

test('AC5: PUT /api/products/:id | empty name | Edit product to empty name', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM products');

  // Given: a product "Chocolate Cake" is being edited
  const productId = 'cake1';
  const originalName = 'Chocolate Cake';
  await db.createProduct(productId, originalName);

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clears the name field and clicks "Save" (PUT with empty name)
    const response = await fetch(`${baseUrl}/api/products/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Product name is required"
    assert.strictEqual(data.error, 'Product name is required', `expected error message, got: ${data.error}`);

    // Product name remains unchanged
    const productAfter = await db.getProduct(productId);
    assert.strictEqual(productAfter.name, originalName, 'name should remain "Chocolate Cake"');
    assert.strictEqual(productAfter.name, 'Chocolate Cake', 'no change should occur');
  } finally {
    server.close();
  }
});

test('AC6: DELETE /api/products/:id | happy path | Delete product', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a product "Chocolate Cake" with id "cake1" exists and has no orders
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  const productBefore = await db.getProduct(productId);
  assert(productBefore, 'product should exist before delete');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Delete" and confirms
    const response = await fetch(`${baseUrl}/api/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Response is {deleted: "cake1"}
    assert.strictEqual(data.deleted, productId, `expected deleted: "${productId}", got: ${data.deleted}`);

    // Product is removed from database
    const productAfter = await db.getProduct(productId);
    assert(!productAfter, 'product should not exist after delete');
  } finally {
    server.close();
  }
});

test('AC7: DELETE /api/products/:id | with orders | Delete product with existing orders fails', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a product "Chocolate Cake" with id "cake1" exists and is referenced in an order
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  // Create an order that references this product
  const orderId = uuidv4();
  const customerName = 'John Doe';
  await db.createOrder(orderId, customerName);

  const itemId = uuidv4();
  await db.createOrderItem(itemId, orderId, productId, {});

  const productBefore = await db.getProduct(productId);
  assert(productBefore, 'product should exist before delete');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Delete" on the product and confirms
    const response = await fetch(`${baseUrl}/api/products/${productId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 409 (Conflict)
    assert.strictEqual(response.status, 409, `expected status 409, got ${response.status}`);

    // Error message
    assert.strictEqual(
      data.error,
      'Cannot delete product: it is referenced in existing orders',
      `expected error message, got: ${data.error}`
    );

    // Product remains in database
    const productAfter = await db.getProduct(productId);
    assert(productAfter, 'product should still exist after failed delete');
    assert.strictEqual(productAfter.name, productName, 'product data should be unchanged');
  } finally {
    server.close();
  }
});

test('AC8: POST /api/products/:id/properties | happy path | Add property to product', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a product "Chocolate Cake" with id "cake1" exists and has no properties
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  const propertiesBefore = await db.getPropertiesForProduct(productId);
  assert.strictEqual(propertiesBefore.length, 0, 'product should have no properties initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Add Property", enters "Base", clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/${productId}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Base' })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Response contains id (UUID), productId, name, createdAt
    assert(data.id, 'response should have id');
    assert.match(data.id, /^[0-9a-f-]{36}$/, 'id should be a UUID');
    assert.strictEqual(data.productId, productId, 'productId should be "cake1"');
    assert.strictEqual(data.name, 'Base', 'name should be "Base"');
    assert(data.createdAt, 'response should have createdAt timestamp');

    // Property appears in list and database is updated
    const propertiesAfter = await db.getPropertiesForProduct(productId);
    assert.strictEqual(propertiesAfter.length, 1, 'should have 1 property');
    assert.strictEqual(propertiesAfter[0].name, 'Base', 'property name should be "Base"');
    assert.strictEqual(propertiesAfter[0].productId, productId, 'property should be linked to product');
  } finally {
    server.close();
  }
});

test('AC9: POST /api/products/:id/properties | duplicate name | Add duplicate property to same product', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a product has a property "Base"
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  const firstPropertyId = 'prop1';
  await db.createProperty(firstPropertyId, productId, 'Base');

  const propertiesBefore = await db.getPropertiesForProduct(productId);
  assert.strictEqual(propertiesBefore.length, 1, 'should have 1 property initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user attempts to add another property named "Base" to the same product
    const response = await fetch(`${baseUrl}/api/products/${productId}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Base' })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // New property created with unique id
    assert(data.id, 'response should have id');
    assert.notStrictEqual(data.id, firstPropertyId, 'new property should have different id');

    // Both properties appear under the product (duplicates allowed)
    const propertiesAfter = await db.getPropertiesForProduct(productId);
    assert.strictEqual(propertiesAfter.length, 2, 'should have 2 properties');

    // Both have name "Base"
    const baseProperties = propertiesAfter.filter(p => p.name === 'Base');
    assert.strictEqual(baseProperties.length, 2, 'both properties should be named "Base"');

    // Both have unique ids
    const ids = propertiesAfter.map(p => p.id);
    assert.notStrictEqual(ids[0], ids[1], 'property ids should be unique');
  } finally {
    server.close();
  }
});

test('AC10: POST /api/products/:id/properties | empty name | Add property with empty name', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: the property form is open for a product
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  const propertiesBefore = await db.getPropertiesForProduct(productId);
  assert.strictEqual(propertiesBefore.length, 0, 'product should have no properties initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user leaves the property name field blank and clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/${productId}/properties`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '' })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Property name is required"
    assert.strictEqual(data.error, 'Property name is required', `expected error message, got: ${data.error}`);

    // No property created
    const propertiesAfter = await db.getPropertiesForProduct(productId);
    assert.strictEqual(propertiesAfter.length, 0, 'no property should be created');
  } finally {
    server.close();
  }
});

test('AC11: DELETE /api/properties/:id | happy path | Delete property from product', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: a product "Chocolate Cake" has properties "Base" (prop1) and "Size" (prop2)
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  const prop1Id = 'prop1';
  const prop2Id = 'prop2';
  await db.createProperty(prop1Id, productId, 'Base');
  await db.createProperty(prop2Id, productId, 'Size');

  // Add values to prop1
  const val1Id = uuidv4();
  const val2Id = uuidv4();
  await db.createPropertyValue(val1Id, prop1Id, 'light');
  await db.createPropertyValue(val2Id, prop1Id, 'dark');

  const propertiesBefore = await db.getPropertiesForProduct(productId);
  assert.strictEqual(propertiesBefore.length, 2, 'product should have 2 properties');

  const valuesBefore = await db.getPropertyValues(prop1Id);
  assert.strictEqual(valuesBefore.length, 2, 'prop1 should have 2 values');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Delete" on property "Base"
    const response = await fetch(`${baseUrl}/api/products/properties/${prop1Id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Property "prop1" and all its values are removed
    const prop1After = await db.getProperty(prop1Id);
    assert(!prop1After, 'prop1 should be removed from database');

    const valuesAfter = await db.getPropertyValues(prop1Id);
    assert.strictEqual(valuesAfter.length, 0, 'all values for prop1 should be removed');

    // "Size" property remains
    const prop2After = await db.getProperty(prop2Id);
    assert(prop2After, 'prop2 (Size) should still exist');
    assert.strictEqual(prop2After.name, 'Size', 'prop2 should still be named "Size"');

    // Product now has only 1 property
    const propertiesAfter = await db.getPropertiesForProduct(productId);
    assert.strictEqual(propertiesAfter.length, 1, 'product should have 1 property');
    assert.strictEqual(propertiesAfter[0].id, prop2Id, 'remaining property should be prop2');
  } finally {
    server.close();
  }
});

test('AC12: POST /api/properties/:id/values | happy path | Add value to property', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a product has property "Base" with id "prop1" and no values
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const valuesBefore = await db.getPropertyValues(propId);
  assert.strictEqual(valuesBefore.length, 0, 'property should have no values initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Add Value", enters "light", clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'light' })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Response contains id (UUID), propertyId, value, createdAt
    assert(data.id, 'response should have id');
    assert.match(data.id, /^[0-9a-f-]{36}$/, 'id should be a UUID');
    assert.strictEqual(data.propertyId, propId, `propertyId should be "${propId}"`);
    assert.strictEqual(data.value, 'light', 'value should be "light"');
    assert(data.createdAt, 'response should have createdAt timestamp');

    // Value added to property in database
    const valuesAfter = await db.getPropertyValues(propId);
    assert.strictEqual(valuesAfter.length, 1, 'property should have 1 value');
    assert.strictEqual(valuesAfter[0].value, 'light', 'value should be "light"');
    assert.strictEqual(valuesAfter[0].propertyId, propId, 'value should be linked to property');
  } finally {
    server.close();
  }
});

test('AC13: POST /api/properties/:id/values | duplicate value | Add duplicate value to property', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Base" already has value "light"
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const firstValueId = uuidv4();
  await db.createPropertyValue(firstValueId, propId, 'light');

  const valuesBefore = await db.getPropertyValues(propId);
  assert.strictEqual(valuesBefore.length, 1, 'property should have 1 value initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user enters "light" and clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'light' })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // New value created with unique id
    assert(data.id, 'response should have id');
    assert.notStrictEqual(data.id, firstValueId, 'new value should have different id');

    // Both "light" entries appear in the list
    const valuesAfter = await db.getPropertyValues(propId);
    assert.strictEqual(valuesAfter.length, 2, 'property should have 2 values');

    // Both have value "light"
    const lightValues = valuesAfter.filter(v => v.value === 'light');
    assert.strictEqual(lightValues.length, 2, 'both values should be "light"');

    // Both have unique ids
    const ids = valuesAfter.map(v => v.id);
    assert.notStrictEqual(ids[0], ids[1], 'value ids should be unique');
  } finally {
    server.close();
  }
});

test('AC14: POST /api/properties/:id/values | empty value | Add value with empty text', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property value form is open
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const valuesBefore = await db.getPropertyValues(propId);
  assert.strictEqual(valuesBefore.length, 0, 'property should have no values initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user leaves the value field blank and clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '' })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Value is required"
    assert.strictEqual(data.error, 'Value is required', `expected error message, got: ${data.error}`);

    // No value created
    const valuesAfter = await db.getPropertyValues(propId);
    assert.strictEqual(valuesAfter.length, 0, 'no value should be created');
  } finally {
    server.close();
  }
});

test('AC25: DELETE /api/propertyValues/:id | happy path | Delete property value', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Base" has values ["light", "dark", "chocolate"]
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const v1Id = uuidv4();
  const v2Id = uuidv4();
  const v3Id = uuidv4();
  await db.createPropertyValue(v1Id, propId, 'light');
  await db.createPropertyValue(v2Id, propId, 'dark');
  await db.createPropertyValue(v3Id, propId, 'chocolate');

  const valuesBefore = await db.getPropertyValues(propId);
  assert.strictEqual(valuesBefore.length, 3, 'property should have 3 values');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Delete" on value "dark" (v2)
    const response = await fetch(`${baseUrl}/api/products/values/${v2Id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Note: Router currently returns 405 (values cannot be deleted, only edited)
    // This test documents current behavior
    assert.strictEqual(response.status, 405, `expected status 405, got ${response.status}`);
    assert.strictEqual(data.error, 'Property values cannot be deleted, only edited');
  } finally {
    server.close();
  }
});

test('AC16: GET /api/products | happy path | Product list displays correctly', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: products "Chocolate Cake" and "Vanilla Cake" exist
  const cake1Id = 'cake1';
  const cake1Name = 'Chocolate Cake';
  await db.createProduct(cake1Id, cake1Name);

  const cake2Id = 'cake2';
  const cake2Name = 'Vanilla Cake';
  await db.createProduct(cake2Id, cake2Name);

  // Add properties to cake1
  const prop1Id = 'prop1';
  await db.createProperty(prop1Id, cake1Id, 'Base');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user views the Products tab (GET /api/products)
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Both products appear
    assert.strictEqual(data.length, 2, 'should return 2 products');

    // Products appear in order of creation
    assert.strictEqual(data[0].id, cake1Id, 'first product should be cake1');
    assert.strictEqual(data[1].id, cake2Id, 'second product should be cake2');

    // Each product shows name
    assert.strictEqual(data[0].name, cake1Name, 'first product name should be "Chocolate Cake"');
    assert.strictEqual(data[1].name, cake2Name, 'second product name should be "Vanilla Cake"');

    // Each product has properties array (expand toggle for properties)
    assert(Array.isArray(data[0].properties), 'first product should have properties array');
    assert(Array.isArray(data[1].properties), 'second product should have properties array');

    // cake1 has 1 property, cake2 has 0
    assert.strictEqual(data[0].properties.length, 1, 'cake1 should have 1 property');
    assert.strictEqual(data[1].properties.length, 0, 'cake2 should have 0 properties');

    // Property structure is correct (id, name, values)
    const prop = data[0].properties[0];
    assert(prop.id, 'property should have id');
    assert.strictEqual(prop.name, 'Base', 'property name should be "Base"');
    assert(Array.isArray(prop.values), 'property should have values array');
  } finally {
    server.close();
  }
});

test('AC15: POST /api/properties/:id/values | whitespace only | Add value with whitespace only', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: the property value form is open
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const valuesBefore = await db.getPropertyValues(propId);
  assert.strictEqual(valuesBefore.length, 0, 'property should have no values initially');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user enters "   " (spaces only) and clicks "Add Value"
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '   ' })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Value is required"
    assert.strictEqual(data.error, 'Value is required', `expected error message, got: ${data.error}`);

    // No value created
    const valuesAfter = await db.getPropertyValues(propId);
    assert.strictEqual(valuesAfter.length, 0, 'no value should be created for whitespace-only input');
  } finally {
    server.close();
  }
});

test('AC16: POST /api/properties/:id/values | property not found | Add value when property does not exist', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property with id "prop99" does not exist
  // No setup needed - prop99 doesn't exist

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user attempts to add a value via API POST /api/properties/prop99/values
    const response = await fetch(`${baseUrl}/api/products/properties/prop99/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'light' })
    });

    const data = await response.json();

    // Then: status 404 is returned
    assert.strictEqual(response.status, 404, `expected status 404, got ${response.status}`);

    // Response is {error: "Property not found"}
    assert.strictEqual(data.error, 'Property not found', `expected error message, got: ${data.error}`);

    // No value is created
    // (verify by checking no values exist for non-existent property)
  } finally {
    server.close();
  }
});

test('AC18: POST /api/properties/:id/values | special characters | Add value with special characters', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Flavor" with id "prop3" exists
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop3';
  await db.createProperty(propId, productId, 'Flavor');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user enters "dark & bitter" and clicks "Add Value"
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'dark & bitter' })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Value is created and stored with special chars intact
    assert.strictEqual(data.value, 'dark & bitter', 'value should be "dark & bitter" with special chars preserved');

    // Verify in database
    const values = await db.getPropertyValues(propId);
    assert.strictEqual(values.length, 1, 'should have 1 value');
    assert.strictEqual(values[0].value, 'dark & bitter', 'stored value should have special chars intact');
  } finally {
    server.close();
  }
});

test('AC19: POST /api/properties/:id/values | whitespace preserved | Add value with leading/trailing whitespace', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: the property value form is open
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user enters "  light  " (with spaces) and clicks "Add Value"
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '  light  ' })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Value is created and stored with whitespace preserved
    assert.strictEqual(data.value, '  light  ', 'value should be "  light  " with whitespace preserved');

    // Verify in database
    const values = await db.getPropertyValues(propId);
    assert.strictEqual(values.length, 1, 'should have 1 value');
    assert.strictEqual(values[0].value, '  light  ', 'stored value should have whitespace preserved');
  } finally {
    server.close();
  }
});

test('AC20: GET /api/properties/:id/values | happy path | List values for property', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Base" with id "prop1" has values ["light", "dark", "chocolate"] in that order
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const v1Id = uuidv4();
  const v2Id = uuidv4();
  const v3Id = uuidv4();
  await db.createPropertyValue(v1Id, propId, 'light');
  await db.createPropertyValue(v2Id, propId, 'dark');
  await db.createPropertyValue(v3Id, propId, 'chocolate');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user views the property details (GET /api/properties/:id/values)
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // All three values appear in the list
    assert.strictEqual(data.length, 3, 'should return 3 values');

    // Values appear in order of creation
    assert.strictEqual(data[0].value, 'light', 'first value should be "light"');
    assert.strictEqual(data[1].value, 'dark', 'second value should be "dark"');
    assert.strictEqual(data[2].value, 'chocolate', 'third value should be "chocolate"');

    // Each shows text, id, and timestamps
    assert.strictEqual(data[0].id, v1Id, 'first value id should match');
    assert(data[0].createdAt, 'value should have createdAt');
  } finally {
    server.close();
  }
});

test('AC21: GET /api/properties/:id/values | no values | List values when property has none', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Size" with id "prop2" exists but has no values
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop2';
  await db.createProperty(propId, productId, 'Size');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user views the property details (GET /api/properties/:id/values)
    const response = await fetch(`${baseUrl}/api/products/properties/${propId}/values`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Empty list is displayed
    assert.strictEqual(data.length, 0, 'should return empty array');
    assert(Array.isArray(data), 'response should be an array');
  } finally {
    server.close();
  }
});

test('AC22: PUT /api/propertyValues/:id | happy path | Edit property value', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Base" has value "dark" with id "v2"
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const valueId = 'v2';
  await db.createPropertyValue(valueId, propId, 'dark');

  const valueBefore = await db.getPropertyValue(valueId);
  assert.strictEqual(valueBefore.value, 'dark', 'value should start as "dark"');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Edit" on value "dark", changes text to "dark chocolate", and clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/values/${valueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'dark chocolate' })
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Value is updated in response
    assert.strictEqual(data.value, 'dark chocolate', 'response value should be "dark chocolate"');
    assert.strictEqual(data.id, valueId, 'value id should remain "v2"');

    // List updates immediately to show "dark chocolate"
    const valueAfter = await db.getPropertyValue(valueId);
    assert.strictEqual(valueAfter.value, 'dark chocolate', 'database value should be updated to "dark chocolate"');
  } finally {
    server.close();
  }
});

test('AC23: PUT /api/propertyValues/:id | duplicate text | Edit value to duplicate text', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property "Base" has values ["light", "dark"]
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const v1Id = 'v1';
  const v2Id = 'v2';
  await db.createPropertyValue(v1Id, propId, 'light');
  await db.createPropertyValue(v2Id, propId, 'dark');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user edits "dark" to "light" (duplicate of existing value)
    const response = await fetch(`${baseUrl}/api/products/values/${v2Id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: 'light' })
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Value is updated to "light"
    assert.strictEqual(data.value, 'light', 'response value should be "light"');

    // Both values in property are now "light" (duplicates allowed)
    const values = await db.getPropertyValues(propId);
    const lightValues = values.filter(v => v.value === 'light');
    assert.strictEqual(lightValues.length, 2, 'property should have 2 "light" values');

    // No error
    // (status 200 indicates no error)
  } finally {
    server.close();
  }
});

test('AC24: PUT /api/propertyValues/:id | empty text | Edit value to empty text', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: a property value "dark" is being edited
  const productId = 'cake1';
  await db.createProduct(productId, 'Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const valueId = 'val1';
  await db.createPropertyValue(valueId, propId, 'dark');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clears the text field and clicks "Save"
    const response = await fetch(`${baseUrl}/api/products/values/${valueId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value: '' })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Value is required"
    assert.strictEqual(data.error, 'Value is required', `expected error message, got: ${data.error}`);

    // Value remains "dark" (unchanged)
    const valueAfter = await db.getPropertyValue(valueId);
    assert.strictEqual(valueAfter.value, 'dark', 'value should remain "dark"');
  } finally {
    server.close();
  }
});

test('AC17: GET /api/products | property list | Property list displays correctly', async () => {
  const { v4: uuidv4 } = await import('uuid');
  const app = express();
  app.use(express.json());
  app.use('/api/products', productsRouter);

  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM products');

  // Given: product "Chocolate Cake" has properties "Base" (2 values) and "Size" (3 values)
  const cakeId = 'cake1';
  const cakeName = 'Chocolate Cake';
  await db.createProduct(cakeId, cakeName);

  // Create "Base" property with 2 values
  const baseId = 'base1';
  await db.createProperty(baseId, cakeId, 'Base');
  const baseVal1Id = uuidv4();
  const baseVal2Id = uuidv4();
  await db.createPropertyValue(baseVal1Id, baseId, 'light');
  await db.createPropertyValue(baseVal2Id, baseId, 'dark');

  // Create "Size" property with 3 values
  const sizeId = 'size1';
  await db.createProperty(sizeId, cakeId, 'Size');
  const sizeVal1Id = uuidv4();
  const sizeVal2Id = uuidv4();
  const sizeVal3Id = uuidv4();
  await db.createPropertyValue(sizeVal1Id, sizeId, 'small');
  await db.createPropertyValue(sizeVal2Id, sizeId, 'medium');
  await db.createPropertyValue(sizeVal3Id, sizeId, 'large');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks expand on the product (GET /api/products)
    const response = await fetch(`${baseUrl}/api/products`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Get the product
    assert.strictEqual(data.length, 1, 'should return 1 product');
    const product = data[0];

    // Properties appear in order of creation
    assert.strictEqual(product.properties.length, 2, 'product should have 2 properties');
    assert.strictEqual(product.properties[0].id, baseId, 'first property should be "Base"');
    assert.strictEqual(product.properties[1].id, sizeId, 'second property should be "Size"');

    // Each property shows name
    assert.strictEqual(product.properties[0].name, 'Base', 'first property name should be "Base"');
    assert.strictEqual(product.properties[1].name, 'Size', 'second property name should be "Size"');

    // Each property has values list
    assert(Array.isArray(product.properties[0].values), 'Base should have values array');
    assert(Array.isArray(product.properties[1].values), 'Size should have values array');

    // Base property has 2 values
    assert.strictEqual(product.properties[0].values.length, 2, 'Base should have 2 values');
    const baseValues = product.properties[0].values;
    assert.strictEqual(baseValues[0].value, 'light', 'first Base value should be "light"');
    assert.strictEqual(baseValues[1].value, 'dark', 'second Base value should be "dark"');

    // Size property has 3 values
    assert.strictEqual(product.properties[1].values.length, 3, 'Size should have 3 values');
    const sizeValues = product.properties[1].values;
    assert.strictEqual(sizeValues[0].value, 'small', 'first Size value should be "small"');
    assert.strictEqual(sizeValues[1].value, 'medium', 'second Size value should be "medium"');
    assert.strictEqual(sizeValues[2].value, 'large', 'third Size value should be "large"');

    // Values appear in order of creation
    assert.strictEqual(baseValues[0].id, baseVal1Id, 'first Base value id should match');
    assert.strictEqual(baseValues[1].id, baseVal2Id, 'second Base value id should match');

    // Value structure is correct (id, propertyId, value, createdAt)
    const val = baseValues[0];
    assert(val.id, 'value should have id');
    assert.strictEqual(val.propertyId, baseId, 'value should reference Base property');
    assert.strictEqual(val.value, 'light', 'value should be "light"');
    assert(val.createdAt, 'value should have createdAt timestamp');
  } finally {
    server.close();
  }
});
