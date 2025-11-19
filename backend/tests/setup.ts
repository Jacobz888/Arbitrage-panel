// Test setup file
import { PrismaClient } from '@prisma/client';

// Mock Prisma Client for testing
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    pair: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    opportunity: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    scanStats: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      aggregate: jest.fn(),
    },
    settings: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    $queryRaw: jest.fn(),
  })),
  Decimal: jest.fn().mockImplementation((value: string | number) => ({
    toString: () => String(value),
    toNumber: () => Number(value),
    equals: jest.fn().mockReturnValue(false),
    minus: jest.fn().mockReturnThis(),
    plus: jest.fn().mockReturnThis(),
    times: jest.fn().mockReturnThis(),
    div: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnValue(false),
    gte: jest.fn().mockReturnValue(false),
    lt: jest.fn().mockReturnValue(false),
    lte: jest.fn().mockReturnValue(false),
  })),
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_db';

// Mock logger
jest.mock('../src/middleware/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock metrics
jest.mock('../src/middleware/metrics', () => ({
  register: {
    contentType: 'text/plain; version=0.0.4; charset=utf-8',
    metrics: jest.fn().mockResolvedValue('# HELP test_metric Test metric\n'),
  },
  recordDatabaseMetric: jest.fn(),
  updateScanQueueDepth: jest.fn(),
  incrementScanQueue: jest.fn(),
  decrementScanQueue: jest.fn(),
}));

// Global test timeout
jest.setTimeout(10000);