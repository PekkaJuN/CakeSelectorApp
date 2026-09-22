import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import productsRouter, { propertiesRouter } from './routes/products.js';
import ordersRouter from './routes/orders.js';
import agentApiRouter from './routes/agent-api.js';
import authRouter from './routes/auth.js';
import { authPolicy } from './middleware/auth.js';
import { loadUsers } from './auth/userStore.js';
import { startSweep } from './auth/sessions.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;
const AUTH_CONFIG_PATH = process.env.AUTH_CONFIG_PATH || 'config/users.json';

// Before anything binds a port: a server that cannot say who its users are must
// not come up at all.
try {
  loadUsers(AUTH_CONFIG_PATH);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}

startSweep();

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// The policy mounts on /api ahead of every router, so a route added later is
// admin-only until someone deliberately widens it.
app.use('/api', authPolicy);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/agent', agentApiRouter);
app.use('/api', propertiesRouter);

// Serve index.html for all other routes (single-page app)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${server.address().port}`);
});
