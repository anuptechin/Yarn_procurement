# ===========================================================================
# Yarn Procurement Portal — production image
# Multi-stage: build the React client, install server prod deps, assemble a
# lean runtime that serves the built client + API from Express on PORT (4043).
# Connects out to an EXISTING shared Postgres (no DB in this image).
# ===========================================================================

# ---- 1. Build the client (needs dev deps: vite, tailwind) -----------------
FROM node:22-alpine AS client-build
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build          # -> /app/client/dist

# ---- 2. Install server production dependencies ----------------------------
FROM node:22-alpine AS server-deps
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# ---- 3. Runtime -----------------------------------------------------------
FROM node:22-alpine AS runtime
ENV NODE_ENV=production
# wget (busybox) is used by the healthcheck; it's already in alpine.
WORKDIR /app

# Server code + its prod node_modules
COPY server/package*.json ./server/
COPY --from=server-deps /app/server/node_modules ./server/node_modules
COPY server/src ./server/src

# Built client (Express serves /app/client/dist — path resolved in config.js)
COPY --from=client-build /app/client/dist ./client/dist

# Run as the unprivileged 'node' user that the base image already provides
RUN chown -R node:node /app
USER node

EXPOSE 4043
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider "http://127.0.0.1:${PORT:-4043}/api/health" || exit 1

WORKDIR /app/server
CMD ["node", "src/index.js"]
