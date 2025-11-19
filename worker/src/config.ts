import dotenv from 'dotenv';

dotenv.config({ path: process.env.WORKER_ENV_FILE });

const toNumber = (value: string | undefined, fallback: number): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const workerConfig = {
  redisUrl: process.env.REDIS_URL || 'redis://localhost:6379',
  concurrency: toNumber(process.env.WORKER_CONCURRENCY, 3),
  useMockMarkets: process.env.USE_MOCK_MARKETS !== 'false',
  sentryDsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV || 'development',
  jobTimeoutMs: toNumber(process.env.WORKER_JOB_TIMEOUT_MS, 60_000),
  opportunityTtlSeconds: toNumber(process.env.OPPORTUNITY_TTL_SECONDS, 300)
};
