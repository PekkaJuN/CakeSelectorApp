import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import ordersRouter from '../../src/routes/orders.js';
import * as db from '../../src/db/db.js';

// AC1 Test: Display order list
// Given: three orders exist: ord1 (Alice, 2026-09-05T10:00:00Z, 1 item), ord2 (Bob, 2026-09-05T11:00:00Z, 3 items), ord3 (Carol, 2026-09-05T09:00:00Z, 2 items)
// When: user opens the Order History tab (GET /api/orders)
// Then: all three orders appear in list showing: customer name, creation date "2026-09-05 10:00:00", item count; list is sorted by date descending (ord2, ord1, ord3)

test('AC1: GET /api/orders | Display order list | Orders appear with customer name, date, item count, sorted by date descending', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: three orders with specific timestamps
  // ord1: Alice, 2026-09-05T10:00:00Z, 1 item
  const ord1Id = 'ord1';
  const productId1 = 'cake1';
  await db.createProduct(productId1, 'Chocolate Cake');
  await db.dbRun("INSERT INTO orders (id, customerName, createdAt) VALUES (?, ?, ?)",
    [ord1Id, 'Alice', '2026-09-05T10:00:00Z']);
  const ord1Item = uuidv4();
  await db.createOrderItem(ord1Item, ord1Id, productId1, { prop1: 'light' });

  // ord2: Bob, 2026-09-05T11:00:00Z, 3 items
  const ord2Id = 'ord2';
  await db.dbRun("INSERT INTO orders (id, customerName, createdAt) VALUES (?, ?, ?)",
    [ord2Id, 'Bob', '2026-09-05T11:00:00Z']);
  for (let i = 0; i < 3; i++) {
    const itemId = uuidv4();
    await db.createOrderItem(itemId, ord2Id, productId1, { prop1: 'dark' });
  }

  // ord3: Carol, 2026-09-05T09:00:00Z, 2 items
  const ord3Id = 'ord3';
  await db.dbRun("INSERT INTO orders (id, customerName, createdAt) VALUES (?, ?, ?)",
    [ord3Id, 'Carol', '2026-09-05T09:00:00Z']);
  for (let i = 0; i < 2; i++) {
    const itemId = uuidv4();
    await db.createOrderItem(itemId, ord3Id, productId1, { prop1: 'light' });
  }

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: GET /api/orders
    const response = await fetch(`${baseUrl}/api/orders`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const orders = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Response is an array with 3 orders
    assert(Array.isArray(orders), 'response should be an array');
    assert.strictEqual(orders.length, 3, 'should have 3 orders');

    // Orders are sorted by date descending (ord2, ord1, ord3)
    // ord2: 2026-09-05T11:00:00Z (newest)
    // ord1: 2026-09-05T10:00:00Z (middle)
    // ord3: 2026-09-05T09:00:00Z (oldest)
    assert.strictEqual(orders[0].id, 'ord2', 'first order should be ord2 (newest: 11:00)');
    assert.strictEqual(orders[1].id, 'ord1', 'second order should be ord1 (10:00)');
    assert.strictEqual(orders[2].id, 'ord3', 'third order should be ord3 (oldest: 09:00)');

    // First order (ord2): Bob, 2026-09-05T11:00:00Z, 3 items
    assert.strictEqual(orders[0].customerName, 'Bob', 'ord2 customerName should be "Bob"');
    assert.strictEqual(orders[0].itemCount, 3, 'ord2 itemCount should be 3');
    assert(orders[0].createdAt, 'ord2 should have createdAt');

    // Second order (ord1): Alice, 2026-09-05T10:00:00Z, 1 item
    assert.strictEqual(orders[1].customerName, 'Alice', 'ord1 customerName should be "Alice"');
    assert.strictEqual(orders[1].itemCount, 1, 'ord1 itemCount should be 1');
    assert(orders[1].createdAt, 'ord1 should have createdAt');

    // Third order (ord3): Carol, 2026-09-05T09:00:00Z, 2 items
    assert.strictEqual(orders[2].customerName, 'Carol', 'ord3 customerName should be "Carol"');
    assert.strictEqual(orders[2].itemCount, 2, 'ord3 itemCount should be 2');
    assert(orders[2].createdAt, 'ord3 should have createdAt');

  } finally {
    server.close();
  }
});

// AC5 Test: Order details display all item properties
test('AC5: GET /api/orders/:id | item details with properties | Item includes product ID and all property selections', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/orders', ordersRouter);

  // Setup: clean database
  await db.dbRun('DELETE FROM orderItems');
  await db.dbRun('DELETE FROM orders');
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: product "Chocolate Cake" with Base, Size, Frosting properties
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const basePropId = uuidv4();
  await db.createProperty(basePropId, productId, 'Base');
  const darkValId = uuidv4();
  await db.createPropertyValue(darkValId, basePropId, 'dark');

  const sizePropId = uuidv4();
  await db.createProperty(sizePropId, productId, 'Size');
  const largeValId = uuidv4();
  await db.createPropertyValue(largeValId, sizePropId, 'large');

  const frostingPropId = uuidv4();
  await db.createProperty(frostingPropId, productId, 'Frosting');
  const creamCheeseValId = uuidv4();
  await db.createPropertyValue(creamCheeseValId, frostingPropId, 'cream cheese');

  // Create order with item having all three property selections
  const orderId = uuidv4();
  await db.createOrder(orderId, 'Alice');
  const itemId = uuidv4();
  await db.createOrderItem(itemId, orderId, productId, {
    [basePropId]: darkValId,
    [sizePropId]: largeValId,
    [frostingPropId]: creamCheeseValId
  });

  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: fetch order details
    const response = await fetch(`${baseUrl}/api/orders/${orderId}`);
    const order = await response.json();

    // Then: item includes all three property selections
    assert.strictEqual(response.status, 200, 'should return 200');
    assert.strictEqual(order.items.length, 1, 'order should have 1 item');

    const item = order.items[0];
    assert.strictEqual(item.productId, productId, `item should have productId "${productId}"`);
    assert(item.selections, 'item should have selections object');
    assert.strictEqual(Object.keys(item.selections).length, 3, 'item should have 3 properties selected');
    assert.strictEqual(item.selections[basePropId], darkValId, 'Base should be dark');
    assert.strictEqual(item.selections[sizePropId], largeValId, 'Size should be large');
    assert.strictEqual(item.selections[frostingPropId], creamCheeseValId, 'Frosting should be cream cheese');

    // Frontend can use this data to format as: "Chocolate Cake - Base: dark, Size: large, Frosting: cream cheese"
    // by fetching product and property details to map IDs to names
  } finally {
    server.close();
  }
});
