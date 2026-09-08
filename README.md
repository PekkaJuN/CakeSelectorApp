# CakeSelectorApp

Cake selector application for training

## Overview

A simple web application for managing cake products and orders. Users can browse available cakes, customize selections with properties (base, size, frosting, etc.), create orders, and manage order history.

## Features

- **Product Management**: Create and manage cake products with customizable properties
- **Property Management**: Define product-specific properties and their values
- **Order Creation**: Add multiple items to an order with specific property selections
- **Order Editing**: Modify customer name and items in existing orders
- **Order History**: View all orders, search by customer name, and delete orders
- **Local Storage**: All data persists to SQLite database

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: SQLite
- **No user accounts**: Single-machine local application

## Running the App

```bash
npm install
npm start
```

The app runs at `http://localhost:3000`

## Project Status

- ✅ Product Management: Complete
- ✅ Property Management: Complete
- ✅ Order Creation: Complete
- ✅ Order Editing: 18/20 ACs complete
- ✅ Order History: 11/14 ACs complete
