# syntax=docker/dockerfile:1.6

FROM node:20.10.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PNPM_STORE_DIR="/pnpm/.store"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

FROM base AS builder
WORKDIR /app

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY backend ./backend
COPY worker ./worker
COPY packages ./packages

# Install dependencies scoped to worker and shared workspaces
RUN pnpm install --filter worker... --prod=false

# Build shared packages first
RUN pnpm --filter @shared/typings build && \
    pnpm --filter @shared/market-adapters build

# Generate Prisma client (worker uses it) and build worker
RUN pnpm --filter backend db:generate && \
    pnpm --filter worker build

# Prune dev dependencies
RUN pnpm prune --prod

FROM node:20.10.0-slim AS runner
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PNPM_STORE_DIR="/pnpm/.store"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init && rm -rf /var/lib/apt/lists/*

# Copy pnpm store and node_modules
COPY --from=builder /pnpm /pnpm
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace files needed at runtime
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/worker ./worker
COPY --from=builder /app/packages ./packages

WORKDIR /app/worker

ENTRYPOINT ["dumb-init", "--", "node", "dist/index.js"]
