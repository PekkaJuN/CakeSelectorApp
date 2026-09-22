#!/bin/sh
set -e

# schema.sql is CREATE TABLE IF NOT EXISTS throughout, so running this on every
# boot costs nothing and means a fresh volume needs no manual init step.
node scripts/init-db.js

exec "$@"
