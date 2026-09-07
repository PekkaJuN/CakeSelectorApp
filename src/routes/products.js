import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db/db.js';

const router = express.Router();

// GET /api/products - List all products with properties and values
router.get('/', async (req, res) => {
  try {
    const products = await db.getAllProductsWithDetails();
    res.json(products);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products - Create new product
router.post('/', async (req, res) => {
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    const id = uuidv4();
    await db.createProduct(id, name.trim());
    const product = await db.getProduct(id);
    product.properties = [];
    res.status(201).json(product);
  } catch (error) {
    console.error('Error creating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/products/:id - Edit product name
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Product name is required' });
  }

  try {
    const product = await db.getProduct(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    await db.updateProduct(id, name.trim());
    const updated = await db.getProduct(id);
    const details = await db.getPropertiesForProduct(id);
    for (const prop of details) {
      prop.values = await db.getPropertyValues(prop.id);
    }
    updated.properties = details;
    res.json(updated);
  } catch (error) {
    console.error('Error updating product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const product = await db.getProduct(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if product is referenced in any order
    const orderRef = await db.productHasOrders(id);
    if (orderRef && orderRef.count > 0) {
      return res.status(409).json({ error: 'Cannot delete product: it is referenced in existing orders' });
    }

    await db.deleteProperty(id);
    await db.deleteProduct(id);
    res.json({ deleted: id });
  } catch (error) {
    console.error('Error deleting product:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/products/:id/properties - Add property to product
router.post('/:id/properties', async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Property name is required' });
  }

  try {
    const product = await db.getProduct(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    const propId = uuidv4();
    await db.createProperty(propId, id, name.trim());
    const property = await db.getProperty(propId);
    property.values = [];
    res.status(201).json(property);
  } catch (error) {
    console.error('Error creating property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/properties/:id - Delete property
router.delete('/properties/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const property = await db.getProperty(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    // Delete all values for this property first
    await db.dbRun('DELETE FROM propertyValues WHERE propertyId = ?', [id]);
    // Then delete the property
    await db.deleteProperty(id);
    res.json({ deleted: id });
  } catch (error) {
    console.error('Error deleting property:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/properties/:id/values - List all values for a property
router.get('/properties/:id/values', async (req, res) => {
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

// POST /api/properties/:id/values - Add value to property
router.post('/properties/:id/values', async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  if (!value || value.trim() === '') {
    return res.status(400).json({ error: 'Value is required' });
  }

  try {
    const property = await db.getProperty(id);
    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    const valueId = uuidv4();
    await db.createPropertyValue(valueId, id, value);
    const propValue = await db.getPropertyValue(valueId);
    res.status(201).json(propValue);
  } catch (error) {
    console.error('Error creating property value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/propertyValues/:id - Edit property value
router.put('/values/:id', async (req, res) => {
  const { id } = req.params;
  const { value } = req.body;

  if (!value || value.trim() === '') {
    return res.status(400).json({ error: 'Value is required' });
  }

  try {
    const propValue = await db.getPropertyValue(id);
    if (!propValue) {
      return res.status(404).json({ error: 'Value not found' });
    }

    await db.updatePropertyValue(id, value);
    const updated = await db.getPropertyValue(id);
    res.json(updated);
  } catch (error) {
    console.error('Error updating property value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/propertyValues/:id - Delete property value (not implemented - values cannot be deleted)
router.delete('/values/:id', async (req, res) => {
  res.status(405).json({ error: 'Property values cannot be deleted, only edited' });
});

export default router;
