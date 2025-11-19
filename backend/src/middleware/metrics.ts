import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';
import { logger } from './logger.js';

// Create a Registry
const register = new client.Registry();

// Add default metrics
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

const httpRequestTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
});

const scanQueueDepth = new client.Gauge({
  name: 'scan_queue_depth',
  help: 'Number of jobs in the scan queue'
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

// Register metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestTotal);
register.registerMetric(databaseQueryDuration);
register.registerMetric(scanQueueDepth);
register.registerMetric(activeConnections);

export { register };

export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  
  // Increment active connections
  activeConnections.inc();
  
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // Record metrics
    httpRequestDuration
      .labels(req.method, route, res.statusCode.toString())
      .observe(duration);
    
    httpRequestTotal
      .labels(req.method, route, res.statusCode.toString())
      .inc();
    
    // Decrement active connections
    activeConnections.dec();
    
    logger.debug('Request metrics recorded', {
      method: req.method,
      route,
      statusCode: res.statusCode,
      duration
    });
  });
  
  next();
}

export function recordDatabaseMetric(operation: string, table: string, duration: number): void {
  databaseQueryDuration
    .labels(operation, table)
    .observe(duration);
}

export function updateScanQueueDepth(depth: number): void {
  scanQueueDepth.set(depth);
}

export function incrementScanQueue(): void {
  scanQueueDepth.inc();
}

export function decrementScanQueue(): void {
  scanQueueDepth.dec();
}