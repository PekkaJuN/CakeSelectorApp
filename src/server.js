import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';
import * as db from './db/db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// DELETE /api/properties/:id - Delete property and all its values
app.delete('/api/properties/:id', async (req, res) => {
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

// POST /api/properties/:id/values - Add value to property
app.post('/api/properties/:id/values', async (req, res) => {
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

    const { v4: uuidv4 } = await import('uuid');
    const valueId = uuidv4();
    await db.createPropertyValue(valueId, id, value);
    const propValue = await db.getPropertyValue(valueId);
    res.status(201).json(propValue);
  } catch (error) {
    console.error('Error adding value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/propertyValues/:id - Delete property value
app.delete('/api/propertyValues/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const propValue = await db.getPropertyValue(id);
    if (!propValue) {
      return res.status(404).json({ error: 'Value not found' });
    }

    await db.deletePropertyValue(id);
    res.json({ deleted: id });
  } catch (error) {
    console.error('Error deleting value:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve index.html for all other routes (single-page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
