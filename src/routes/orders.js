import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as db from '../db/db.js';

const router = express.Router();

// GET /api/orders - List all orders
router.get('/', async (req, res) => {
  try {
    const orders = await db.getAllOrders();
    res.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/orders - Create new order
router.post('/', async (req, res) => {
  const { customerName, items } = req.body;

  // Validate customer name
  if (!customerName || customerName.trim() === '') {
    return res.status(400).json({ error: 'Customer name is required' });
  }

  // Validate items
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Order must contain at least one item' });
  }

  try {
    // Validate each item
    for (const item of items) {
      if (!item.productId) {
        return res.status(400).json({ error: 'Product id is required for each item' });
      }

      const product = await db.getProduct(item.productId);
      if (!product) {
        return res.status(404).json({ error: `Product not found: ${item.productId}` });
      }

      // Get required properties for product
      const properties = await db.getPropertiesForProduct(item.productId);
      const requiredPropertyIds = properties.map(p => p.id);

      // Check all required properties have selections
      if (requiredPropertyIds.length > 0) {
        const selections = item.selections || {};
        const selectedPropertyIds = Object.keys(selections);

        // Every required property must be selected
        for (const propId of requiredPropertyIds) {
          if (!selectedPropertyIds.includes(propId)) {
            const propName = properties.find(p => p.id === propId)?.name || 'unknown';
            return res.status(400).json({
              error: `All properties must be selected for ${product.name}`
            });
          }
        }
      }
    }

    // Create order
    const orderId = uuidv4();
    await db.createOrder(orderId, customerName.trim());

    // Create order items
    for (const item of items) {
      const itemId = uuidv4();
      await db.createOrderItem(itemId, orderId, item.productId, item.selections || {});
    }

    // Retrieve and return created order
    const order = await db.getOrder(orderId);
    res.status(201).json(order);
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/orders/:id - Retrieve order
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await db.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PUT /api/orders/:id - Update order (customer name and/or items)
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { customerName, items } = req.body;

  try {
    const order = await db.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Validate customer name if provided
    if (customerName !== undefined && (!customerName || customerName.trim() === '')) {
      return res.status(400).json({ error: 'Customer name is required' });
    }

    // Validate items if provided
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Order must contain at least one item' });
      }

      // Validate each item
      for (const item of items) {
        // Skip existing items (those with id)
        if (item.id) continue;

        if (!item.productId) {
          return res.status(400).json({ error: 'Product id is required for each item' });
        }

        const product = await db.getProduct(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Product not found: ${item.productId}` });
        }

        // Validate properties
        const properties = await db.getPropertiesForProduct(item.productId);
        const requiredPropertyIds = properties.map(p => p.id);

        if (requiredPropertyIds.length > 0) {
          const selections = item.selections || {};
          const selectedPropertyIds = Object.keys(selections);

          for (const propId of requiredPropertyIds) {
            if (!selectedPropertyIds.includes(propId)) {
              const propName = properties.find(p => p.id === propId)?.name || 'unknown';
              return res.status(400).json({
                error: `All properties must be selected for ${product.name}`
              });
            }
          }
        }
      }
    }

    // Update customer name if provided
    if (customerName !== undefined) {
      await db.updateOrder(id, customerName.trim());
    }

    // Update items if provided
    if (items !== undefined) {
      // Delete old items, insert new ones
      await db.deleteAllOrderItems(id);
      for (const item of items) {
        const itemId = item.id || uuidv4();
        await db.createOrderItem(itemId, id, item.productId, item.selections || {});
      }
    }

    // Retrieve and return updated order
    const updatedOrder = await db.getOrder(id);
    res.json(updatedOrder);
  } catch (error) {
    console.error('Error updating order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id/items/:itemId - Remove single item from order
router.delete('/:orderId/items/:itemId', async (req, res) => {
  const { orderId, itemId } = req.params;

  try {
    const order = await db.getOrder(orderId);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    if (order.items.length <= 1) {
      return res.status(400).json({ error: 'Order must contain at least one item' });
    }

    await db.removeOrderItem(itemId);
    res.json({ deleted: itemId });
  } catch (error) {
    console.error('Error deleting order item:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// DELETE /api/orders/:id - Delete entire order
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const order = await db.getOrder(id);
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }

    await db.deleteOrder(id);
    res.json({ deleted: id });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
