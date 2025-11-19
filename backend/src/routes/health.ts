import { Router } from 'express';
import { HealthController } from '../controllers/healthController.js';

const router = Router();

export function createHealthRoutes(controller: HealthController): Router {
  // GET /health - Health check endpoint
  router.get('/', controller.getHealth);

  // GET /metrics - Prometheus metrics endpoint
  router.get('/metrics', controller.getMetrics);

  return router;
}