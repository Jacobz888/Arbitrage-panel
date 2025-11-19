import express from 'express';
import cors from 'cors';
import * as Sentry from '@sentry/node';
import { PrismaClient } from '@prisma/client';
import { logger } from './middleware/logger.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { metricsMiddleware } from './middleware/metrics.js';
import { generalRateLimit, scanRateLimit, seedRateLimit } from './middleware/security.js';

// Import services
import { OpportunityService } from './services/opportunityService.js';
import { PairService } from './services/pairService.js';
import { StatsService } from './services/statsService.js';
import { SettingsService } from './services/settingsService.js';
import { ScanQueueService } from './services/scanQueueService.js';
import { GateIoAdapter, KyberAdapter } from '@shared/market-adapters';

// Import controllers
import { OpportunityController } from './controllers/opportunityController.js';
import { PairController } from './controllers/pairController.js';
import { StatsController } from './controllers/statsController.js';
import { SettingsController } from './controllers/settingsController.js';
import { ScanController } from './controllers/scanController.js';
import { HealthController } from './controllers/healthController.js';

// Import routes
import { createOpportunityRoutes } from './routes/opportunities.js';
import { createPairRoutes } from './routes/pairs.js';
import { createStatsRoutes } from './routes/stats.js';
import { createSettingsRoutes } from './routes/settings.js';
import { createScanRoutes } from './routes/scan.js';
import { createHealthRoutes } from './routes/health.js';

export async function createApp(): Promise<express.Application> {
  const app = express();
  const prisma = new PrismaClient();

  // Initialize Sentry if DSN is provided
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0.1,
    });

    // Sentry request handler
    app.use(Sentry.Handlers.requestHandler());
    app.use(Sentry.Handlers.tracingHandler());
  }

  // Basic middleware
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // CORS configuration
  app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
      ? (process.env.ALLOWED_ORIGINS?.split(',') || ['https://yourdomain.com'])
      : true, // Allow all origins in development
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Rate limiting
  app.use(generalRateLimit);

  // Metrics middleware (should be early)
  app.use(metricsMiddleware);

  // Request logging
  app.use((req, res, next) => {
    logger.info('Incoming request', {
      method: req.method,
      url: req.url,
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    next();
  });

  // Initialize market adapters
  const gateAdapter = process.env.USE_MOCK_MARKETS === 'false' && process.env.GATE_API_KEY
    ? new GateIoAdapter(logger, process.env.GATE_API_KEY, process.env.GATE_API_SECRET)
    : new GateIoAdapter(logger); // Mock mode

  const kyberAdapter = process.env.USE_MOCK_MARKETS === 'false' && process.env.KYBER_RPC_URL
    ? new KyberAdapter(logger, process.env.KYBER_RPC_URL)
    : new KyberAdapter(logger); // Mock mode

  // Connect adapters
  try {
    await gateAdapter.connect();
    await kyberAdapter.connect();
    logger.info('Market adapters connected successfully');
  } catch (error) {
    logger.warn('Failed to connect market adapters, using mock mode', { error });
  }

  // Initialize services
  const serviceDependencies = {
    prisma,
    logger,
    metrics: { record: () => {} }, // Placeholder for metrics
    gateAdapter,
    kyberAdapter
  };

  const opportunityService = new OpportunityService(serviceDependencies);
  const pairService = new PairService(serviceDependencies);
  const statsService = new StatsService(serviceDependencies);
  const settingsService = new SettingsService(serviceDependencies);
  const scanQueueService = new ScanQueueService(serviceDependencies);
  await scanQueueService.initialize();

  // Initialize controllers
  const opportunityController = new OpportunityController(opportunityService);
  const pairController = new PairController(pairService);
  const statsController = new StatsController(statsService);
  const settingsController = new SettingsController(settingsService);
  const scanController = new ScanController(scanQueueService);
  const healthController = new HealthController(prisma);

  // Initialize default settings
  await settingsService.initializeDefaultSettings().catch(error => {
    logger.warn('Failed to initialize default settings', { error });
  });

  // Setup routes
  app.use('/api/opportunities', createOpportunityRoutes(opportunityController));
  app.use('/api/pairs', createPairRoutes(pairController));
  app.use('/api/stats', createStatsRoutes(statsController));
  app.use('/api/settings', createSettingsRoutes(settingsController));
  app.use('/api/scan', scanRateLimit, createScanRoutes(scanController));
  app.use('/', createHealthRoutes(healthController));

  // Dev-only seed endpoint
  app.get('/api/seed', seedRateLimit, async (req, res) => {
    const allowSeedInProduction = process.env.ALLOW_DOCKER_SEED === 'true';
    if (process.env.NODE_ENV === 'production' && !allowSeedInProduction) {
      return res.status(403).json({
        success: false,
        error: 'Seed endpoint is disabled in production'
      });
    }

    try {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      const execAsync = promisify(exec);

      logger.info('Running database seed...');
      const { stdout, stderr } = await execAsync('node prisma/seed.mjs', {
        cwd: process.cwd(),
      });

      logger.info('Database seeded successfully', { stdout });
      if (stderr) logger.warn('Database seed warnings', { stderr });

      res.json({
        success: true,
        message: 'Database seeded successfully',
        output: stdout,
      });
    } catch (error) {
      logger.error('Error seeding database', { error });
      res.status(500).json({
        success: false,
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  // Sentry error handler (if Sentry is enabled)
  if (process.env.SENTRY_DSN) {
    app.use(Sentry.Handlers.errorHandler());
  }

  // Global error handler
  app.use(notFoundHandler);
  app.use(errorHandler);

  // Cleanup function
  app.locals.cleanup = async () => {
    logger.info('Cleaning up application resources...');
    
    try {
      await gateAdapter.disconnect();
      await kyberAdapter.disconnect();
      await scanQueueService.close();
      await prisma.$disconnect();
      logger.info('Application cleanup completed');
    } catch (error) {
      logger.error('Error during cleanup', { error });
    }
  };

  // Periodic cleanup for scan queue
  const cleanupInterval = setInterval(() => {
    scanQueueService.cleanupOldJobs().catch(error => {
      logger.warn('Failed to cleanup old scan jobs', { error });
    });
  }, 60 * 60 * 1000); // Every hour

  // Clear interval on process exit
  process.on('SIGINT', () => {
    clearInterval(cleanupInterval);
  });
  process.on('SIGTERM', () => {
    clearInterval(cleanupInterval);
  });

  logger.info('Application initialized successfully');
  return app;
}