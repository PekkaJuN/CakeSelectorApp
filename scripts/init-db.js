import sqlite3 from 'sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'cake-selector.db');
const schemaPath = path.join(__dirname, '..', 'src', 'db', 'schema.sql');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err);
    process.exit(1);
  }
  console.log('Connected to SQLite database:', dbPath);
});

const schema = fs.readFileSync(schemaPath, 'utf-8');

db.exec(schema, (err) => {
  if (err) {
    console.error('Error initializing database:', err);
    process.exit(1);
  }
  console.log('Database schema initialized successfully');
  db.close();
  process.exit(0);
});
