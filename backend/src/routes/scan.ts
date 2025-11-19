import { Router } from 'express';
import { ScanController } from '../controllers/scanController.js';
import { validateRequest } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const scanRequestSchema = z.object({
  pairId: z.coerce.number().int().min(1).optional(),
  force: z.boolean().optional().default(false)
});

export function createScanRoutes(controller: ScanController): Router {
  // POST /api/scan - Enqueue a new scan job
  router.post('/',
    validateRequest({
      body: scanRequestSchema
    }),
    controller.enqueueScan
  );

  // GET /api/scan/jobs - Get all jobs
  router.get('/jobs', controller.getAllJobs);

  // GET /api/scan/jobs/:jobId - Get job status
  router.get('/jobs/:jobId',
    validateRequest({
      params: z.object({
        jobId: z.string().min(1)
      })
    }),
    controller.getJobStatus
  );

  // DELETE /api/scan/jobs/:jobId - Cancel job
  router.delete('/jobs/:jobId',
    validateRequest({
      params: z.object({
        jobId: z.string().min(1)
      })
    }),
    controller.cancelJob
  );

  // GET /api/scan/queue/stats - Get queue statistics
  router.get('/queue/stats', controller.getQueueStats);

  return router;
}