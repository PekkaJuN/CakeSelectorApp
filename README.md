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
- **Two roles**: An `admin` runs the catalog and the reports; an `orderuser` only takes orders

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript
- **Backend**: Node.js + Express
- **Database**: SQLite
- **Accounts**: Two roles, credentials scrypt-hashed in a git-ignored config file

## First Run

The app refuses to start without a user file, so a fresh clone needs one step
before `npm start` works:

```bash
npm install
cp config/users.example.json config/users.json
npm start
```

The app runs at `http://localhost:3000` and opens on a login screen.

`config/users.example.json` ships two throwaway logins so a fresh clone can get
in immediately:

| Username | Password | Role | Sees |
|---|---|---|---|
| `admin` | `admin123` | `admin` | Products, Order Builder, Order History, Recommendations, Reports |
| `orderuser` | `order123` | `orderuser` | Order Builder, Recommendations |

**Replace both before the app is used for anything real.** The example passwords
are in this repository, so anyone who can read it can log in.

## Managing Users

`config/users.json` is git-ignored and holds no plaintext: each user carries a
scrypt `passwordHash` and its own `salt`. Generate an entry with:

```bash
npm run auth:hash -- <username> <admin|orderuser>
```

It prompts for the password twice with the terminal echo off, rejects anything
under 8 characters, and prints a JSON block to paste into the `users` array. It
never writes the file itself, so it cannot clobber a working user list.

A forgotten password cannot be recovered, only regenerated: run the command
again for that username and replace the `salt` and `passwordHash` fields.

Startup validation is strict on purpose. A missing file, an unknown role, a
duplicate username, a leftover plaintext `password` field or a malformed hash
each stop the server with exit code 1 and a message naming the problem, rather
than starting up unprotected.

Sessions live in memory, so restarting the server logs everyone out.
`npm run dev` restarts on every file save, which makes this a routine event
rather than an edge case.

## Project Status

- ✅ Product Management: Complete
- ✅ Property Management: Complete
- ✅ Order Creation: Complete
- ✅ Order Editing: 18/20 ACs complete
- ✅ Order History: 11/14 ACs complete
