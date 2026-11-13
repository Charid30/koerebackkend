# ── Construction ─────────────────────────────────────────────
FROM node:24-alpine AS builder
WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ── Production ───────────────────────────────────────────────
FROM node:24-alpine AS runner
WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
RUN npx prisma generate && mkdir -p uploads && chown -R node:node /app

# L'application ne tourne pas en root
USER node

EXPOSE 3000

# Met le schéma de la base à jour au démarrage (refuse les changements destructeurs), puis lance l'API
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main"]
