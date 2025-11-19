import { startScanWorker } from './scanWorker.js';
import { workerLogger } from './logger.js';

workerLogger.info('Worker starting...');

const main = async () => {
  const controller = await startScanWorker();
  
  workerLogger.info('Worker is running and processing jobs');
  
  // Handle shutdown signals
  const shutdown = async () => {
    workerLogger.info('Received shutdown signal');
    await controller.shutdown();
    process.exit(0);
  };
  
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
};

main().catch((error) => {
  workerLogger.error('Worker failed to start', { error });
  process.exit(1);
});
