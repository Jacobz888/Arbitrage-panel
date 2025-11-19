# E2E Tests

End-to-end tests using Playwright to test the complete application stack.

## Prerequisites

- Backend, Worker, and Frontend services must be running
- Database must be seeded with test data
- Redis must be available

## Running Tests Locally

### Start Services

```bash
# From project root
docker-compose up -d

# Or start services individually
pnpm --filter backend dev
pnpm --filter worker dev
pnpm --filter frontend dev
```

### Run E2E Tests

```bash
# From project root
pnpm test:e2e

# Or from e2e directory
cd e2e
pnpm test

# Run in headed mode (see browser)
pnpm test:headed

# Run in debug mode
pnpm test:debug

# Run with UI mode
pnpm test:ui

# View test report
pnpm test:report
```

## Test Structure

- `tests/dashboard.spec.ts` - Main dashboard functionality tests
  - Stats cards display
  - Opportunities table rendering
  - Manual scan button
  - Error handling
  - Pagination
  - Accessibility

## Running in CI

The tests are configured to run in CI environments with:
- Headless mode
- 2 retry attempts
- HTML and list reporters
- Screenshots on failure
- Trace on first retry

Set `BASE_URL` environment variable to point to your deployed frontend:

```bash
BASE_URL=http://localhost:3000 pnpm test:e2e
```

## Mock Data

Tests expect seeded data to be available. Run the seed command before testing:

```bash
# Using Docker
docker-compose exec backend pnpm db:seed

# Or directly
pnpm --filter backend db:seed
```

## Test Data Attributes

Components should use `data-testid` attributes for reliable selection:

- `data-testid="stat-card"` - Stat cards
- `data-testid="period-selector"` - Period selector
- `data-testid="pair-item"` - Pair items

## Debugging

```bash
# Run specific test
pnpm test -- tests/dashboard.spec.ts

# Run specific test with name pattern
pnpm test -- -g "should display stats cards"

# Debug mode
pnpm test:debug
```

## Configuration

See `playwright.config.ts` for full configuration options:
- Timeout settings
- Browser configurations
- Screenshot/trace settings
- Web server setup
