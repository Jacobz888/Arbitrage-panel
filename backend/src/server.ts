import { createApp } from './app.js';
import { logger } from './middleware/logger.js';

const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const startServer = async () => {
  try {
    const app = await createApp();

    app.listen(PORT, () => {
      logger.info('Server started successfully', {
        port: PORT,
        environment: NODE_ENV,
        healthCheck: `http://localhost:${PORT}/health`,
        metrics: `http://localhost:${PORT}/metrics`,
        endpoints: {
          opportunities: `http://localhost:${PORT}/api/opportunities`,
          pairs: `http://localhost:${PORT}/api/pairs`,
          stats: `http://localhost:${PORT}/api/stats`,
          settings: `http://localhost:${PORT}/api/settings`,
          scan: `http://localhost:${PORT}/api/scan`
        }
      });

      if (NODE_ENV === 'development') {
        logger.info('Development endpoints available', {
          seed: `http://localhost:${PORT}/api/seed`,
          docs: 'API documentation available at /api endpoints'
        });
      }
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully...`);
      
      if (app.locals.cleanup) {
        await app.locals.cleanup();
      }
      
      process.exit(0);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server', { error });
    process.exit(1);
  }
};

startServer().catch(error => {
  logger.error('Server startup failed', { error });
  process.exit(1);
});
