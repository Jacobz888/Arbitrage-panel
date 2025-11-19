# Docker Deployment Guide

This guide provides instructions for deploying the Arbitrage Dashboard application using Docker Compose.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [Database Seeding](#database-seeding)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

- Docker Engine 20.10+ 
- Docker Compose 2.0+
- At least 4GB of free RAM
- At least 10GB of free disk space

## Quick Start

### 1. Clone the repository and navigate to the project directory

```bash
cd /path/to/arbitrage-dashboard
```

### 2. Create environment file (optional)

Copy the example environment file and customize it:

```bash
cp .env.docker.example .env
```

Edit `.env` with your configuration:
- API keys for Gate.io and KyberSwap (optional - uses mock data by default)
- Trading parameters (spread threshold, max investment, etc.)
- Sentry DSN for error tracking (optional)

### 3. Start the entire stack

```bash
docker-compose up --build
```

This command will:
- Build all Docker images (backend, frontend, worker)
- Start PostgreSQL and Redis with persistent volumes
- Run database migrations automatically
- Start all services with health checks
- Launch Prometheus for metrics collection
- **Automatically seed the database** via the one-off `seed` container

The seed container will wait for the backend to be healthy, then call the `/api/seed` endpoint to populate sample data. It runs once and exits.

### 4. Verify the seeding (optional)

Check the seed container logs to confirm successful seeding:

```bash
docker-compose logs seed
```

You should see output indicating successful database seeding.

**Alternative seeding methods:**

**Option A: Using the seed script**

```bash
chmod +x scripts/seed-docker.sh
./scripts/seed-docker.sh
```

**Option B: Manual API call**

```bash
curl http://localhost:4000/api/seed
```

**Option C: Run seed on backend startup**

Set in your `.env` file:
```bash
SEED_DB_ON_START=true
```

Then restart the backend:
```bash
docker-compose restart backend
```

### 5. Access the application

- **Frontend Dashboard**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **API Health Check**: http://localhost:4000/health
- **Prometheus Metrics**: http://localhost:4000/metrics
- **Prometheus UI**: http://localhost:9090

## Architecture

The Docker Compose stack includes the following services:

### Services

| Service    | Port | Description                                      |
|------------|------|--------------------------------------------------|
| frontend   | 3000 | React dashboard served by Nginx                  |
| backend    | 4000 | Express.js API server                            |
| worker     | -    | BullMQ worker for processing scan jobs           |
| postgres   | 5432 | PostgreSQL 16 database                           |
| redis      | 6379 | Redis cache and job queue                        |
| prometheus | 9090 | Metrics collection and monitoring                |
| seed       | -    | One-off container to seed database (exits after) |

### Volumes

Persistent data is stored in Docker volumes:

- `arbitrage-postgres-data` - PostgreSQL database files
- `arbitrage-redis-data` - Redis persistence files
- `arbitrage-prometheus-data` - Prometheus metrics data

### Networks

All services communicate via the `arbitrage-network` bridge network.

## Configuration

### Environment Variables

#### Application Settings

- `NODE_ENV` - Environment mode (`development` or `production`)
- `LOG_LEVEL` - Logging level (`debug`, `info`, `warn`, `error`)

#### External APIs

- `GATE_API_KEY` - Gate.io API key (optional)
- `GATE_API_SECRET` - Gate.io API secret (optional)
- `KYBER_RPC_URL` - KyberSwap RPC endpoint (optional)
- `USE_MOCK_MARKETS` - Use mock data instead of real APIs (`true`/`false`)

#### Trading Configuration

- `MIN_SPREAD_THRESHOLD` - Minimum spread percentage (default: `1.5`)
- `MAX_INVESTMENT` - Maximum investment per trade in USDT (default: `10000`)
- `SCAN_INTERVAL` - Scan interval in seconds (default: `60`)

#### Worker Configuration

- `WORKER_CONCURRENCY` - Number of concurrent jobs (default: `3`)
- `WORKER_JOB_TIMEOUT_MS` - Job timeout in milliseconds (default: `60000`)
- `OPPORTUNITY_TTL_SECONDS` - Opportunity expiry time (default: `300`)

#### Error Tracking

- `SENTRY_DSN` - Sentry DSN for error monitoring (optional)

### Frontend Configuration

- `VITE_API_BASE_URL` - Backend API URL (default: `http://localhost:4000/api`)
- `VITE_APP_NAME` - Application name (default: `Arbitrage Dashboard`)
- `VITE_APP_VERSION` - Application version

## Database Seeding

The application includes sample data for testing and development.

### Seed Data Includes:

- 2 trading pairs (MANA/USDT, APE/USDT)
- 5 sample opportunities with different statuses
- Scan statistics for both pairs
- Default system settings

### When to Seed:

- First-time setup
- After database reset
- For development and testing
- To restore sample data

### Automatic Seeding

To automatically seed on container startup, add to your `.env`:

```bash
SEED_DB_ON_START=true
```

## Monitoring

### Health Checks

All services include health checks:

```bash
# Backend health
curl http://localhost:4000/health

# Frontend health
curl http://localhost:3000/health

# Check service status
docker-compose ps
```

### Prometheus Metrics

Access Prometheus at http://localhost:9090

Available metrics:
- HTTP request duration and count
- Database query performance
- Scan queue depth
- Active connections
- System resource usage

### Logs

View logs for any service:

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f worker
docker-compose logs -f frontend

# Last 100 lines
docker-compose logs --tail=100 backend
```

## Common Operations

### Starting Services

```bash
# Start all services
docker-compose up -d

# Start specific service
docker-compose up -d backend

# Rebuild and start
docker-compose up --build -d
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v
```

### Restarting Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Scaling Services

```bash
# Scale worker to 3 instances
docker-compose up -d --scale worker=3
```

### Database Operations

```bash
# Access PostgreSQL
docker-compose exec postgres psql -U postgres -d arbitrage_db

# Backup database
docker-compose exec postgres pg_dump -U postgres arbitrage_db > backup.sql

# Restore database
cat backup.sql | docker-compose exec -T postgres psql -U postgres arbitrage_db

# Reset database (migrations only)
docker-compose exec backend npx prisma migrate reset --force
```

### Redis Operations

```bash
# Access Redis CLI
docker-compose exec redis redis-cli

# Clear all Redis data
docker-compose exec redis redis-cli FLUSHALL

# Monitor Redis commands
docker-compose exec redis redis-cli MONITOR
```

## Troubleshooting

### Container Won't Start

1. Check logs:
```bash
docker-compose logs <service-name>
```

2. Verify health checks:
```bash
docker-compose ps
```

3. Check resource usage:
```bash
docker stats
```

### Database Connection Issues

1. Ensure PostgreSQL is healthy:
```bash
docker-compose ps postgres
```

2. Check database logs:
```bash
docker-compose logs postgres
```

3. Verify connection string in backend logs

### Worker Not Processing Jobs

1. Check worker logs:
```bash
docker-compose logs worker
```

2. Verify Redis connection:
```bash
docker-compose exec redis redis-cli PING
```

3. Check queue status in Redis:
```bash
docker-compose exec redis redis-cli KEYS "bull:*"
```

### Frontend Can't Reach Backend

1. Check backend health:
```bash
curl http://localhost:4000/health
```

2. Verify nginx configuration:
```bash
docker-compose exec frontend cat /etc/nginx/conf.d/default.conf
```

3. Check network connectivity:
```bash
docker-compose exec frontend ping backend
```

### Port Conflicts

If ports 3000, 4000, 5432, 6379, or 9090 are already in use:

1. Stop conflicting services
2. Or modify ports in `docker-compose.yml`:

```yaml
services:
  backend:
    ports:
      - '4001:4000'  # Map to different host port
```

### Clean Slate Reset

To completely reset everything:

```bash
# Stop and remove everything
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose up --build
```

## Production Deployment

### Security Checklist

- [ ] Change default PostgreSQL credentials
- [ ] Set `NODE_ENV=production`
- [ ] Configure proper CORS origins in `ALLOWED_ORIGINS`
- [ ] Use strong Redis password (add to redis service)
- [ ] Enable HTTPS/TLS (add reverse proxy like Traefik)
- [ ] Set up proper backup strategy
- [ ] Configure log rotation
- [ ] Review and adjust resource limits
- [ ] Enable Sentry error tracking
- [ ] Restrict Prometheus access

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Backup Strategy

1. **Database backups**: Set up automated pg_dump
2. **Volume backups**: Use docker volume backup tools
3. **Configuration backups**: Store `.env` securely
4. **Metrics retention**: Configure Prometheus retention period

## Support

For issues and questions:
- Check logs: `docker-compose logs`
- Review health checks: `docker-compose ps`
- Consult main README.md for application details
- Check Docker and Docker Compose documentation

## License

Same as main project license.
