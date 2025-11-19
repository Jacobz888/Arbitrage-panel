# Arbitrage Trading Platform

A monorepo project for crypto arbitrage trading featuring backend API, frontend dashboard, and worker services.

## Architecture Overview

This repository is a pnpm workspace monorepo containing three primary services and several shared packages that together form the arbitrage trading platform.

### High-Level Flow

1. **Worker** continuously scans supported markets (Gate.io, KyberSwap, and mock adapters) for arbitrage opportunities.
2. The **backend API** exposes REST endpoints, persists data via Prisma/PostgreSQL, dispatches manual scans, and publishes metrics.
3. The **frontend dashboard** consumes the backend API to display live stats, manual scan controls, and opportunity details.
4. Supporting infrastructure includes PostgreSQL (persistent data), Redis (BullMQ queues + caching), Prometheus (metrics scraping), Sentry (error tracking), and optional adapters per environment.

```
[Worker] --(BullMQ jobs, Redis)--> [Backend]
   |                                  |
   |--(Prisma)--> [PostgreSQL]        |--(REST /api, /health, /metrics)--> [Frontend, Monitoring]
                                       \--(Sentry releases + traces)
```

### Service Responsibilities

| Service   | Responsibilities |
|-----------|------------------|
| **backend/** | Express API, Prisma migrations, `/api/scan`, `/api/opportunities`, `/health`, `/metrics`, Prometheus instrumentation, Sentry server SDK, Docker entrypoint, Prisma seeding. |
| **worker/**  | BullMQ-based scanner orchestrating scheduled and manual scans, adapters for Gate.io and KyberSwap (mock vs live), TTL enforcement, stats aggregation, Sentry worker SDK. |
| **frontend/** | Vite + React dashboard with TailwindCSS UI, manual scan button, stats cards, charts, React Query cache, data-testid usage for E2E selectors. |
| **packages/shared/** | Shared DTOs, Decimal helpers, queue constants consumed by all services. |
| **packages/market-adapters/** | Exchange adapters consumed by the worker. |
| **Supporting services** | PostgreSQL (storage), Redis (queues/cache), Prometheus (metrics), Sentry (error monitoring), Playwright E2E harness. |

### Observability & Monitoring

- **Health checks**: `GET /health` verifies dependencies and readiness. Useful for Docker health checks and uptime monitoring.
- **Metrics**: `GET /metrics` exposes Prometheus metrics like `http_request_duration_seconds`, `database_query_duration_seconds`, `scan_queue_depth`, and custom worker gauges.
- **Sentry**: Backend and worker include Sentry SDK hooks, with releases aligned to GitHub SHA (see CI section below). Configure `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, and optional `SENTRY_ENVIRONMENT` for staging/production. No secrets live in the repo; wire them through `.env` files or GitHub Actions secrets.
- **Logging**: All Node services use `pino` and respect `LOG_LEVEL`. Tail logs locally with `pnpm --filter backend dev` or via Docker `docker-compose logs -f backend`.

---

## Quick Start with Docker 🐳

The fastest way to get started is using Docker Compose:

```bash
# Start all services (backend, frontend, worker, postgres, redis, prometheus)
docker-compose up --build
```

This single command:
- Builds all services
- Starts the entire stack
- Runs database migrations
- **Automatically seeds sample data**
- Makes everything accessible at:
  - **Frontend Dashboard**: http://localhost:3000
  - **Backend API**: http://localhost:4000
  - **Prometheus Metrics**: http://localhost:9090

For detailed Docker instructions, see [DOCKER.md](./DOCKER.md).

## Prerequisites

Before you begin, ensure you have the following installed:

**Option A: Docker (Recommended)**
- **Docker Engine** (20.10+)
- **Docker Compose** (2.0+)

**Option B: Local Development**
- **Node.js** (v20.10.0) - Use the version specified in `.nvmrc`
- **pnpm** (v8.15.0) - Package manager
- **PostgreSQL** (v14+) - Database server
- **Redis** (v7+) - Caching and real-time data (optional)

### Setting up Node.js

```bash
# Using nvm (recommended)
nvm install 20.10.0
nvm use 20.10.0

# Verify installation
node --version  # Should output v20.10.0
```

### Setting up pnpm

```bash
npm install -g pnpm@8.15.0

# Verify installation
pnpm --version  # Should output 8.15.0
```

### Setting up PostgreSQL

#### macOS (using Homebrew)

```bash
brew install postgresql@14
brew services start postgresql@14

# Create database
createdb arbitrage_db
```

#### Ubuntu/Debian

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib

# Start service
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database
sudo -u postgres createdb arbitrage_db
```

#### Docker (Alternative)

```bash
docker run --name postgres-arbitrage \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=arbitrage_db \
  -p 5432:5432 \
  -d postgres:14
```

## Installation

1. **Clone the repository**

```bash
git clone <repository-url>
cd <project-directory>
```

2. **Install dependencies**

```bash
pnpm install
```

3. **Set up environment variables**

Copy the example environment file and configure it:

```bash
cd backend
cp .env.example .env
```

Edit `.env` and configure your database connection:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/arbitrage_db?schema=public"
```

Also configure other required variables like API keys, Redis URL, etc.

## Database Setup

You can run database commands from either the root directory or the backend directory.

**From root directory:**
```bash
pnpm backend:db:generate  # Generate Prisma Client
pnpm backend:db:migrate   # Run migrations
pnpm backend:db:seed      # Seed database
pnpm backend:db:reset     # Reset and reseed
pnpm backend:db:studio    # Open Prisma Studio
```

**From backend directory:**
```bash
cd backend
pnpm db:generate  # Generate Prisma Client
pnpm db:migrate   # Run migrations
pnpm db:seed      # Seed database
pnpm db:reset     # Reset and reseed
pnpm db:studio    # Open Prisma Studio
```

### 1. Generate Prisma Client

Generate the Prisma client based on your schema:

```bash
# From root
pnpm backend:db:generate

# Or from backend directory
cd backend && pnpm db:generate
```

### 2. Run Database Migrations

Create and apply database migrations:

```bash
# From root
pnpm backend:db:migrate

# Or from backend directory
cd backend && pnpm db:migrate
```

This will:
- Create all database tables (Pair, Opportunity, ScanStats, Settings)
- Set up indexes for optimized queries
- Apply all pending migrations

You'll be prompted to name your migration. Example: `init` for the first migration.

### 3. Seed the Database

Populate the database with sample data:

```bash
# From root
pnpm backend:db:seed

# Or from backend directory
cd backend && pnpm db:seed
```

This will create:
- **2 trading pairs**: MANA/USDT and APE/USDT
- **5 opportunities** with various statuses (PENDING, ACTIVE, EXECUTED, FAILED)
- **2 scan statistics** records with historical data
- **4 system settings** with default configuration

### Alternative: Reset and Reseed Database

To reset the database and start fresh:

```bash
# From root
pnpm backend:db:reset

# Or from backend directory
cd backend && pnpm db:reset
```

This will:
- Drop the database
- Recreate all tables
- Run migrations
- Automatically seed with sample data

### Database Studio (Optional)

To explore and manage your database with a GUI:

```bash
# From root
pnpm backend:db:studio

# Or from backend directory
cd backend && pnpm db:studio
```

This will open Prisma Studio in your browser at `http://localhost:5555`

## Local Development Workflow

Follow these steps to run everything locally without Docker:

1. **Install dependencies**
   ```bash
   pnpm install
   pnpm backend:db:generate
   ```
2. **Copy env templates**
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   ```
3. **Start infrastructure**
   - PostgreSQL 14+
   - Redis 7+
   - Optional: `docker run --name redis -p 6379:6379 redis:7-alpine`
4. **Run migrations and seed**
   ```bash
   pnpm backend:db:migrate
   pnpm backend:db:seed
   ```
5. **Build once for dev servers that rely on dist output**
   ```bash
   pnpm --filter backend build && pnpm --filter worker build
   ```
6. **Start services (separate terminals)**
   ```bash
   pnpm --filter backend dev
   pnpm --filter worker dev
   pnpm --filter frontend dev
   ```
7. **Trigger manual scans or run tests** using the commands documented below.

> 📌 Tip: `pnpm dev` runs all services in parallel, but make sure backend/worker are built first so `dist/` exists.

## Development

### Running the Backend Server

```bash
# From the backend directory
cd backend
pnpm dev

# Or from the root directory
pnpm dev
```

The backend server will start on `http://localhost:3000`

### Available Endpoints

- **Health Check**: `GET /health` - Check if the server is running
- **Seed Database**: `GET /api/seed` - Seed the database (dev mode only)
- **List Pairs**: `GET /api/pairs` - List all trading pairs with statistics
- **Manual Scan**: `POST /api/scan` - Trigger a manual scan job
- **Opportunities**: `GET /api/opportunities/latest` - Get latest opportunities
- **Metrics**: `GET /metrics` - Prometheus metrics

Example:

```bash
# Health check
curl http://localhost:3000/health

# Seed database via API
curl http://localhost:3000/api/seed

# Get all pairs
curl http://localhost:3000/api/pairs

# Trigger manual scan
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{}'
```

### Triggering Manual Scans

You can trigger manual scans in several ways:

**Option 1: Via Frontend UI (Easiest)**

Open the dashboard at http://localhost:3000 and click the **"Scan Now"** button in the top navigation bar. A toast notification will confirm the scan has been queued.

**Option 2: Via API**

```bash
# Trigger scan for all pairs
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{}'

# Trigger scan for specific pair
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"pairId": 1}'

# Force scan (bypass rate limits)
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d '{"force": true}'
```

**Option 3: Via Docker**

```bash
# From host machine
docker-compose exec backend curl -X POST http://localhost:4000/api/scan \
  -H "Content-Type: application/json" \
  -d '{}'
```

The scan endpoint returns `202 Accepted` immediately and enqueues a BullMQ job that the worker processes asynchronously. Check the worker logs to see scan progress:

```bash
# Docker logs
docker-compose logs -f worker

# Local development
cd worker && pnpm dev
```

## Project Structure

```
.
├── backend/              # Backend API service
│   ├── prisma/
│   │   ├── schema.prisma # Database schema definition
│   │   ├── seed.mjs      # Database seeding script
│   │   └── migrations/   # Database migrations
│   ├── src/
│   │   └── server.ts     # Express server setup
│   ├── .env.example      # Environment variables template
│   └── package.json
├── frontend/             # Frontend dashboard
├── worker/               # Background worker services
├── packages/
│   └── shared/           # Shared types and utilities
├── docker-compose.yml    # Container orchestration stack
├── prometheus.yml        # Prometheus scrape configuration
├── DOCKER.md             # Detailed Docker deployment guide
├── .env.docker.example   # Recommended Docker env vars
├── scripts/
│   └── seed-docker.sh    # Helper to seed via API
└── pnpm-workspace.yaml
```

## Database Schema

### Models

#### Pair
Trading pair information (e.g., MANA/USDT, APE/USDT)
- `symbol` - Trading pair symbol (indexed, unique)
- `baseAsset` - Base currency (e.g., MANA, APE)
- `quoteAsset` - Quote currency (e.g., USDT)
- `isActive` - Whether the pair is actively monitored

#### Opportunity
Arbitrage opportunities detected between exchanges
- `buyExchange`, `sellExchange` - Exchanges to trade on
- `buyPrice`, `sellPrice` - Prices on respective exchanges (Decimal)
- `spread` - Profit spread percentage (Decimal)
- `profitEstimate` - Estimated profit in USDT (Decimal)
- `volume` - Trading volume (Decimal)
- `status` - PENDING, ACTIVE, EXECUTED, FAILED, or EXPIRED
- `executedAt`, `expiresAt` - Timing information

#### ScanStats
Statistics about price scanning operations
- `totalScans`, `successfulScans`, `failedScans` - Scan metrics
- `opportunitiesFound` - Number of opportunities detected
- `lastScanAt` - Timestamp of last scan
- `averageScanTime` - Average scan duration in seconds (Decimal)
- `minPrice`, `maxPrice`, `avgPrice` - Price statistics (Decimal)

#### Settings
System configuration and thresholds
- `key` - Setting identifier (unique)
- `value` - Setting value
- `minSpread`, `maxInvestment` - Decimal configuration values
- `scanInterval` - Scan frequency in seconds

## Available Scripts

### Backend Scripts

```bash
# Development
pnpm dev                 # Start dev server with hot reload
pnpm build              # Build TypeScript to JavaScript

# Database
pnpm db:generate        # Generate Prisma Client
pnpm db:migrate         # Run database migrations
pnpm db:reset           # Reset database and reseed
pnpm db:seed            # Seed database with sample data
pnpm db:studio          # Open Prisma Studio

# Code Quality
pnpm lint               # Run ESLint
pnpm test               # Run tests
pnpm clean              # Clean build artifacts
```

### Workspace Scripts (from root)

```bash
pnpm build              # Build all packages
pnpm dev                # Run all services in parallel
pnpm lint               # Lint all packages
pnpm test               # Test all packages
pnpm clean              # Clean all packages
```

## Testing

This project includes a comprehensive testing suite with unit tests, integration tests, and E2E tests.

### Quick Test Commands

```bash
# Run all tests
pnpm test

# Run unit tests only
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests (requires services to be running)
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

### Test Structure

- **Unit Tests**: Backend, frontend, worker, and shared package utilities
  - Vitest for all unit tests
  - Mocked dependencies
  - Fast execution (<1s per package)

- **Integration Tests**: Backend HTTP endpoints with Supertest
  - POST /api/scan with mocked adapters
  - Validates 202 responses, job creation, error handling
  - Requires Redis

- **Worker Tests**: Background job logic with dependency injection
  - TTL closing logic
  - Rate-limit handling
  - Opportunity detection
  - Fully mocked

- **E2E Tests**: Full application flow with Playwright
  - Dashboard rendering
  - Manual scan button
  - Error handling
  - Pagination
  - Accessibility
  - Requires services running

### Running Tests Locally

```bash
# Unit tests (no dependencies required)
pnpm test:unit

# Integration tests (requires Redis)
docker run -d -p 6379:6379 redis:7-alpine
pnpm test:integration

# E2E tests (requires all services)
docker-compose up -d
pnpm test:e2e
```

For detailed testing documentation, see [TESTING.md](./TESTING.md).

### Continuous Integration (GitHub Actions)

All pull requests and pushes to `main`, `develop`, and feature branches trigger `.github/workflows/ci.yml`. The pipeline:

1. **Lint** – `pnpm lint` across all workspaces.
2. **Unit Tests** – `pnpm test:unit` with vitest JSON logs captured as artifacts.
3. **Integration Tests** – `pnpm test:integration` against a Redis service, also uploading logs.
4. **Coverage Report** – `pnpm test:coverage` aggregates coverage for backend, frontend, worker, and shared packages and uploads artifacts for downstream inspection.
5. **Builds** – Matrix job builds backend, frontend, and worker TypeScript outputs along with Docker image validation via `docker buildx`.
6. **E2E Tests** – Boots Postgres + Redis, migrates/seeds, starts backend/worker/frontend, then runs `xvfb-run -a pnpm test:e2e` (Playwright). Playwright HTML reports and service logs upload on every run.
7. **Summary** – Job-level summary publishes pass/fail status for each stage so failures surface clearly.

The workflow also exposes placeholders for Sentry release variables (`SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`) that you should set as GitHub secrets/variables when enabling release tracking. Coverage archives and unit/integration/e2e test logs are stored as workflow artifacts for seven days, providing easy access when debugging CI failures.

Caching: each job resolves the pnpm store path and uses `actions/cache` so repeat runs are fast even though every job installs dependencies independently (keeps jobs isolated and reliable).

## Environment Variables

⚠️ **NEVER commit `.env` files or secrets to version control.** All `.env` files are gitignored. Copy from `.env.example` templates.

### Backend Environment Variables

See `backend/.env.example` for a complete template. Key variables include:

#### Database & Cache
- `DATABASE_URL` - PostgreSQL connection string (format: `postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public`)
- `REDIS_URL` - Redis connection string (format: `redis://HOST:PORT`)

#### External APIs (Optional)
- `GATE_API_KEY` - Gate.io API key for live exchange data (leave blank to use mock adapter)
- `GATE_API_SECRET` - Gate.io API secret (leave blank to use mock adapter)
- `KYBER_RPC_URL` - KyberSwap RPC endpoint URL (leave blank to use mock adapter)
- `USE_MOCK_MARKETS` - Set to `true` to use mock adapters instead of real APIs (default: `true` in dev)

**Mock vs Live Adapters:**
- **Mock mode** (default): `USE_MOCK_MARKETS=true` or omit API keys. Returns deterministic sample data for development and testing.
- **Live mode**: Set `USE_MOCK_MARKETS=false` and provide valid `GATE_API_KEY`, `GATE_API_SECRET`, and `KYBER_RPC_URL`. The worker will fetch real market data.

> ⚠️ **Security Note**: When deploying to production, store API keys in secrets management (e.g., GitHub Secrets, AWS Secrets Manager, HashiCorp Vault) and never commit them to the repository. The `.env.example` files show placeholders only.

#### Error Tracking & Monitoring
- `SENTRY_DSN` - Sentry DSN for error reporting (optional, leave blank to disable)
- `SENTRY_ENVIRONMENT` - Environment label (e.g., `production`, `staging`, `development`)
- `SENTRY_RELEASE` - Release identifier (e.g., git SHA, set automatically in CI)
- `PROM_PORT` - Prometheus metrics port (default: `9090`)

#### Application Configuration
- `NODE_ENV` - Environment mode (`development`, `production`, `test`)
- `PORT` - Backend server port (default: `3000` for local, `4000` for Docker)
- `LOG_LEVEL` - Logging level: `debug`, `info`, `warn`, `error` (default: `info`)
- `ALLOW_DOCKER_SEED` - Allow `/api/seed` endpoint in production (default: `false`, `true` for Docker dev)
- `SEED_DB_ON_START` - Run Prisma seed script automatically on backend startup (default: `false`)

#### Trading Configuration
- `MIN_SPREAD_THRESHOLD` - Minimum spread percentage to consider an opportunity (default: `1.5`)
- `MAX_INVESTMENT` - Maximum investment per trade in USDT (default: `10000`)
- `SCAN_INTERVAL` - Scan interval in seconds (default: `60`)

#### Worker Configuration
- `WORKER_CONCURRENCY` - Number of concurrent BullMQ jobs (default: `3`)
- `WORKER_JOB_TIMEOUT_MS` - Job timeout in milliseconds (default: `60000`)
- `OPPORTUNITY_TTL_SECONDS` - Opportunity expiry time in seconds (default: `300`)

### Frontend Environment Variables

See `frontend/.env.example` for a complete template:

- `VITE_API_BASE_URL` - Backend API base URL (default: `http://localhost:3000/api` for local, proxied in Docker)
- `VITE_APP_NAME` - Application name displayed in UI (default: `Arbitrage Dashboard`)
- `VITE_APP_VERSION` - Application version (default: `1.0.0`)
- `VITE_ENABLE_MOCK_API` - Use mock API responses in frontend (default: `false`)

### Docker Environment Variables

When running with Docker Compose, use `.env.docker.example` as a starting point:

```bash
cp .env.docker.example .env
```

Docker Compose reads `.env` from the repository root and injects variables into containers. All backend/frontend/worker environment variables apply. See [DOCKER.md](./DOCKER.md) for details.

### Setting Up Environment Files

**For local development:**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your DATABASE_URL, REDIS_URL, etc.

# Frontend
cp frontend/.env.example frontend/.env
# Edit frontend/.env with VITE_API_BASE_URL if needed
```

**For Docker:**
```bash
cp .env.docker.example .env
# Edit .env with any customizations (API keys, thresholds, etc.)
```

**Example: Using Live Gate.io/Kyber Adapters**

1. Obtain API credentials from [Gate.io](https://www.gate.io/myaccount/apiv4keys) and an Infura/Alchemy RPC URL for Ethereum.
2. Set in `backend/.env`:
   ```env
   USE_MOCK_MARKETS=false
   GATE_API_KEY=your_actual_gate_key_here
   GATE_API_SECRET=your_actual_gate_secret_here
   KYBER_RPC_URL=https://mainnet.infura.io/v3/your_project_id
   ```
3. Restart backend and worker for changes to take effect.

⚠️ **Security Reminder**: Never commit the filled-in `.env` files. They are already in `.gitignore`.

## Troubleshooting

### Database Connection Issues

If you encounter database connection errors:

1. Ensure PostgreSQL is running:
   ```bash
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Verify database exists:
   ```bash
   psql -l | grep arbitrage_db
   ```

3. Check DATABASE_URL in `.env` file matches your setup

### Migration Issues

If migrations fail:

1. Reset the database:
   ```bash
   pnpm db:reset
   ```

2. Or manually drop and recreate:
   ```bash
   dropdb arbitrage_db
   createdb arbitrage_db
   pnpm db:migrate
   ```

### Prisma Client Issues

If you get "Prisma Client not generated" errors:

```bash
pnpm db:generate
```

## Testing & CI Expectations for Contributors

Before submitting a pull request:

1. **Run linting**: `pnpm lint` (fixes most auto-fixable issues)
2. **Run unit tests**: `pnpm test:unit` (must pass all tests)
3. **Run integration tests**: `pnpm test:integration` (requires Redis)
4. **Run E2E tests (optional)**: `pnpm test:e2e` (requires full stack)
5. **Build all packages**: `pnpm build` (ensure no TypeScript errors)
6. **Verify Docker builds**: `docker-compose build` (ensure Dockerfiles are valid)

The CI pipeline will automatically run all checks on every push/PR. If any job fails, review the artifacts (coverage reports, Playwright HTML reports, service logs) available in the GitHub Actions UI.

**Coverage Expectations**:
- Backend: 80%+ for services and utilities
- Frontend: 70%+ for components and hooks
- Worker: 80%+ for core logic
- Shared: 90%+ for utilities

See [TESTING.md](./TESTING.md) for detailed guidance on writing tests, running specific test suites, and debugging failures.

See [DOCKER.md](./DOCKER.md) for Docker deployment instructions and troubleshooting.

See `.github/workflows/ci.yml` for the full CI pipeline definition.

## Contributing

1. Create a feature branch from `develop`
2. Make your changes following the project style conventions
3. Run linting and tests locally (see above)
4. Update documentation if adding features or changing APIs
5. Submit a pull request to `develop` branch
6. Address any CI failures or code review feedback

## License

[Your License Here]
