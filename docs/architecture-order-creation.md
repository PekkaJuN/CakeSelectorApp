# Architecture: Order Creation

## Project Structure

```
src/
├── server.js                  (Updated) Register /api/orders routes
├── db/
│   ├── schema.sql            (Updated) orders, orderItems tables already exist
│   └── db.js                 (Updated) Add order CRUD functions
├── routes/
│   ├── products.js           (Unchanged)
│   └── orders.js             (NEW) Express routes for order creation
└── public/
    ├── index.html            (Updated) Add Order Builder tab
    ├── app.js                (Updated) Add order builder logic
    └── styles.css            (Updated) Style Order Builder tab

(No new packages needed; reuse express, sqlite3, uuid)
```

## File Ownership & Justification

| File | Responsibility | Why |
|------|-----------------|-----|
| `src/db/db.js` | (Updated) Add order query helpers | Centralizes order CRUD; reusable across routes |
| `src/routes/orders.js` | (NEW) POST /api/orders, GET /api/orders/:id | API for order creation and retrieval |
| `src/server.js` | (Updated) Register orders router | Entry point for new routes |
| `src/public/index.html` | (Updated) Add Order Builder tab | New UI section for building orders |
| `src/public/app.js` | (Updated) Add order builder logic | Client-side order creation flow |
| `src/public/styles.css` | (Updated) Style Order Builder | Visual presentation for new tab |

## What Will NOT Be Built (v1)

- ❌ Order history/viewing (deferred to Order History feature)
- ❌ Order editing (deferred to Order Editing feature)
- ❌ Order deletion (deferred to Order History feature)
- ❌ Pricing/totals
- ❌ Email confirmation
- ❌ Stock/inventory checks
- ❌ Order templates

## Data Flow: Order Creation

1. **User opens Order Builder** → page loads → `app.js` → GET `/api/products` (fetch product catalog)
2. **User enters customer name** → form state in memory
3. **User selects product** → dropdown populated via GET `/api/products/:id/properties`
4. **User selects properties** → dropdowns populated via GET `/api/properties/:id/values`
5. **User adds item** → validate selections → add to cart (in-memory array)
6. **User edits/removes items** → modify cart state
7. **User saves order** → POST `/api/orders` {customerName, items} → `routes/orders.js` (validate) → `db/db.js` (insert order + items) → SQLite → response with order id

## Database Usage

**Tables (already exist from Product Management schema):**
- **orders** (id, customerName, createdAt, updatedAt)
- **orderItems** (id, orderId FK, productId FK, selections JSON, createdAt)
- **products, properties, propertyValues** (read-only for dropdown data)

**New queries:**
- `createOrder(id, customerName)` → insert order
- `createOrderItem(id, orderId, productId, selections)` → insert order item
- `getProductsForDropdown()` → products with properties/values for UI
- `getOrder(id)` → retrieve created order for confirmation

## API Endpoints (Order Creation Only)

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/products` | List all products (for dropdown) |
| GET | `/api/products/:productId/properties` | Properties for product (for dropdown) |
| GET | `/api/properties/:propertyId/values` | Values for property (for dropdown) |
| POST | `/api/orders` | Create new order with items |
| GET | `/api/orders/:id` | Retrieve created order details |

## UI Flow: Order Builder Tab

1. **Customer name input** — text field at top
2. **Product selector** — dropdown populated from GET /api/products
3. **Property selectors** — dynamic dropdowns based on selected product
4. **"Add Item" button** — validates selections, adds to cart
5. **Cart preview** — shows items with selections, edit/remove per item
6. **"Save Order" button** — validates customer name + items, calls POST /api/orders

## Error Handling

- Empty customer name → "Customer name is required" (400)
- Missing product selection → "Product is required" (400)
- Incomplete property selections → "All properties must be selected for [product]" (400)
- Empty cart → "Order must contain at least one item" (400)
- Invalid product/property ID → 404 response from API

## No-Op: What's Out of Scope

- Order history/listing (handled by Order History feature)
- Editing saved orders (handled by Order Editing feature)
- Deleting orders (handled by Order History feature)
- Payment/pricing (v2+)
- Multi-currency
- Order discounts/coupons
