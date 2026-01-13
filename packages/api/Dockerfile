# =============================================================================
# Halcyon RCM API - Production Dockerfile
# HIPAA-Compliant Build
# =============================================================================

FROM node:20-alpine AS base

# Install security updates and openssl for Prisma
RUN apk update && apk upgrade && apk add --no-cache curl openssl

# =============================================================================
# Dependencies Stage
# =============================================================================
FROM base AS deps

WORKDIR /app

# Copy all package files for workspace
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/file-exchange/package.json ./packages/file-exchange/
COPY packages/api/package.json ./packages/api/

# Install all dependencies (skip scripts - we'll run prisma generate in builder)
RUN npm ci --ignore-scripts

# =============================================================================
# Build Stage
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy source files
COPY package.json package-lock.json tsconfig.json ./
COPY packages/core ./packages/core
COPY packages/file-exchange ./packages/file-exchange
COPY packages/api ./packages/api

# Generate Prisma client FIRST (before build)
RUN cd packages/api && npx prisma generate

# Build packages in order
RUN npm run build:core
RUN npm run build:file-exchange
RUN npm run build:api

# =============================================================================
# Production Stage
# =============================================================================
FROM base AS runner

WORKDIR /app

# Copy package files for production install
COPY --from=builder /app/package.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/file-exchange/package.json ./packages/file-exchange/
COPY --from=builder /app/packages/api/package.json ./packages/api/

# Copy Prisma schema (needed for prisma generate)
COPY --from=builder /app/packages/api/prisma ./packages/api/prisma

# Copy built artifacts
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/file-exchange/dist ./packages/file-exchange/dist
COPY --from=builder /app/packages/api/dist ./packages/api/dist

# Install production dependencies and generate Prisma client
RUN npm ci --omit=dev --ignore-scripts && \
    cd packages/api && npx prisma generate

# Create non-root user for security (HIPAA best practice)
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 halcyon && \
    chown -R halcyon:nodejs /app

# Switch to non-root user
USER halcyon

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the server directly (no runtime migrations)
CMD ["node", "packages/api/dist/index.js"]
