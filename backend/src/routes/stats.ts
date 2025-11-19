import { Router } from 'express';
import { StatsController } from '../controllers/statsController.js';
import { validateRequest } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const idParamSchema = z.object({
  id: z.coerce.number().int().min(1)
});

export function createStatsRoutes(controller: StatsController): Router {
  // GET /api/stats/opportunities - Get opportunity statistics
  router.get('/opportunities', controller.getOpportunityStats);

  // GET /api/stats/scans - Get scan statistics
  router.get('/scans', controller.getScanStats);

  // GET /api/stats/overall - Get overall statistics
  router.get('/overall', controller.getOverallStats);

  // GET /api/stats/scans/:id - Get detailed scan statistics for a pair
  router.get('/scans/:id',
    validateRequest({
      params: idParamSchema
    }),
    controller.getDetailedScanStats
  );

  // GET /api/stats/scans/global - Get global scan statistics
  router.get('/scans/global', controller.getGlobalScanStats);

  return router;
}