// Integration test setup
import { vi, beforeAll, afterAll, beforeEach } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db_integration';
process.env.REDIS_URL = 'redis://localhost:6379/1';

// Mock external services
vi.mock('@shared/market-adapters', () => ({
  GateIoAdapter: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getMarketPrice: vi.fn().mockResolvedValue({
      price: '0.12345678',
      volume: '10000',
      timestamp: Date.now(),
    }),
  })),
  KyberAdapter: vi.fn().mockImplementation(() => ({
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getMarketPrice: vi.fn().mockResolvedValue({
      price: '0.12456789',
      volume: '10000',
      timestamp: Date.now(),
    }),
  })),
}));

// Mock logger for integration tests
vi.mock('../../src/middleware/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));
