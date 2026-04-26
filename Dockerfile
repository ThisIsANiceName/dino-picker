# ── Stage 1: build the Vite frontend ─────────────────────────────────────────
FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:22-alpine AS runtime

WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY server/ ./server/
COPY --from=build /app/dist ./dist

ENV NODE_ENV=production
ENV PORT=3001
ENV DATA_DIR=/data

VOLUME /data

EXPOSE 3001

CMD ["node", "server/index.js"]
