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
  return dbRun('UPDATE products SET name = ? WHERE id = ?', [name, id]);
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

export default db;
