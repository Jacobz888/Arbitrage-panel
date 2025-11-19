# Backend Service

Express.js backend service with Prisma ORM for PostgreSQL database management.

## Quick Start

1. **Install dependencies** (from root):
   ```bash
   pnpm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your database credentials
   ```

3. **Generate Prisma Client**:
   ```bash
   pnpm db:generate
   ```

4. **Run migrations**:
   ```bash
   pnpm db:migrate
   ```

5. **Seed database**:
   ```bash
   pnpm db:seed
   ```

6. **Start development server**:
   ```bash
   pnpm dev
   ```

## Database Commands

### Generate Prisma Client
```bash
pnpm db:generate
```
Generates the Prisma Client from your schema. Run this after any schema changes.

### Create and Apply Migration
```bash
pnpm db:migrate
```
Creates a new migration and applies it to the database. You'll be prompted to name your migration.

### Reset Database
```bash
pnpm db:reset
```
Drops the database, recreates it, runs all migrations, and seeds with sample data. **Warning**: This will delete all data!

### Seed Database
```bash
pnpm db:seed
```
Populates the database with sample data including:
- 2 trading pairs (MANA/USDT, APE/USDT)
- 5 arbitrage opportunities
- Scan statistics
- System settings

### Open Prisma Studio
```bash
pnpm db:studio
```
Opens Prisma Studio (GUI for database management) at http://localhost:5555

## API Endpoints

### Health Check
```bash
GET /health
```
Returns server status and timestamp.

### Seed Database (Dev Only)
```bash
GET /api/seed
```
Seeds the database via API call. Only available in development mode (NODE_ENV !== 'production').

### List Trading Pairs
```bash
GET /api/pairs
```
Returns all trading pairs with opportunity and scan statistics counts.

## Database Schema

### Pair
Trading pair information (e.g., MANA/USDT, APE/USDT).

Fields:
- `id` - Primary key
- `symbol` - Trading pair symbol (unique, indexed)
- `baseAsset` - Base currency (e.g., MANA, APE)
- `quoteAsset` - Quote currency (e.g., USDT)
- `isActive` - Whether the pair is actively monitored
- `createdAt`, `updatedAt` - Timestamps (indexed)

### Opportunity
Arbitrage opportunities detected between exchanges.

Fields:
- `id` - Primary key
- `pairId` - Foreign key to Pair
- `buyExchange`, `sellExchange` - Exchange names
- `buyPrice`, `sellPrice` - Prices as Decimal (20,10)
- `spread` - Profit spread percentage as Decimal (10,6)
- `profitEstimate` - Estimated profit in USDT as Decimal (20,10)
- `volume` - Trading volume as Decimal (20,10)
- `status` - PENDING | ACTIVE | EXECUTED | FAILED | EXPIRED
- `executedAt`, `expiresAt` - Optional timestamps
- `createdAt`, `updatedAt` - Timestamps (indexed)

### ScanStats
Statistics about price scanning operations per pair.

Fields:
- `id` - Primary key
- `pairId` - Foreign key to Pair (optional)
- `totalScans`, `successfulScans`, `failedScans` - Scan counters
- `opportunitiesFound` - Number of opportunities detected
- `lastScanAt` - Timestamp of last scan (indexed)
- `averageScanTime` - Average scan duration in seconds as Decimal (10,2)
- `minPrice`, `maxPrice`, `avgPrice` - Price statistics as Decimal (20,10)
- `createdAt`, `updatedAt` - Timestamps (indexed)

### Settings
System configuration and thresholds.

Fields:
- `id` - Primary key
- `key` - Setting identifier (unique, indexed)
- `value` - Setting value as string
- `description` - Optional description
- `minSpread` - Minimum spread threshold as Decimal (10,6)
- `maxInvestment` - Maximum investment per trade as Decimal (20,10)
- `scanInterval` - Scan frequency in seconds
- `isActive` - Whether setting is active (indexed)
- `createdAt`, `updatedAt` - Timestamps

## Enums

### OpportunityStatus
- `PENDING` - Opportunity detected but not yet acted upon
- `ACTIVE` - Currently being monitored
- `EXECUTED` - Trade was executed
- `FAILED` - Execution failed
- `EXPIRED` - Opportunity expired

### ScanStatus
- `IDLE` - Scanner is idle
- `SCANNING` - Actively scanning
- `ERROR` - Scanner encountered an error

## Environment Variables

See `.env.example` for all required environment variables:

- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for caching
- `GATE_API_KEY`, `GATE_API_SECRET` - Gate.io API credentials
- `KYBER_RPC_URL` - KyberSwap RPC endpoint
- `SENTRY_DSN` - Error tracking
- `PROM_PORT` - Prometheus metrics port
- `NODE_ENV` - Environment (development/production)
- `PORT` - Server port (default: 3000)

## Development

### Build TypeScript
```bash
pnpm build
```

### Run in Development Mode
```bash
pnpm dev
```

### Lint Code
```bash
pnpm lint
```

### Clean Build Artifacts
```bash
pnpm clean
```

## Prisma Configuration

The Prisma schema is located at `prisma/schema.prisma`. After making changes:

1. Generate the client: `pnpm db:generate`
2. Create a migration: `pnpm db:migrate`
3. The migration will be created in `prisma/migrations/`

## Notes

- All monetary values use `Decimal` type for precision
- Indexes are added on frequently queried fields (symbol, timestamps, status)
- Foreign key relationships use cascade deletes where appropriate
- The seed script clears existing data before inserting new samples
- Server includes graceful shutdown handlers for database cleanup
