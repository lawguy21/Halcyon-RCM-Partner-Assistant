# =============================================================================
# Halcyon RCM API - Production Dockerfile
# HIPAA-Compliant Build
# =============================================================================

FROM node:20-alpine AS base

# Install security updates
RUN apk update && apk upgrade && apk add --no-cache curl

# =============================================================================
# Dependencies Stage
# =============================================================================
FROM base AS deps

WORKDIR /app

# Copy workspace package files
COPY package.json package-lock.json ./
COPY packages/core/package.json ./packages/core/
COPY packages/file-exchange/package.json ./packages/file-exchange/
COPY packages/api/package.json ./packages/api/

# Install all dependencies
RUN npm ci --ignore-scripts

# =============================================================================
# Build Stage
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copy dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/file-exchange/node_modules ./packages/file-exchange/node_modules
COPY --from=deps /app/packages/api/node_modules ./packages/api/node_modules

# Copy source
COPY . .

# Build packages
RUN npm run build:core
RUN npm run build:file-exchange
RUN cd packages/api && npx prisma generate
RUN npm run build:api

# =============================================================================
# Production Stage
# =============================================================================
FROM base AS runner

WORKDIR /app

# Create non-root user for security (HIPAA best practice)
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 halcyon
USER halcyon

# Copy built artifacts
COPY --from=builder --chown=halcyon:nodejs /app/packages/core/dist ./packages/core/dist
COPY --from=builder --chown=halcyon:nodejs /app/packages/core/package.json ./packages/core/
COPY --from=builder --chown=halcyon:nodejs /app/packages/file-exchange/dist ./packages/file-exchange/dist
COPY --from=builder --chown=halcyon:nodejs /app/packages/file-exchange/package.json ./packages/file-exchange/
COPY --from=builder --chown=halcyon:nodejs /app/packages/api/dist ./packages/api/dist
COPY --from=builder --chown=halcyon:nodejs /app/packages/api/prisma ./packages/api/prisma
COPY --from=builder --chown=halcyon:nodejs /app/packages/api/package.json ./packages/api/
COPY --from=builder --chown=halcyon:nodejs /app/packages/api/node_modules ./packages/api/node_modules
COPY --from=builder --chown=halcyon:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=halcyon:nodejs /app/package.json ./

# Environment
ENV NODE_ENV=production
ENV PORT=3001

EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start
CMD ["node", "packages/api/dist/index.js"]
