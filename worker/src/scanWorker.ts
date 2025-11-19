import { Queue, Worker, QueueScheduler, QueueEvents, Job } from 'bullmq';
import IORedis from 'ioredis';
import { PrismaClient, Decimal } from '@prisma/client';
import * as Sentry from '@sentry/node';
import {
  MANUAL_SCAN_QUEUE,
  SCHEDULED_SCAN_QUEUE,
  DEAD_LETTER_QUEUE,
  SCAN_JOB_NAME,
  SCHEDULED_SCAN_JOB_ID,
  ScanJobPayload,
  ScanJobResult
} from '@shared/typings/queues';
import { GateIoAdapter, KyberAdapter } from '@shared/market-adapters';
import { workerConfig } from './config.js';
import { workerLogger } from './logger.js';
import {
  normalizePairSymbol,
  calculateSpread,
  calculatePotentialUsdGain,
  clampTradeSize,
  calculateAverageDuration
} from './utils/pricing.js';

interface RuntimeSettings {
  minSpread: Decimal;
  maxInvestment: Decimal;
  scanIntervalSeconds: number;
  opportunityTtlSeconds: number;
  maxConcurrentScans: number;
}

interface AdapterContext {
  gateAdapter: GateIoAdapter;
  kyberAdapter: KyberAdapter;
}

interface ScanWorkerController {
  shutdown: () => Promise<void>;
}

const prisma = new PrismaClient();

export async function startScanWorker(): Promise<ScanWorkerController> {
  const redis = new IORedis(workerConfig.redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });

  const gateAdapter = new GateIoAdapter({
    logger: workerLogger,
    mock: workerConfig.useMockMarkets,
    apiKey: process.env.GATE_API_KEY,
    apiSecret: process.env.GATE_API_SECRET
  });

  const kyberAdapter = new KyberAdapter({
    logger: workerLogger,
    mock: workerConfig.useMockMarkets,
    rpcUrl: process.env.KYBER_RPC_URL
  });

  await Promise.all([gateAdapter.connect(), kyberAdapter.connect()]);

  const adapterContext: AdapterContext = {
    gateAdapter,
    kyberAdapter
  };

  const manualQueue = new Queue<ScanJobPayload>(MANUAL_SCAN_QUEUE, { connection: redis });
  const scheduledQueue = new Queue<ScanJobPayload>(SCHEDULED_SCAN_QUEUE, { connection: redis });
  const deadLetterQueue = new Queue<ScanJobPayload>(DEAD_LETTER_QUEUE, { connection: redis });

  const manualScheduler = new QueueScheduler(MANUAL_SCAN_QUEUE, { connection: redis });
  const scheduledScheduler = new QueueScheduler(SCHEDULED_SCAN_QUEUE, { connection: redis });
  await Promise.all([manualScheduler.waitUntilReady(), scheduledScheduler.waitUntilReady()]);

  const manualEvents = new QueueEvents(MANUAL_SCAN_QUEUE, { connection: redis });
  const scheduledEvents = new QueueEvents(SCHEDULED_SCAN_QUEUE, { connection: redis });

  let scheduledIntervalMs: number | null = null;

  const ensureScheduledJob = async (intervalSeconds: number) => {
    const every = Math.max(intervalSeconds, 15) * 1000;
    if (scheduledIntervalMs === every) {
      return;
    }

    const repeatableJobs = await scheduledQueue.getRepeatableJobs();
    const existing = repeatableJobs.find(job => job.id === SCHEDULED_SCAN_JOB_ID);
    if (existing) {
      await scheduledQueue.removeRepeatableByKey(existing.key);
    }

    await scheduledQueue.add(
      SCAN_JOB_NAME,
      {
        trigger: 'scheduled',
        requestedAt: new Date().toISOString()
      },
      {
        jobId: SCHEDULED_SCAN_JOB_ID,
        repeat: { every },
        removeOnComplete: true,
        removeOnFail: 10
      }
    );
    scheduledIntervalMs = every;
    workerLogger.info('Scheduled scan interval updated', { seconds: every / 1000 });
  };

  const processScanJob = async (job: Job<ScanJobPayload>): Promise<ScanJobResult> => {
    const payload: ScanJobPayload = {
      trigger: job.data?.trigger ?? 'manual',
      requestedAt: job.data?.requestedAt || new Date().toISOString(),
      pairId: job.data?.pairId,
      force: job.data?.force ?? false
    };

    const settings = await fetchRuntimeSettings();
    await ensureScheduledJob(settings.scanIntervalSeconds);
    const closed = await expireStaleOpportunities(settings.opportunityTtlSeconds);
    const result = await executeScan(adapterContext, payload, settings);

    result.closedOpportunities += closed;
    workerLogger.info('Scan job completed', {
      jobId: job.id,
      trigger: payload.trigger,
      pairs: result.pairsScanned,
      opportunities: result.opportunitiesFound,
      durationMs: result.durationMs,
      errors: result.errors.length
    });

    return result;
  };

  const workerOptions = {
    connection: redis,
    concurrency: workerConfig.concurrency,
    lockDuration: workerConfig.jobTimeoutMs
  };

  const manualWorker = new Worker(MANUAL_SCAN_QUEUE, processScanJob, workerOptions);
  const scheduledWorker = new Worker(SCHEDULED_SCAN_QUEUE, processScanJob, workerOptions);

  const handleFailure = async (job: Job<ScanJobPayload> | undefined, error: Error) => {
    workerLogger.error('Scan job failed', {
      jobId: job?.id,
      queue: job?.queueName,
      error: error.message
    });

    await deadLetterQueue.add(
      `${job?.queueName || 'scan'}:failed`,
      {
        ...job?.data,
        failedAt: new Date().toISOString(),
        reason: error.message
      },
      {
        removeOnComplete: 500
      }
    );

    Sentry.captureException(error, {
      extra: { jobId: job?.id, queue: job?.queueName }
    });
  };

  manualWorker.on('failed', (job, err) => handleFailure(job, err as Error));
  scheduledWorker.on('failed', (job, err) => handleFailure(job, err as Error));

  manualWorker.on('error', error => handleFailure(undefined, error));
  scheduledWorker.on('error', error => handleFailure(undefined, error));

  manualWorker.on('completed', (job, result) => {
    workerLogger.debug('Manual scan job result', { jobId: job.id, result });
  });
  scheduledWorker.on('completed', (job, result) => {
    workerLogger.debug('Scheduled scan job result', { jobId: job.id, result });
  });

  manualEvents.on('failed', ({ jobId, failedReason }) => {
    workerLogger.warn('Manual queue event failed', { jobId, failedReason });
  });
  scheduledEvents.on('failed', ({ jobId, failedReason }) => {
    workerLogger.warn('Scheduled queue event failed', { jobId, failedReason });
  });

  const initialSettings = await fetchRuntimeSettings();
  await ensureScheduledJob(initialSettings.scanIntervalSeconds);

  const shutdown = async () => {
    workerLogger.info('Shutting down scan worker...');
    await Promise.all([
      manualWorker.close(),
      scheduledWorker.close(),
      manualQueue.close(),
      scheduledQueue.close(),
      deadLetterQueue.close(),
      manualScheduler.close(),
      scheduledScheduler.close(),
      manualEvents.close(),
      scheduledEvents.close()
    ]);
    await prisma.$disconnect();
    await redis.quit();
    await gateAdapter.disconnect();
    await kyberAdapter.disconnect();
    workerLogger.info('Scan worker shut down complete');
  };

  return { shutdown };
}

async function fetchRuntimeSettings(): Promise<RuntimeSettings> {
  const settings = await prisma.settings.findMany({
    where: {
      key: {
        in: ['min_spread', 'max_investment', 'scan_interval', 'opportunity_expiry', 'max_concurrent_scans']
      }
    }
  });

  const lookup = new Map(settings.map(setting => [setting.key, setting]));

  const minSpread = lookup.get('min_spread')?.minSpread
    ? new Decimal(lookup.get('min_spread')!.minSpread!)
    : new Decimal('1.5');

  const maxInvestment = lookup.get('max_investment')?.maxInvestment
    ? new Decimal(lookup.get('max_investment')!.maxInvestment!)
    : new Decimal('10000');

  const scanInterval = lookup.get('scan_interval')?.scanInterval ?? 60;
  const opportunityTtl = lookup.get('opportunity_expiry')?.scanInterval ?? workerConfig.opportunityTtlSeconds;
  const maxConcurrentScans = lookup.get('max_concurrent_scans')?.scanInterval ?? 5;

  return {
    minSpread,
    maxInvestment,
    scanIntervalSeconds: scanInterval,
    opportunityTtlSeconds: opportunityTtl,
    maxConcurrentScans
  };
}

async function expireStaleOpportunities(ttlSeconds: number): Promise<number> {
  const cutoff = new Date(Date.now() - ttlSeconds * 1000);
  const result = await prisma.opportunity.updateMany({
    where: {
      status: { in: ['PENDING', 'ACTIVE'] },
      OR: [
        { expiresAt: { lte: new Date() } },
        { updatedAt: { lt: cutoff } }
      ]
    },
    data: {
      status: 'EXPIRED'
    }
  });

  return result.count;
}

async function executeScan(
  context: AdapterContext,
  payload: ScanJobPayload,
  settings: RuntimeSettings
): Promise<ScanJobResult> {
  const start = Date.now();
  const limit = payload.pairId
    ? 1
    : payload.force
      ? settings.maxConcurrentScans * 2
      : settings.maxConcurrentScans;

  const pairs = await (payload.pairId
    ? prisma.pair.findMany({ where: { id: payload.pairId, isActive: true } })
    : prisma.pair.findMany({
        where: { isActive: true },
        orderBy: { updatedAt: 'asc' },
        take: limit
      }));

  if (pairs.length === 0) {
    return {
      pairsScanned: 0,
      opportunitiesFound: 0,
      closedOpportunities: 0,
      durationMs: 0,
      errors: []
    };
  }

  let opportunitiesFound = 0;
  const errors: string[] = [];
  const priceSamples: number[] = [];
  const durations: number[] = [];

  for (const pair of pairs) {
    const pairStart = Date.now();
    try {
      const normalizedSymbol = normalizePairSymbol(pair.symbol);
      const [gatePriceRaw, kyberPriceRaw, gateVolumeRaw, kyberVolumeRaw] = await Promise.all([
        context.gateAdapter.getPrice(normalizedSymbol),
        context.kyberAdapter.getPrice(normalizedSymbol),
        context.gateAdapter.getVolume(normalizedSymbol),
        context.kyberAdapter.getVolume(normalizedSymbol)
      ]);

      const gatePrice = new Decimal(gatePriceRaw.toString());
      const kyberPrice = new Decimal(kyberPriceRaw.toString());
      const gateVolume = new Decimal(gateVolumeRaw.toString());
      const kyberVolume = new Decimal(kyberVolumeRaw.toString());

      priceSamples.push(Number(gatePrice.toString()), Number(kyberPrice.toString()));

      const sharedVolume = clampTradeSize(settings.maxInvestment, Decimal.min(gateVolume, kyberVolume));

      opportunitiesFound += await maybeCreateOpportunity(
        pair.id,
        'Gate.io',
        'KyberSwap',
        gatePrice,
        kyberPrice,
        sharedVolume,
        settings
      );

      opportunitiesFound += await maybeCreateOpportunity(
        pair.id,
        'KyberSwap',
        'Gate.io',
        kyberPrice,
        gatePrice,
        sharedVolume,
        settings
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      errors.push(message);
      workerLogger.warn('Failed to scan pair', { pairId: pair.id, symbol: pair.symbol, error: message });
    } finally {
      durations.push(Date.now() - pairStart);
    }
  }

  await recordScanStats({
    pairScope: payload.pairId,
    pairsScanned: pairs.length,
    opportunitiesFound,
    errorCount: errors.length,
    durationMs: Date.now() - start,
    priceSamples
  });

  const avgDuration = durations.length
    ? calculateAverageDuration(durations.slice(0, -1), durations.at(-1) ?? 0)
    : 0;

  workerLogger.debug('Pair scan durations', { avgDurationMs: avgDuration });

  return {
    pairsScanned: pairs.length,
    opportunitiesFound,
    closedOpportunities: 0,
    durationMs: Date.now() - start,
    errors
  };
}

async function maybeCreateOpportunity(
  pairId: number,
  buyExchange: string,
  sellExchange: string,
  buyPrice: Decimal,
  sellPrice: Decimal,
  volume: Decimal,
  settings: RuntimeSettings
): Promise<number> {
  const spread = calculateSpread(buyPrice, sellPrice);
  if (spread.lt(settings.minSpread)) {
    return 0;
  }

  const profitEstimate = calculatePotentialUsdGain(spread, volume);
  const expiresAt = new Date(Date.now() + settings.opportunityTtlSeconds * 1000);

  await prisma.opportunity.create({
    data: {
      pairId,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      spread,
      profitEstimate,
      volume,
      status: 'ACTIVE',
      expiresAt
    }
  });

  workerLogger.info('Opportunity detected', {
    pairId,
    buyExchange,
    sellExchange,
    spread: spread.toFixed(4),
    profit: profitEstimate.toFixed(2)
  });

  return 1;
}

async function recordScanStats({
  pairScope,
  pairsScanned,
  opportunitiesFound,
  errorCount,
  durationMs,
  priceSamples
}: {
  pairScope?: number;
  pairsScanned: number;
  opportunitiesFound: number;
  errorCount: number;
  durationMs: number;
  priceSamples: number[];
}): Promise<void> {
  if (pairsScanned === 0) {
    return;
  }

  const averageScanTime = new Decimal((durationMs / 1000).toFixed(2));
  const minPrice = priceSamples.length ? new Decimal(Math.min(...priceSamples).toFixed(6)) : undefined;
  const maxPrice = priceSamples.length ? new Decimal(Math.max(...priceSamples).toFixed(6)) : undefined;
  const avgPrice = priceSamples.length
    ? new Decimal((priceSamples.reduce((acc, value) => acc + value, 0) / priceSamples.length).toFixed(6))
    : undefined;

  await prisma.scanStats.create({
    data: {
      pairId: pairScope,
      totalScans: pairsScanned,
      successfulScans: pairsScanned - errorCount,
      failedScans: errorCount,
      opportunitiesFound,
      averageScanTime,
      minPrice,
      maxPrice,
      avgPrice,
      lastScanAt: new Date()
    }
  });
}
