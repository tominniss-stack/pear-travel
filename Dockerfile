# ─────────────────────────────────────────
# Production Dockerfile — Multi-Stage Build
# ─────────────────────────────────────────

# ── Stage 1: Dependencies ──────────────────
FROM node:20-alpine AS deps

RUN apk add --no-cache \
    libc6-compat \
    openssl

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production
# Separate install for build-time dev deps
RUN npm ci


# ── Stage 2: Builder ───────────────────────
FROM node:20-alpine AS builder

RUN apk add --no-cache \
    libc6-compat \
    openssl

WORKDIR /app

# Copy all node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the Next.js application
# DATABASE_URL is required at build time for Prisma; use a placeholder
# for the build stage — the real value is injected at runtime.
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# ── ADDED: Expose the Google Places key to the build step ──
ARG NEXT_PUBLIC_GOOGLE_PLACES_API_KEY
ENV NEXT_PUBLIC_GOOGLE_PLACES_API_KEY=$NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

RUN npm run build


# ── Stage 3: Runner ────────────────────────
FROM node:20-alpine AS runner

RUN apk add --no-cache \
    libc6-compat \
    openssl \
    curl

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Create a non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy only the necessary build artefacts
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

# Copy Next.js build output
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Run migrations then start the production server
CMD ["sh", "-c", "npx prisma migrate deploy && node server.js"]