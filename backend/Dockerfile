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
COPY frontend ./frontend
COPY worker ./worker
COPY packages ./packages

# Install dependencies scoped to backend and shared workspaces
RUN pnpm install --filter backend... --prod=false

# Build shared packages first
RUN pnpm --filter @shared/typings build && \
    pnpm --filter @shared/market-adapters build

# Generate Prisma client and build backend
RUN pnpm --filter backend db:generate && \
    pnpm --filter backend build

# Prune dev dependencies
RUN pnpm prune --prod

FROM node:20.10.0-slim AS runner
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PNPM_STORE_DIR="/pnpm/.store"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends dumb-init curl && rm -rf /var/lib/apt/lists/*

# Copy pnpm store and node_modules
COPY --from=builder /pnpm /pnpm
COPY --from=builder /app/node_modules ./node_modules

# Copy workspace files needed at runtime
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/pnpm-workspace.yaml ./pnpm-workspace.yaml
COPY --from=builder /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=builder /app/backend ./backend
COPY --from=builder /app/packages ./packages

# Copy entrypoint
COPY backend/docker-entrypoint.sh /app/backend/docker-entrypoint.sh
RUN chmod +x /app/backend/docker-entrypoint.sh

WORKDIR /app/backend
EXPOSE 4000

ENTRYPOINT ["dumb-init", "--", "/app/backend/docker-entrypoint.sh"]
