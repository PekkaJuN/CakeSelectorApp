import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', '..', 'cake-selector.db');

const db = new sqlite3.Database(dbPath);

// Promisify database operations
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

export { dbRun, dbGet, dbAll };

// Products
export const createProduct = (id, name) => {
  return dbRun('INSERT INTO products (id, name) VALUES (?, ?)', [id, name]);
};

export const getProducts = () => {
  return dbAll('SELECT * FROM products ORDER BY createdAt ASC');
};

export const getProduct = (id) => {
  return dbGet('SELECT * FROM products WHERE id = ?', [id]);
};

export const updateProduct = (id, name) => {
  return dbRun('UPDATE products SET name = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [name, id]);
};

export const deleteProduct = (id) => {
  return dbRun('DELETE FROM products WHERE id = ?', [id]);
};

export const productHasOrders = (productId) => {
  return dbGet('SELECT COUNT(*) as count FROM orderItems WHERE productId = ?', [productId]);
};

// Properties
export const createProperty = (id, productId, name) => {
  return dbRun('INSERT INTO properties (id, productId, name) VALUES (?, ?, ?)', [id, productId, name]);
};

export const getPropertiesForProduct = (productId) => {
  return dbAll('SELECT * FROM properties WHERE productId = ? ORDER BY createdAt ASC', [productId]);
};

export const getProperty = (id) => {
  return dbGet('SELECT * FROM properties WHERE id = ?', [id]);
};

export const deleteProperty = (id) => {
  return dbRun('DELETE FROM properties WHERE id = ?', [id]);
};

// Property Values
export const createPropertyValue = (id, propertyId, value) => {
  return dbRun('INSERT INTO propertyValues (id, propertyId, value) VALUES (?, ?, ?)', [id, propertyId, value]);
};

export const getPropertyValues = (propertyId) => {
  return dbAll('SELECT * FROM propertyValues WHERE propertyId = ? ORDER BY createdAt ASC', [propertyId]);
};

export const getPropertyValue = (id) => {
  return dbGet('SELECT * FROM propertyValues WHERE id = ?', [id]);
};

export const updatePropertyValue = (id, value) => {
  return dbRun('UPDATE propertyValues SET value = ? WHERE id = ?', [value, id]);
};

export const deletePropertyValue = (id) => {
  return dbRun('DELETE FROM propertyValues WHERE id = ?', [id]);
};

// Helper: Get full product with properties and values
export const getProductWithDetails = async (productId) => {
  const product = await getProduct(productId);
  if (!product) return null;

  const properties = await getPropertiesForProduct(productId);
  for (const prop of properties) {
    const values = await getPropertyValues(prop.id);
    prop.values = values;
  }
  product.properties = properties;

  return product;
};

// Helper: Get all products with properties and values
export const getAllProductsWithDetails = async () => {
  const products = await getProducts();
  for (const product of products) {
    const properties = await getPropertiesForProduct(product.id);
    for (const prop of properties) {
      const values = await getPropertyValues(prop.id);
      prop.values = values;
    }
    product.properties = properties;
  }
  return products;
};

// Orders
export const createOrder = (id, customerName) => {
  return dbRun('INSERT INTO orders (id, customerName) VALUES (?, ?)', [id, customerName]);
};

export const createOrderItem = (id, orderId, productId, selections) => {
  return dbRun('INSERT INTO orderItems (id, orderId, productId, selections) VALUES (?, ?, ?, ?)',
    [id, orderId, productId, JSON.stringify(selections)]);
};

export const getOrder = async (id) => {
  const order = await dbGet('SELECT * FROM orders WHERE id = ?', [id]);
  if (!order) return null;

  const items = await dbAll('SELECT id, orderId, productId, selections, createdAt FROM orderItems WHERE orderId = ? ORDER BY createdAt ASC', [id]);
  order.items = items.map(item => ({
    ...item,
    selections: JSON.parse(item.selections)
  }));

  return order;
};

export const updateOrder = (id, customerName) => {
  return dbRun('UPDATE orders SET customerName = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?', [customerName, id]);
};

export const removeOrderItem = (itemId) => {
  return dbRun('DELETE FROM orderItems WHERE id = ?', [itemId]);
};

export const deleteAllOrderItems = (orderId) => {
  return dbRun('DELETE FROM orderItems WHERE orderId = ?', [orderId]);
};

export const getAllOrders = async () => {
  const orders = await dbAll('SELECT id, customerName, createdAt, updatedAt FROM orders ORDER BY createdAt DESC');
  for (const order of orders) {
    const itemCount = await dbGet('SELECT COUNT(*) as count FROM orderItems WHERE orderId = ?', [order.id]);
    order.itemCount = itemCount?.count || 0;
  }
  return orders;
};

export const deleteOrder = (id) => {
  return dbRun('DELETE FROM orders WHERE id = ?', [id]);
};

export default db;
