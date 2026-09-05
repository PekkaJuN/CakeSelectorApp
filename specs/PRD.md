# Product Requirements Document: Cake Selector App

**Version:** 1.0  
**Date:** 2026-09-04  
**Author:** Claude Code  
**Status:** In Development  

---

## 1. Overview

A simple product and order management web application for local use (single machine). Allows creating and managing products (e.g., cakes) with configurable properties (e.g., base type, size), and building orders by selecting products and specifying their properties. All data persists to SQLite. No user accounts, no pricing system (for v1).

**Target User:** Small business owner (e.g., home baker) managing product catalog and customer orders.

---

## 2. Functional Requirements

### 2.1 Product Management

- **Create Product:** Add a new product (e.g., "Chocolate Cake")
- **Edit Product:** Change product name
- **Delete Product:** Remove product from catalog (only if not referenced in any existing orders; deletion is blocked if product is in use)
- **Add Property:** Attach a property to a product (e.g., "Base", "Size", "Frosting")
- **Delete Property:** Remove a property from a product
- **Add Property Value:** Define available values for a property (e.g., "Base" has values ["light", "dark", "chocolate"])
- **Edit Property Value:** Change the text of an existing property value

**Constraints:** 
- Properties are product-specific (e.g., "Base" is only for cakes, not shared across products)
- A product cannot be deleted if it is referenced in any existing order

### 2.2 Order Management

- **Create Order:** Start new order with customer name and add items
- **Add Item to Order:** Select a product, choose property values, add to order
- **View Item in Order:** Display product name and selected property values clearly
- **Edit Item in Order:** Modify property selections for an existing item
- **Remove Item from Order:** Delete an item from the order
- **Edit Order Metadata:** Change customer name
- **Save Order:** Persist order to database with timestamp
- **View Order History:** Display all saved orders (customer name, timestamp, item count)
- **View Order Details:** Click order to see full order details (customer, items, date)
- **Delete Order:** Remove an order from history

**Constraint:** Orders can contain the same product multiple times with different property selections.

**Immutability:** Product changes (name, properties, values) do not retroactively affect existing orders. Orders are snapshots at time of creation.

### 2.3 Data Persistence

- All data saved to SQLite database
- Single file-based database stored locally
- No cloud sync, no backups (local responsibility)

---

## 3. Non-Functional Requirements

- **Deployment:** Single Node.js process running locally on user's machine
- **Access:** Web UI via `http://localhost:3000`
- **Performance:** No latency concerns for local use
- **Scalability:** Not required (single machine, small data volume)
- **Security:** No authentication; data isolation relies on machine access control
- **Usability:** Clear, simple UI; minimal clicks to complete tasks

---

## 4. Data Model

### 4.1 Database Tables

**products**
- `id` (TEXT PRIMARY KEY)
- `name` (TEXT NOT NULL)
- `createdAt` (TIMESTAMP)

**properties**
- `id` (TEXT PRIMARY KEY)
- `productId` (TEXT FK → products.id)
- `name` (TEXT NOT NULL)
- `createdAt` (TIMESTAMP)

**propertyValues**
- `id` (TEXT PRIMARY KEY)
- `propertyId` (TEXT FK → properties.id)
- `value` (TEXT NOT NULL)
- `createdAt` (TIMESTAMP)

**orders**
- `id` (TEXT PRIMARY KEY)
- `customerName` (TEXT NOT NULL)
- `createdAt` (TIMESTAMP)
- `updatedAt` (TIMESTAMP)

**orderItems**
- `id` (TEXT PRIMARY KEY)
- `orderId` (TEXT FK → orders.id)
- `productId` (TEXT FK → products.id)
- `selections` (JSON) — e.g., `{"base": "dark", "size": "large"}`
- `createdAt` (TIMESTAMP)

---

## 5. User Interface

### 5.1 Layout

Single-page application with three main tabs:

#### Tab 1: Products
- List of all products
- For each product:
  - Product name
  - Edit/Delete buttons
  - Expandable section showing properties and values
  - "Add Property" button
  - For each property:
    - Property name
    - List of available values
    - "Add Value" button
    - Delete button per value

#### Tab 2: Order Builder
- **Order form:**
  - Customer name input field
  - "Add Item" button → opens dialog
    - Product dropdown
    - Property pickers (dropdowns for each property)
    - "Add to Cart" button
- **Cart preview:**
  - List of items added to order
  - Each item shows: product name, property selections
  - Per-item: "Edit", "Remove" buttons
- **Save Order** button (bottom) → saves with customer name + items

#### Tab 3: Order History
- List of all orders
  - Customer name
  - Creation date/time
  - Item count
  - Click row to expand → details view
- **Order details modal:**
  - Customer name (editable)
  - List of items (with selections)
  - "Add Item" button (same flow as builder)
  - Per-item: "Edit selections", "Remove" buttons
  - "Save Changes" button
  - "Delete Order" button

### 5.2 Design Goals

- **Clarity:** Clear labels, logical grouping
- **Simplicity:** Minimal visual clutter, no animations
- **Responsiveness:** Works on desktop (primary) and tablet
- **Accessibility:** Semantic HTML, proper form labels

---

## 6. Technical Stack

| Layer       | Technology            | Rationale                           |
|-------------|-----------------------|-------------------------------------|
| Backend     | Node.js + Express.js  | Simple, lightweight, SQLite support |
| Database    | SQLite                | File-based, no setup required       |
| Frontend    | Vanilla JS + HTML/CSS | No build step, minimal dependencies |
| Server      | Express               | REST API for CRUD operations        |

**No build tooling, no frameworks for v1.** Vanilla JavaScript fetch() for API calls.

---

## 7. API Specification (REST)

### Products
```
GET    /api/products                    → List all products
POST   /api/products                    → Create product {name}
PUT    /api/products/:id                → Edit product {name}
DELETE /api/products/:id                → Delete product
```

### Properties
```
GET    /api/products/:productId/properties    → List properties for product
POST   /api/products/:productId/properties    → Create property {name}
DELETE /api/properties/:id                    → Delete property
```

### Property Values
```
POST   /api/properties/:propertyId/values     → Add value {value}
DELETE /api/propertyValues/:id                → Delete value
```

### Orders
```
GET    /api/orders                      → List all orders
POST   /api/orders                      → Create order {customerName, items}
GET    /api/orders/:id                  → Get order details
PUT    /api/orders/:id                  → Edit order {customerName, items}
DELETE /api/orders/:id                  → Delete order
```

---

## 8. Scope

### In Scope (v1)
- Product CRUD with properties and values
- Order creation, viewing, editing, deletion
- SQLite persistence
- Simple web UI
- Local deployment (single machine)

### Out of Scope (Future)
- Pricing / payment
- User accounts / authentication
- Inventory tracking
- Email notifications
- Order templates / presets
- Reporting / analytics
- Cloud sync / multi-device
- Mobile app

---

## 9. Success Criteria

- ✅ User can create products with configurable properties
- ✅ User can create orders with multiple items (same product w/ different selections)
- ✅ User can view, edit, and delete orders
- ✅ All data persists to SQLite and survives restarts
- ✅ UI is intuitive and loads quickly
- ✅ Application runs locally with single `npm start` command

---

## 10. Project Structure

```
MyTrainingApp/
├── specs/
│   └── PRD.md (this file)
├── src/
│   ├── server.js              (Express app, SQLite init)
│   ├── db/
│   │   ├── schema.sql         (Database schema)
│   │   └── db.js              (Database connection & queries)
│   ├── routes/
│   │   ├── products.js        (Product routes)
│   │   ├── properties.js      (Property routes)
│   │   └── orders.js          (Order routes)
│   └── public/
│       ├── index.html         (Main page, tabs)
│       ├── styles.css         (Styling)
│       └── app.js             (Client-side logic)
├── package.json
├── CLAUDE.md
└── README.md
```

---

## 11. Notes

- No env config needed; SQLite file stored in project root or configurable path
- No external API calls
- All state is server-side (SQLite); frontend is stateless
