# =============================================================================
# Fatigue Analysis Tool — Multi-stage Dockerfile
#
# Build stages:
#   1. deps       — Install all dependencies (dev + prod)
#   2. build      — Compile TypeScript packages, build Next.js app
#   3. production — Minimal runtime image with only built artifacts
# =============================================================================
# ---- Stage 1: Base ----
FROM node:20-alpine AS base

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# ---- Stage 2: Dependencies ----
FROM base AS deps

# Copy dependency manifests
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/web/package.json ./apps/web/package.json
COPY packages/core/package.json ./packages/core/package.json
COPY packages/data/package.json ./packages/data/package.json
COPY packages/types/package.json ./packages/types/package.json
COPY packages/ui/package.json ./packages/ui/package.json

# Install ALL dependencies (including devDependencies for build)
RUN pnpm install --frozen-lockfile

# ---- Stage 3: Build ----
FROM base AS build

# Copy dependency node_modules from deps stage
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/data/node_modules ./packages/data/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

# Copy source code
COPY . .

# Fix pnpm store for remaining workspace packages
RUN pnpm store path || true

# Build all packages first (types → core → data → ui)
WORKDIR /app/packages/types
RUN npx tsc
WORKDIR /app/packages/core
RUN npx tsc
WORKDIR /app/packages/data
RUN npx tsc
WORKDIR /app/packages/ui
RUN npx tsc

# Build the Next.js application
WORKDIR /app/apps/web
RUN npx next build

# ---- Stage 4: Production ----
FROM node:20-alpine AS production

# Install pnpm for possible CLI usage
RUN corepack enable && corepack prepare pnpm@9.1.0 --activate

WORKDIR /app

# Create non-root user for security
RUN addgroup --system --gid 1001 fatigue && \
    adduser --system --uid 1001 fatigue

# Copy production dependencies only
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/core/node_modules ./packages/core/node_modules
COPY --from=deps /app/packages/data/node_modules ./packages/data/node_modules
COPY --from=deps /app/packages/types/node_modules ./packages/types/node_modules
COPY --from=deps /app/packages/ui/node_modules ./packages/ui/node_modules

# Copy built artifacts
COPY --from=build /app/packages/types/dist ./packages/types/dist
COPY --from=build /app/packages/core/dist ./packages/core/dist
COPY --from=build /app/packages/data/dist ./packages/data/dist
COPY --from=build /app/packages/ui/dist ./packages/ui/dist

# Copy Next.js standalone output
COPY --from=build /app/apps/web/.next/standalone ./
COPY --from=build /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=build /app/apps/web/public ./apps/web/public

# Copy package manifests for workspace references
COPY apps/web/package.json ./apps/web/package.json
COPY pnpm-workspace.yaml ./
COPY package.json ./

# Copy reference data (if needed at runtime)
COPY data/ ./data/

# Set ownership
RUN chown -R fatigue:fatigue /app

# Switch to non-root user
USER fatigue

# Environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/health || exit 1

# Start the Next.js server (standalone output)
CMD ["node", "apps/web/server.js"]
