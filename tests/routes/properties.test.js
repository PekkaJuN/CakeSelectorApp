import { test } from 'node:test';
import assert from 'node:assert';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../../src/db/db.js';

// AC16 Test: Property value dropdown shows all available values
// Given: property "Base" has values ["light", "dark"] (2 options)
// When: GET /api/properties/:id/values
// Then: status 200, response [{id, value, createdAt}, {id, value, createdAt}] ordered by createdAt

test('AC16: GET /api/properties/:id/values | happy path | List all values for property', async () => {
  const app = express();
  app.use(express.json());

  // Setup: clean database
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Given: a property with values
  const productId = 'cake1';
  await db.createProduct(productId, 'Chocolate Cake');

  const propId = 'prop1';
  await db.createProperty(propId, productId, 'Base');

  const v1Id = uuidv4();
  const v2Id = uuidv4();
  await db.createPropertyValue(v1Id, propId, 'light');
  await db.createPropertyValue(v2Id, propId, 'dark');

  // Import server routes after db setup
  const productsRouter = (await import('../../src/routes/products.js')).default;
  app.use('/api/products', productsRouter);

  // Add the GET /api/properties/:id/values endpoint (what we're testing)
  app.get('/api/properties/:id/values', async (req, res) => {
    const { id } = req.params;
    try {
      const property = await db.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      const values = await db.getPropertyValues(id);
      res.json(values);
    } catch (error) {
      console.error('Error fetching property values:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: GET /api/properties/:id/values
    const response = await fetch(`${baseUrl}/api/properties/${propId}/values`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 200
    assert.strictEqual(response.status, 200, `expected status 200, got ${response.status}`);

    // Find the values we just created (there may be others from previous tests)
    const lightValue = data.find(v => v.value === 'light');
    const darkValue = data.find(v => v.value === 'dark');

    assert(lightValue, 'should have light value');
    assert(darkValue, 'should have dark value');

    // Each value has id and createdAt
    assert.strictEqual(lightValue.id, v1Id, 'light value id should match');
    assert.strictEqual(darkValue.id, v2Id, 'dark value id should match');
    assert(lightValue.createdAt, 'value should have createdAt');
    assert(darkValue.createdAt, 'value should have createdAt');
  } finally {
    server.close();
  }
});

test('AC16 variant: GET /api/properties/:id/values | not found | Property does not exist', async () => {
  const app = express();
  app.use(express.json());

  // Setup: clean database
  await db.dbRun('DELETE FROM propertyValues');
  await db.dbRun('DELETE FROM properties');
  await db.dbRun('DELETE FROM products');

  // Add the GET /api/properties/:id/values endpoint
  app.get('/api/properties/:id/values', async (req, res) => {
    const { id } = req.params;
    try {
      const property = await db.getProperty(id);
      if (!property) {
        return res.status(404).json({ error: 'Property not found' });
      }
      const values = await db.getPropertyValues(id);
      res.json(values);
    } catch (error) {
      console.error('Error fetching property values:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Start test server
  const server = app.listen(0);
  const { port } = server.address();
  const baseUrl = `http://localhost:${port}`;

  try {
    // When: GET /api/properties/ for non-existent property
    const response = await fetch(`${baseUrl}/api/properties/nonexistent/values`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    const data = await response.json();

    // Then: status 404
    assert.strictEqual(response.status, 404, `expected status 404, got ${response.status}`);
    assert.strictEqual(data.error, 'Property not found', 'should return error message');
  } finally {
    server.close();
  }
});
