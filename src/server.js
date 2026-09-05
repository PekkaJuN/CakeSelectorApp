import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter from './routes/products.js';
import ordersRouter from './routes/orders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Serve index.html for all other routes (single-page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
