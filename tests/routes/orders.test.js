import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import ordersRouter from '../../src/routes/orders.js';
import * as db from '../../src/db/db.js';

// AC1 Test: Create order with single item
// Given: empty orders table, product "Chocolate Cake" exists with properties "Base" (light, dark) and "Size" (large, medium)
// When: POST /api/orders with {customerName: "Alice", items: [{productId: "cake1", selections: {prop1: "light", prop2: "large"}}]}
// Then: status 201, response contains id (UUID), customerName "Alice", createdAt timestamp, items array with product and selections; order inserted into database

test('AC1: POST /api/orders | happy path | Create order with single item', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product "Chocolate Cake" exists with properties
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  // Property 1: Base (light, dark)
  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseValId1 = uuidv4();
  const baseValId2 = uuidv4();
  await db.createPropertyValue(baseValId1, basePropId, 'light');
  await db.createPropertyValue(baseValId2, basePropId, 'dark');

  // Property 2: Size (large, medium)
  const sizePropId = 'prop2';
  await db.createProperty(sizePropId, productId, 'Size');
  const sizeValId1 = uuidv4();
  const sizeValId2 = uuidv4();
  await db.createPropertyValue(sizeValId1, sizePropId, 'large');
  await db.createPropertyValue(sizeValId2, sizePropId, 'medium');

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user creates order with customer name "Alice" and one item
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: [{
          productId: 'cake1',
          selections: {
            [basePropId]: 'light',
            [sizePropId]: 'large'
          }
        }]
      })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Response contains id (UUID format)
    assert(data.id, 'response should have id');
    assert.match(data.id, /^[0-9a-f-]{36}$/, 'id should be a UUID');

    // Response contains customerName "Alice"
    assert.strictEqual(data.customerName, 'Alice', 'customerName should be "Alice"');

    // Response contains createdAt timestamp
    assert(data.createdAt, 'response should have createdAt timestamp');
    assert(typeof data.createdAt === 'string', 'createdAt should be a string');

    // Response contains items array with 1 item
    assert(Array.isArray(data.items), 'items should be an array');
    assert.strictEqual(data.items.length, 1, 'should have 1 item');

    // Item contains productId and selections
    const item = data.items[0];
    assert.strictEqual(item.productId, 'cake1', 'item productId should be "cake1"');
    assert(item.selections, 'item should have selections');
    assert.strictEqual(item.selections[basePropId], 'light', `selections[${basePropId}] should be "light"`);
    assert.strictEqual(item.selections[sizePropId], 'large', `selections[${sizePropId}] should be "large"`);

    // Verify order is persisted in database
    const savedOrder = await db.getOrder(data.id);
    assert(savedOrder, 'order should be saved in database');
    assert.strictEqual(savedOrder.customerName, 'Alice', 'saved order customerName should be "Alice"');
    assert.strictEqual(savedOrder.items.length, 1, 'saved order should have 1 item');
    assert.strictEqual(savedOrder.items[0].productId, 'cake1', 'saved item productId should be "cake1"');
  } finally {
    server.close();
  }
});

// AC2 Test: Create order with multiple items (same product, different selections)
// Given: empty orders table, product exists with properties
// When: POST /api/orders with 2 items of same product but different property selections
// Then: status 201, response contains order with 2 items, both items have same productId but different selections; both saved to database

test('AC2: POST /api/orders | multiple items same product | Create order with multiple items (same product, different selections)', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product "Chocolate Cake" with properties Base (light, dark) and Size (large, small)
  const productId = 'cake1';
  const productName = 'Chocolate Cake';
  await db.createProduct(productId, productName);

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  const baseVal2 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');
  await db.createPropertyValue(baseVal2, basePropId, 'dark');

  const sizePropId = 'prop2';
  await db.createProperty(sizePropId, productId, 'Size');
  const sizeVal1 = uuidv4();
  const sizeVal2 = uuidv4();
  await db.createPropertyValue(sizeVal1, sizePropId, 'large');
  await db.createPropertyValue(sizeVal2, sizePropId, 'small');

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user creates order with 2 items of same product, different selections
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: [
          {
            productId: 'cake1',
            selections: {
              [basePropId]: 'light',
              [sizePropId]: 'large'
            }
          },
          {
            productId: 'cake1',
            selections: {
              [basePropId]: 'dark',
              [sizePropId]: 'small'
            }
          }
        ]
      })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Order contains 2 items
    assert(Array.isArray(data.items), 'items should be an array');
    assert.strictEqual(data.items.length, 2, 'order should have 2 items');

    // Both items have same productId
    assert.strictEqual(data.items[0].productId, 'cake1', 'first item productId should be "cake1"');
    assert.strictEqual(data.items[1].productId, 'cake1', 'second item productId should be "cake1"');

    // Items have different selections
    assert.strictEqual(data.items[0].selections[basePropId], 'light', 'first item should have Base: light');
    assert.strictEqual(data.items[0].selections[sizePropId], 'large', 'first item should have Size: large');

    assert.strictEqual(data.items[1].selections[basePropId], 'dark', 'second item should have Base: dark');
    assert.strictEqual(data.items[1].selections[sizePropId], 'small', 'second item should have Size: small');

    // Verify both items persisted in database
    const savedOrder = await db.getOrder(data.id);
    assert.strictEqual(savedOrder.items.length, 2, 'saved order should have 2 items');
    assert.strictEqual(savedOrder.items[0].productId, 'cake1', 'first saved item productId should be "cake1"');
    assert.strictEqual(savedOrder.items[1].productId, 'cake1', 'second saved item productId should be "cake1"');
    assert.strictEqual(savedOrder.items[0].selections[basePropId], 'light', 'first saved item Base should be "light"');
    assert.strictEqual(savedOrder.items[1].selections[basePropId], 'dark', 'second saved item Base should be "dark"');
  } finally {
    server.close();
  }
});

// AC3 Test: Create order with multiple items (different products)
// Given: empty orders table, two products exist with properties
// When: POST /api/orders with 2 items of different products
// Then: status 201, response contains order with 2 items with different productIds; both saved to database

test('AC3: POST /api/orders | multiple items different products | Create order with multiple items (different products)', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: two products with properties
  // Product 1: Chocolate Cake with Base property
  const cake1Id = 'cake1';
  await db.createProduct(cake1Id, 'Chocolate Cake');
  const basePropId = 'prop1';
  await db.createProperty(basePropId, cake1Id, 'Base');
  const baseVal1 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');

  // Product 2: Vanilla Cake with Frosting property
  const cake2Id = 'cake2';
  await db.createProduct(cake2Id, 'Vanilla Cake');
  const frostingPropId = 'prop2';
  await db.createProperty(frostingPropId, cake2Id, 'Frosting');
  const frostingVal1 = uuidv4();
  await db.createPropertyValue(frostingVal1, frostingPropId, 'buttercream');

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user creates order with 2 items of different products
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: [
          {
            productId: 'cake1',
            selections: {
              [basePropId]: 'light'
            }
          },
          {
            productId: 'cake2',
            selections: {
              [frostingPropId]: 'buttercream'
            }
          }
        ]
      })
    });

    const data = await response.json();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Order contains 2 items
    assert.strictEqual(data.items.length, 2, 'order should have 2 items');

    // Items have different productIds
    assert.strictEqual(data.items[0].productId, 'cake1', 'first item productId should be "cake1"');
    assert.strictEqual(data.items[1].productId, 'cake2', 'second item productId should be "cake2"');

    // Items have correct selections
    assert.strictEqual(data.items[0].selections[basePropId], 'light', 'first item should have Base: light');
    assert.strictEqual(data.items[1].selections[frostingPropId], 'buttercream', 'second item should have Frosting: buttercream');

    // Verify both items persisted in database
    const savedOrder = await db.getOrder(data.id);
    assert.strictEqual(savedOrder.items.length, 2, 'saved order should have 2 items');
    assert.strictEqual(savedOrder.items[0].productId, 'cake1', 'first saved item should be cake1');
    assert.strictEqual(savedOrder.items[1].productId, 'cake2', 'second saved item should be cake2');
  } finally {
    server.close();
  }
});

// AC4 Test: Add item without selecting all required properties
// Given: product with 2 required properties (Base, Size)
// When: POST /api/orders with item missing one required property selection
// Then: status 400, error "All properties must be selected for Chocolate Cake", no order created

test('AC4: POST /api/orders | incomplete properties | Add item without selecting all required properties', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product with 2 required properties
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');

  const sizePropId = 'prop2';
  await db.createProperty(sizePropId, productId, 'Size');
  const sizeVal1 = uuidv4();
  await db.createPropertyValue(sizeVal1, sizePropId, 'large');

  const orderCountBefore = (await db.getAllOrders()).length;

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user submits order with incomplete properties (missing Size selection)
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: [{
          productId: 'cake1',
          selections: {
            [basePropId]: 'light'
            // Missing sizePropId selection
          }
        }]
      })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message specifies product name
    assert(data.error, 'response should have error message');
    assert.match(data.error, /All properties must be selected/, 'error should mention incomplete properties');
    assert.match(data.error, /Chocolate Cake/, 'error should include product name');

    // No order created
    const orderCountAfter = (await db.getAllOrders()).length;
    assert.strictEqual(orderCountAfter, orderCountBefore, 'no order should be created');
    assert.strictEqual(orderCountAfter, 0, 'database should have no orders');
  } finally {
    server.close();
  }
});

// AC5 Test: Add item with product not selected
// Given: product dropdown is empty (no product selected)
// When: POST /api/orders with item missing productId
// Then: status 400, error "Product id is required for each item", no order created

test('AC5: POST /api/orders | no product selected | Add item with product not selected', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product dropdown empty (no selection)
  // No products need to be created for this test

  const orderCountBefore = (await db.getAllOrders()).length;

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user submits order without selecting a product
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: [{
          // productId is missing
          selections: {}
        }]
      })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message about product requirement
    assert(data.error, 'response should have error message');
    assert.strictEqual(data.error, 'Product id is required for each item', `expected error message, got: ${data.error}`);

    // No order created
    const orderCountAfter = (await db.getAllOrders()).length;
    assert.strictEqual(orderCountAfter, orderCountBefore, 'no order should be created');
    assert.strictEqual(orderCountAfter, 0, 'database should have no orders');
  } finally {
    server.close();
  }
});

// AC6 Test: Remove item from cart
// Given: order with 2 items exists
// When: DELETE /api/orders/:id/items/:itemId to remove first item
// Then: first item deleted from cart; order now displays 1 item

test('AC6: DELETE /api/orders/:orderId/items/:itemId | happy path | Remove item from cart', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product with properties
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  const baseVal2 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');
  await db.createPropertyValue(baseVal2, basePropId, 'dark');

  // Create order with 2 items
  const orderId = uuidv4();
  await db.createOrder(orderId, 'Alice');

  const item1Id = uuidv4();
  await db.createOrderItem(item1Id, orderId, productId, { [basePropId]: 'light' });

  const item2Id = uuidv4();
  await db.createOrderItem(item2Id, orderId, productId, { [basePropId]: 'dark' });

  // Verify order has 2 items
  let order = await db.getOrder(orderId);
  assert.strictEqual(order.items.length, 2, 'order should have 2 items initially');

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Remove" on the first item
    const response = await fetch(`${baseUrl}/api/orders/${orderId}/items/${item1Id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Response confirms deletion
    assert.strictEqual(data.deleted, item1Id, `deleted item id should be ${item1Id}`);

    // First item is deleted from cart
    order = await db.getOrder(orderId);
    assert.strictEqual(order.items.length, 1, 'order should have 1 item after removal');

    // Remaining item is the second one
    assert.strictEqual(order.items[0].id, item2Id, 'remaining item should be item2');
    assert.strictEqual(order.items[0].selections[basePropId], 'dark', 'remaining item should have Base: dark');

    // First item no longer in database
    const deletedItem = await db.dbGet('SELECT * FROM orderItems WHERE id = ?', [item1Id]);
    assert(!deletedItem, 'deleted item should not exist in database');
  } finally {
    server.close();
  }
});

// AC7 Test: Edit item in cart
// Given: order has item "Chocolate Cake - Base: light, Size: large"
// When: user clicks "Edit", changes "Size" to "medium", and clicks "Save"
// Then: item updates to "Chocolate Cake - Base: light, Size: medium"; cart refreshes

test('AC7: PUT /api/orders/:id | edit item selections | Edit item in cart', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product with properties
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');

  const sizePropId = 'prop2';
  await db.createProperty(sizePropId, productId, 'Size');
  const sizeVal1 = uuidv4();
  const sizeVal2 = uuidv4();
  const sizeVal3 = uuidv4();
  await db.createPropertyValue(sizeVal1, sizePropId, 'large');
  await db.createPropertyValue(sizeVal2, sizePropId, 'medium');
  await db.createPropertyValue(sizeVal3, sizePropId, 'small');

  // Create order with 1 item: Base: light, Size: large
  const orderId = uuidv4();
  await db.createOrder(orderId, 'Alice');

  const itemId = uuidv4();
  await db.createOrderItem(itemId, orderId, productId, {
    [basePropId]: 'light',
    [sizePropId]: 'large'
  });

  // Verify initial state
  let order = await db.getOrder(orderId);
  assert.strictEqual(order.items.length, 1, 'order should have 1 item');
  assert.strictEqual(order.items[0].selections[sizePropId], 'large', 'initial Size should be "large"');

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user edits the item, changes Size to "medium"
    const response = await fetch(`${baseUrl}/api/orders/${orderId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items: [{
          id: itemId,
          productId: productId,
          selections: {
            [basePropId]: 'light',
            [sizePropId]: 'medium'
          }
        }]
      })
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Item in response shows updated selections
    assert.strictEqual(data.items.length, 1, 'order should have 1 item');
    assert.strictEqual(data.items[0].selections[basePropId], 'light', 'Base should remain "light"');
    assert.strictEqual(data.items[0].selections[sizePropId], 'medium', 'Size should be updated to "medium"');

    // Cart refreshes in database
    order = await db.getOrder(orderId);
    assert.strictEqual(order.items.length, 1, 'order should have 1 item');
    assert.strictEqual(order.items[0].id, itemId, 'item id should match');
    assert.strictEqual(order.items[0].selections[sizePropId], 'medium', 'stored item Size should be "medium"');
    assert.strictEqual(order.items[0].selections[basePropId], 'light', 'stored item Base should remain "light"');
  } finally {
    server.close();
  }
});

// AC8 Test: Save order with customer name and items
// Given: cart has 1 item and customer name "Alice" is entered
// When: user clicks "Save Order"
// Then: order persisted with id (UUID), customerName, timestamp, items; order appears in list

test('AC8: POST /api/orders | complete save flow | Save order with customer name and items', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product setup
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');

  const sizePropId = 'prop2';
  await db.createProperty(sizePropId, productId, 'Size');
  const sizeVal1 = uuidv4();
  await db.createPropertyValue(sizeVal1, sizePropId, 'large');

  // Record time before save
  const timeBefore = new Date();

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user clicks "Save Order" with customer name and 1 item in cart
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: [{
          productId: productId,
          selections: {
            [basePropId]: 'light',
            [sizePropId]: 'large'
          }
        }]
      })
    });

    const data = await response.json();
    const timeAfter = new Date();

    // Then: status 201
    assert.strictEqual(response.status, 201, `expected status 201, got ${response.status}`);

    // Response contains id (UUID format)
    assert(data.id, 'response should have order id');
    assert.match(data.id, /^[0-9a-f-]{36}$/, 'id should be a UUID');

    // Response contains customerName "Alice"
    assert.strictEqual(data.customerName, 'Alice', 'customerName should be "Alice"');

    // Response contains createdAt timestamp (ISO 8601 format or parseable datetime string)
    assert(data.createdAt, `response should have createdAt, got: ${data.createdAt}`);
    // Verify it's a valid date string
    const createdAtTime = new Date(data.createdAt);
    assert(!isNaN(createdAtTime.getTime()), `createdAt should be a valid date string, got: ${data.createdAt}`);

    // Response contains items array
    assert(Array.isArray(data.items), 'items should be array');
    assert.strictEqual(data.items.length, 1, 'should have 1 item');
    assert.strictEqual(data.items[0].productId, productId, 'item productId should match');

    // Order appears in order list (GET /api/orders)
    const listResponse = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const ordersList = await listResponse.json();

    assert(Array.isArray(ordersList), 'order list should be array');
    assert.strictEqual(ordersList.length, 1, 'order list should have 1 order');
    assert.strictEqual(ordersList[0].id, data.id, 'order id should match in list');
    assert.strictEqual(ordersList[0].customerName, 'Alice', 'customer name should match in list');

    // Order persisted in database with all details
    const savedOrder = await db.getOrder(data.id);
    assert(savedOrder, 'order should be in database');
    assert.strictEqual(savedOrder.id, data.id, 'saved order id should match');
    assert.strictEqual(savedOrder.customerName, 'Alice', 'saved customerName should be "Alice"');
    assert(savedOrder.createdAt, 'saved order should have createdAt');
    assert.strictEqual(savedOrder.items.length, 1, 'saved order should have 1 item');
    assert.strictEqual(savedOrder.items[0].productId, productId, 'saved item productId should match');
    assert.strictEqual(savedOrder.items[0].selections[basePropId], 'light', 'saved item Base should be "light"');
    assert.strictEqual(savedOrder.items[0].selections[sizePropId], 'large', 'saved item Size should be "large"');
  } finally {
    server.close();
  }
});

// AC9 Test: Save order without customer name
// Given: cart has 1 item but customer name field is empty
// When: user clicks "Save Order"
// Then: no order saved; error "Customer name is required"; cart and form remain intact

test('AC9: POST /api/orders | no customer name | Save order without customer name', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product with properties
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');

  const orderCountBefore = (await db.getAllOrders()).length;

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user tries to save order with empty customer name
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '',
        items: [{
          productId: productId,
          selections: {
            [basePropId]: 'light'
          }
        }]
      })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Customer name is required"
    assert.strictEqual(data.error, 'Customer name is required', `expected error message, got: ${data.error}`);

    // No order created
    const orderCountAfter = (await db.getAllOrders()).length;
    assert.strictEqual(orderCountAfter, orderCountBefore, 'no order should be created');
    assert.strictEqual(orderCountAfter, 0, 'database should still have 0 orders');
  } finally {
    server.close();
  }
});

// AC9 variant: whitespace-only customer name
test('AC9 variant: POST /api/orders | whitespace customer name | Save order with whitespace-only name', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product setup
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = 'prop1';
  await db.createProperty(basePropId, productId, 'Base');
  const baseVal1 = uuidv4();
  await db.createPropertyValue(baseVal1, basePropId, 'light');

  const orderCountBefore = (await db.getAllOrders()).length;

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user submits with whitespace-only customer name
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: '   ',
        items: [{
          productId: productId,
          selections: {
            [basePropId]: 'light'
          }
        }]
      })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Customer name is required"
    assert.strictEqual(data.error, 'Customer name is required', `expected error message, got: ${data.error}`);

    // No order created
    const orderCountAfter = (await db.getAllOrders()).length;
    assert.strictEqual(orderCountAfter, orderCountBefore, 'no order should be created');
  } finally {
    server.close();
  }
});

// AC10 Test: Save order with empty cart
// Given: customer name "Alice" is entered but cart is empty
// When: user clicks "Save Order"
// Then: no order saved; error "Order must contain at least one item"; form retains data

test('AC10: POST /api/orders | empty cart | Save order with empty cart', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  const orderCountBefore = (await db.getAllOrders()).length;

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user tries to save order with empty cart (no items)
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice',
        items: []
      })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message "Order must contain at least one item"
    assert.strictEqual(data.error, 'Order must contain at least one item', `expected error message, got: ${data.error}`);

    // No order created
    const orderCountAfter = (await db.getAllOrders()).length;
    assert.strictEqual(orderCountAfter, orderCountBefore, 'no order should be created');
    assert.strictEqual(orderCountAfter, 0, 'database should still have 0 orders');
  } finally {
    server.close();
  }
});

// AC10 variant: missing items field entirely
test('AC10 variant: POST /api/orders | missing items field | Save order without items field', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');

  const orderCountBefore = (await db.getAllOrders()).length;

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: user submits without items field
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerName: 'Alice'
        // items field is missing
      })
    });

    const data = await response.json();

    // Then: status 400
    assert.strictEqual(response.status, 400, `expected status 400, got ${response.status}`);

    // Error message
    assert.strictEqual(data.error, 'Order must contain at least one item', `expected error message, got: ${data.error}`);

    // No order created
    const orderCountAfter = (await db.getAllOrders()).length;
    assert.strictEqual(orderCountAfter, orderCountBefore, 'no order should be created');
  } finally {
    server.close();
  }
});
