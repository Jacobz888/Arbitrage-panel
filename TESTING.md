# Testing Guide

This project uses a comprehensive testing suite with Vitest, Supertest, and Playwright to ensure code quality and reliability.

## Test Structure

```
.
├── backend/
│   ├── tests/
│   │   ├── setup.ts                    # Unit test setup
│   │   ├── utils/decimal.test.ts       # Decimal helper tests
│   │   ├── controllers/                # Controller tests
│   │   ├── services/                   # Service tests
│   │   └── integration/                # Integration tests
│   │       ├── setup.ts                # Integration test setup
│   │       └── scan.test.ts            # Scan endpoint integration tests
│   ├── vitest.config.ts                # Unit test config
│   └── vitest.integration.config.ts    # Integration test config
├── frontend/
│   ├── src/
│   │   ├── components/__tests__/       # Component tests
│   │   └── test/setup.ts               # Test setup
│   └── vitest.config.ts
├── worker/
│   ├── src/
│   │   ├── __tests__/                  # Worker logic tests
│   │   └── utils/pricing.spec.ts       # Pricing utility tests
│   └── vitest.config.ts
├── packages/shared/
│   ├── src/__tests__/                  # Shared utility tests
│   └── vitest.config.ts
└── e2e/
    ├── tests/dashboard.spec.ts         # E2E tests
    └── playwright.config.ts
```

## Testing Frameworks

### Vitest
- **Backend**: Unit and integration tests
- **Frontend**: Component and utility tests
- **Worker**: Logic and utility tests
- **Shared**: Utility tests

### Supertest
- **Backend**: HTTP endpoint integration tests

### Playwright
- **E2E**: Full application flow tests

## Running Tests

### All Tests
```bash
# Run all tests across all packages
pnpm test

# Run all unit tests
pnpm test:unit

# Run integration tests
pnpm test:integration

# Run E2E tests
pnpm test:e2e

# Run with coverage
pnpm test:coverage
```

### Package-Specific Tests

#### Backend
```bash
# Unit tests
pnpm --filter backend test:unit

# Integration tests
pnpm --filter backend test:integration

# Watch mode
pnpm --filter backend test:watch

# Coverage
pnpm --filter backend test:coverage
```

#### Frontend
```bash
# Unit tests
pnpm --filter frontend test:unit

# Watch mode
pnpm --filter frontend test:watch

# UI mode
pnpm --filter frontend test:ui

# Coverage
pnpm --filter frontend test:coverage
```

#### Worker
```bash
# Unit tests
pnpm --filter worker test:unit

# Watch mode
pnpm --filter worker test:watch

# Coverage
pnpm --filter worker test:coverage
```

#### Shared
```bash
# Unit tests
pnpm --filter @shared/typings test:unit

# Watch mode
pnpm --filter @shared/typings test:watch
```

## Test Categories

### 1. Unit Tests

#### Decimal Helpers
Tests for price normalization and calculations with high precision:

- **Backend** (`backend/tests/utils/decimal.test.ts`):
  - `serializeDecimal` / `deserializeDecimal`
  - `formatPrice` / `formatPercentage`
  - `calculateSpread` (Gate.io vs Kyber precision)
  - `calculateProfitEstimate` with fees

- **Shared** (`packages/shared/src/__tests__/decimal.test.ts`):
  - `createDecimal` / `addDecimals` / `subtractDecimals`
  - `multiplyDecimals` / `divideDecimals`
  - `compareDecimals` / `decimalToString`
  - Cross-exchange price normalization scenarios

- **Worker** (`worker/src/utils/pricing.spec.ts`):
  - `normalizePairSymbol`
  - `calculateSpread` with Decimal precision
  - `calculatePotentialUsdGain`
  - `clampTradeSize` / `calculateAverageDuration`

#### Service Tests
Tests for business logic:

- Controller tests with mocked services
- Service tests with mocked Prisma
- Validation logic
- Error handling

#### Component Tests
Frontend React component tests:

- `PeriodSelector` - Period selection functionality
- `StatCard` - Stat display with loading states
- Other UI components with accessibility

### 2. Integration Tests

#### Backend Integration (`backend/tests/integration/scan.test.ts`)
Tests for POST /api/scan endpoint:

- ✅ Returns 202 and enqueues scan job
- ✅ Accepts optional pairId parameter
- ✅ Accepts force flag
- ✅ Validates pairId (positive integer)
- ✅ Validates force (boolean)
- ✅ Handles service errors gracefully
- ✅ Updates queue stats after enqueuing
- ✅ Job status retrieval (GET /api/scan/jobs/:jobId)
- ✅ Job listing (GET /api/scan/jobs)
- ✅ Job cancellation (DELETE /api/scan/jobs/:jobId)
- ✅ Queue statistics (GET /api/scan/queue/stats)

**Setup**: Uses mocked market adapters and Bull queue

### 3. Worker Tests

#### Worker Logic (`worker/src/__tests__/scanWorker.test.ts`)
Tests with dependency injection and mocks:

- **TTL Closing Logic**:
  - Closes opportunities that exceed TTL
  - Keeps opportunities within TTL
  - Handles multiple expired opportunities

- **Rate Limit Handling**:
  - Handles Gate.io rate limits
  - Handles Kyber rate limits
  - Implements exponential backoff

- **Opportunity Detection**:
  - Detects sufficient spreads
  - Ignores insufficient spreads
  - Handles negative spreads

- **Settings & Stats**:
  - Loads runtime settings from database
  - Uses defaults when settings not found
  - Tracks scan statistics accurately

**Setup**: Fully mocked Prisma, adapters, and logger

### 4. E2E Tests

#### Dashboard Flow (`e2e/tests/dashboard.spec.ts`)
Full application tests:

- ✅ Displays stats cards with seeded data
- ✅ Renders opportunities table
- ✅ Shows opportunities with seeded data
- ✅ Manual scan button triggers scan
- ✅ Shows 202 acknowledgment for manual scan
- ✅ Displays error banner when API fails
- ✅ Handles pagination in tables
- ✅ Period selector switches periods
- ✅ Shows loading states initially
- ✅ Accessible keyboard navigation
- ✅ Displays top pairs section
- ✅ Updates stats when scan completes
- ✅ Handles empty state gracefully
- ✅ Responsive layout on mobile

**Prerequisites**:
- Backend running on http://localhost:4000
- Frontend running on http://localhost:3000
- Database seeded with test data
- Redis available

## Running Tests Locally

### 1. Setup
```bash
# Install dependencies
pnpm install

# Generate Prisma client
pnpm backend:db:generate

# Setup test database (optional for unit tests)
DATABASE_URL="postgresql://test:test@localhost:5432/test_db" pnpm backend:db:migrate
```

### 2. Unit Tests
```bash
# Run all unit tests (no external dependencies needed)
pnpm test:unit
```

Unit tests use mocked dependencies and don't require:
- ❌ Database connection
- ❌ Redis connection
- ❌ External APIs

### 3. Integration Tests
```bash
# Start Redis (required)
docker run -d -p 6379:6379 redis:7-alpine

# Run integration tests
pnpm test:integration
```

Integration tests use:
- ✅ Mocked market adapters
- ✅ Mocked Bull queue workers
- ✅ Real Express app with Supertest
- ❌ Real database (Prisma is mocked)

### 4. E2E Tests
```bash
# Start all services with Docker
docker-compose up -d

# Wait for services to be ready
docker-compose exec backend pnpm db:seed

# Run E2E tests
pnpm test:e2e

# Or run with UI
cd e2e
pnpm test:ui

# Clean up
docker-compose down
```

## Running Tests in CI

Tests are designed to run deterministically in CI environments:

### GitHub Actions Example
```yaml
name: Test

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: '20.10.0'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test:unit

  integration-tests:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm build
      - run: pnpm backend:db:migrate
      - run: pnpm backend:db:seed
      - run: pnpm --filter backend dev &
      - run: pnpm --filter frontend dev &
      - run: pnpm --filter worker dev &
      - run: sleep 10
      - run: pnpm test:e2e
```

## Test Coverage

### Viewing Coverage Reports
```bash
# Generate coverage for all packages
pnpm test:coverage

# View HTML reports
open backend/coverage/index.html
open frontend/coverage/index.html
open worker/coverage/index.html
```

### Coverage Targets
- **Backend**: 80%+ for services and utilities
- **Frontend**: 70%+ for components and hooks
- **Worker**: 80%+ for core logic
- **Shared**: 90%+ for utilities

## Debugging Tests

### Vitest
```bash
# Run specific test file
pnpm --filter backend test tests/utils/decimal.test.ts

# Run tests matching pattern
pnpm --filter backend test -t "calculateSpread"

# Watch mode for debugging
pnpm --filter backend test:watch

# UI mode for frontend
pnpm --filter frontend test:ui
```

### Playwright
```bash
# Debug mode (opens inspector)
cd e2e
pnpm test:debug

# Headed mode (see browser)
pnpm test:headed

# Run specific test
pnpm test -- tests/dashboard.spec.ts

# Run specific test by name
pnpm test -- -g "should display stats cards"
```

## Writing Tests

### Unit Test Example
```typescript
import { describe, it, expect } from 'vitest';
import { calculateSpread } from './utils.js';

describe('calculateSpread', () => {
  it('calculates positive spread correctly', () => {
    const result = calculateSpread('100', '105');
    expect(result.toNumber()).toBeCloseTo(5, 5);
  });
});
```

### Integration Test Example
```typescript
import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from './app.js';

describe('POST /api/scan', () => {
  it('returns 202 and enqueues job', async () => {
    const response = await request(app)
      .post('/api/scan')
      .send({})
      .expect(202);

    expect(response.body.success).toBe(true);
  });
});
```

### E2E Test Example
```typescript
import { test, expect } from '@playwright/test';

test('should trigger manual scan', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /scan now/i }).click();
  await expect(page.locator('[role="alert"]')).toBeVisible();
});
```

## Best Practices

1. **Isolation**: Each test should be independent and not rely on other tests
2. **Mocking**: Mock external dependencies (APIs, database) in unit tests
3. **Determinism**: Tests should produce the same results every time
4. **Cleanup**: Clean up resources after tests (connections, temp files)
5. **Descriptive Names**: Use clear, descriptive test names
6. **Arrange-Act-Assert**: Follow AAA pattern in tests
7. **Coverage**: Aim for high coverage but prioritize critical paths
8. **Fast**: Unit tests should be fast (<100ms each)
9. **CI-Ready**: Tests should work in CI without manual intervention
10. **Accessibility**: Test keyboard navigation and ARIA attributes

## Troubleshooting

### Tests Timing Out
- Increase timeout in vitest config or playwright config
- Check for unresolved promises
- Ensure services are running for E2E tests

### Flaky Tests
- Add proper wait conditions in E2E tests
- Use `waitForLoadState('networkidle')` before assertions
- Check for race conditions

### Mock Issues
- Ensure mocks are cleared between tests (`vi.clearAllMocks()`)
- Check mock implementation matches actual interface
- Use `vi.resetModules()` if needed

### Coverage Not Generating
- Ensure `@vitest/coverage-v8` is installed
- Check coverage configuration in vitest config
- Run with `--coverage` flag

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Supertest Documentation](https://github.com/ladjs/supertest)
- [Testing Library Documentation](https://testing-library.com/)
