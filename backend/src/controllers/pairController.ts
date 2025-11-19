import { Request, Response } from 'express';
import { z } from 'zod';
import { PairService } from '../services/pairService.js';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../utils/response.js';

const limitSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(10)
});

const idParamSchema = z.object({
  id: z.coerce.number().int().min(1)
});

const symbolParamSchema = z.object({
  symbol: z.string().min(1).max(20)
});

const createPairSchema = z.object({
  symbol: z.string().min(1).max(20),
  baseAsset: z.string().min(1).max(10),
  quoteAsset: z.string().min(1).max(10),
  isActive: z.boolean().optional()
});

const updateStatusSchema = z.object({
  isActive: z.boolean()
});

export class PairController {
  private pairService: PairService;

  constructor(pairService: PairService) {
    this.pairService = pairService;
  }

  getTopPairs = asyncHandler(async (req: Request, res: Response) => {
    const { limit } = limitSchema.parse(req.query);
    
    const pairs = await this.pairService.getTopPairs(limit);
    
    res.json(createSuccessResponse(pairs, 'Top pairs retrieved successfully'));
  });

  getPairById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    
    const pair = await this.pairService.getPairById(id);
    
    if (!pair) {
      return res.status(404).json(createErrorResponse('Pair not found'));
    }
    
    res.json(createSuccessResponse(pair, 'Pair retrieved successfully'));
  });

  getPairBySymbol = asyncHandler(async (req: Request, res: Response) => {
    const { symbol } = symbolParamSchema.parse(req.params);
    
    const pair = await this.pairService.getPairBySymbol(symbol);
    
    if (!pair) {
      return res.status(404).json(createErrorResponse('Pair not found'));
    }
    
    res.json(createSuccessResponse(pair, 'Pair retrieved successfully'));
  });

  getAllPairs = asyncHandler(async (req: Request, res: Response) => {
    const activeOnlySchema = z.object({
      activeOnly: z.enum(['true', 'false']).transform(val => val === 'true').optional().default('true')
    });
    
    const { activeOnly } = activeOnlySchema.parse(req.query);
    
    const pairs = await this.pairService.getAllPairs(activeOnly);
    
    res.json(createSuccessResponse(pairs, 'All pairs retrieved successfully'));
  });

  createPair = asyncHandler(async (req: Request, res: Response) => {
    const data = createPairSchema.parse(req.body);
    
    const pair = await this.pairService.createPair(data);
    
    res.status(201).json(createSuccessResponse(pair, 'Pair created successfully'));
  });

  updatePairStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    const { isActive } = updateStatusSchema.parse(req.body);
    
    const pair = await this.pairService.updatePairStatus(id, isActive);
    
    res.json(createSuccessResponse(pair, `Pair status updated to ${isActive ? 'active' : 'inactive'}`));
  });
}