import { Router } from 'express';
import { OpportunityController } from '../controllers/opportunityController.js';
import { validateRequest } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const statusUpdateSchema = z.object({
  status: z.enum(['PENDING', 'ACTIVE', 'EXECUTED', 'FAILED', 'EXPIRED'])
});

export function createOpportunityRoutes(controller: OpportunityController): Router {
  // GET /api/opportunities/latest - Get latest opportunities with pagination
  router.get('/latest', controller.getLatestOpportunities);

  // Note: /api/opportunities/stats is handled by the stats controller

  // GET /api/opportunities/:id - Get opportunity by ID
  router.get('/:id', 
    validateRequest({
      params: z.object({
        id: z.coerce.number().int().min(1)
      })
    }),
    controller.getOpportunityById
  );

  // PUT /api/opportunities/:id/status - Update opportunity status
  router.put('/:id/status',
    validateRequest({
      params: z.object({
        id: z.coerce.number().int().min(1)
      }),
      body: statusUpdateSchema
    }),
    controller.updateOpportunityStatus
  );

  // GET /api/opportunities/pair/:id - Get opportunities by pair
  router.get('/pair/:id',
    validateRequest({
      params: z.object({
        id: z.coerce.number().int().min(1)
      })
    }),
    controller.getOpportunitiesByPair
  );

  return router;
}