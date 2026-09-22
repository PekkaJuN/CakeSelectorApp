# syntax=docker/dockerfile:1

# sqlite3 ships prebuilt binaries for linux/glibc, but the toolchain has to be
# here for the times prebuild-install misses and node-gyp compiles instead.
FROM node:22-slim AS build
WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends python3 make g++ \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
RUN npm ci --omit=dev


FROM node:22-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=3000 \
    DB_PATH=/data/cake-selector.db \
    AUTH_CONFIG_PATH=/app/config/users.json

COPY --from=build /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY scripts ./scripts
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# /data is chowned before the volume exists: Docker copies this ownership onto a
# fresh named volume, and an unwritable database file is a silent 500 later.
RUN chmod +x /usr/local/bin/entrypoint.sh \
 && mkdir -p /data \
 && chown node:node /data

USER node
EXPOSE 3000

# The /api routes are all behind the login, so the check hits the static shell.
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "src/server.js"]
