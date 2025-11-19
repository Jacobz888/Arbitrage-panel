# Arbitrage Trading Platform

A monorepo project for crypto arbitrage trading featuring backend API, frontend dashboard, and worker services.

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

Example:

```bash
# Health check
curl http://localhost:3000/health

# Seed database via API
curl http://localhost:3000/api/seed

# Get all pairs
curl http://localhost:3000/api/pairs
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

## Environment Variables

See `backend/.env.example` for a complete list of required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string
- `GATE_API_KEY` - Gate.io API credentials
- `KYBER_RPC_URL` - KyberSwap RPC endpoint
- `SENTRY_DSN` - Sentry error tracking
- `PROM_PORT` - Prometheus metrics port
- `ALLOW_DOCKER_SEED` - Allow `/api/seed` endpoint even when `NODE_ENV=production`
- `SEED_DB_ON_START` - Run Prisma seed script automatically during container startup
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)

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

## Contributing

1. Create a feature branch
2. Make your changes
3. Run linting and tests
4. Submit a pull request

## License

[Your License Here]
