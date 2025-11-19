# syntax=docker/dockerfile:1.6

FROM node:20.10.0-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PNPM_STORE_DIR="/pnpm/.store"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app
RUN corepack enable

FROM base AS builder
WORKDIR /app

ARG VITE_API_BASE_URL=http://localhost:4000/api
ARG VITE_APP_NAME="Arbitrage Dashboard"
ARG VITE_APP_VERSION=1.0.0
ARG VITE_ENABLE_MOCK_API=false

ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_APP_NAME=$VITE_APP_NAME
ENV VITE_APP_VERSION=$VITE_APP_VERSION
ENV VITE_ENABLE_MOCK_API=$VITE_ENABLE_MOCK_API

# Copy workspace manifests
COPY package.json pnpm-workspace.yaml tsconfig.base.json ./
COPY frontend ./frontend
COPY packages ./packages

# Install dependencies scoped to frontend workspace
RUN pnpm install --filter frontend... --prod=false

# Build shared packages needed by frontend
RUN pnpm --filter @shared/typings build

# Build frontend
RUN pnpm --filter frontend build

FROM nginx:1.25-alpine AS runner
WORKDIR /usr/share/nginx/html

# Copy nginx configuration
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets
COPY --from=builder /app/frontend/dist ./

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost:3000/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
