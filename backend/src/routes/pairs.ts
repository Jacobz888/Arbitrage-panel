import { Router } from 'express';
import { PairController } from '../controllers/pairController.js';
import { validateRequest } from '../utils/response.js';
import { z } from 'zod';

const router = Router();

const createPairSchema = z.object({
  symbol: z.string().min(1).max(20),
  baseAsset: z.string().min(1).max(10),
  quoteAsset: z.string().min(1).max(10),
  isActive: z.boolean().optional()
});

const updateStatusSchema = z.object({
  isActive: z.boolean()
});

export function createPairRoutes(controller: PairController): Router {
  // GET /api/pairs/top - Get top pairs by opportunities
  router.get('/top', controller.getTopPairs);

  // GET /api/pairs - Get all pairs
  router.get('/', controller.getAllPairs);

  // GET /api/pairs/symbol/:symbol - Get pair by symbol
  router.get('/symbol/:symbol',
    validateRequest({
      params: z.object({
        symbol: z.string().min(1).max(20)
      })
    }),
    controller.getPairBySymbol
  );

  // GET /api/pairs/:id - Get pair by ID
  router.get('/:id',
    validateRequest({
      params: z.object({
        id: z.coerce.number().int().min(1)
      })
    }),
    controller.getPairById
  );

  // POST /api/pairs - Create new pair
  router.post('/',
    validateRequest({
      body: createPairSchema
    }),
    controller.createPair
  );

  // PUT /api/pairs/:id/status - Update pair status
  router.put('/:id/status',
    validateRequest({
      params: z.object({
        id: z.coerce.number().int().min(1)
      }),
      body: updateStatusSchema
    }),
    controller.updatePairStatus
  );

  return router;
}