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

// Serve index.html for all other routes (single-page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
