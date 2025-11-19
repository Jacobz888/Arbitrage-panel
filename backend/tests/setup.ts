// Vitest setup file
import { vi, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock Prisma Client for unit tests
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    $connect: vi.fn().mockResolvedValue(undefined),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    pair: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    opportunity: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    scanStats: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      aggregate: vi.fn(),
    },
    settings: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $queryRaw: vi.fn(),
  })),
  Decimal: class MockDecimal {
    private value: number;
    
    constructor(value: string | number) {
      this.value = Number(value);
    }
    
    toString() {
      return String(this.value);
    }
    
    toNumber() {
      return this.value;
    }
    
    toFixed(decimals: number) {
      return this.value.toFixed(decimals);
    }
    
    equals(other: any) {
      return this.value === Number(other);
    }
    
    minus(other: any) {
      return new MockDecimal(this.value - Number(other));
    }
    
    plus(other: any) {
      return new MockDecimal(this.value + Number(other));
    }
    
    times(other: any) {
      return new MockDecimal(this.value * Number(other));
    }
    
    div(other: any) {
      return new MockDecimal(this.value / Number(other));
    }
    
    gt(other: any) {
      return this.value > Number(other);
    }
    
    gte(other: any) {
      return this.value >= Number(other);
    }
    
    lt(other: any) {
      return this.value < Number(other);
    }
    
    lte(other: any) {
      return this.value <= Number(other);
    }
  },
}));

// Mock logger
vi.mock('../src/middleware/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock metrics
vi.mock('../src/middleware/metrics.js', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: vi.fn().mockResolvedValue('# HELP test_metric Test metric\n'),
  },
  recordDatabaseMetric: vi.fn(),
  updateScanQueueDepth: vi.fn(),
  incrementScanQueue: vi.fn(),
  decrementScanQueue: vi.fn(),
}));
