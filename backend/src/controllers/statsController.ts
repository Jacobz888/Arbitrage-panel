import { Request, Response } from 'express';
import { z } from 'zod';
import { StatsService } from '../services/statsService.js';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../utils/response.js';

const timeframeSchema = z.object({
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional()
});

const idParamSchema = z.object({
  id: z.coerce.number().int().min(1)
});

export class StatsController {
  private statsService: StatsService;

  constructor(statsService: StatsService) {
    this.statsService = statsService;
  }

  getOpportunityStats = asyncHandler(async (req: Request, res: Response) => {
    const { timeframe } = timeframeSchema.parse(req.query);
    
    const stats = await this.statsService.getOpportunityStats(timeframe);
    
    res.json(createSuccessResponse(stats, 'Opportunity statistics retrieved successfully'));
  });

  getScanStats = asyncHandler(async (req: Request, res: Response) => {
    const { timeframe } = timeframeSchema.parse(req.query);
    
    const stats = await this.statsService.getScanStats(timeframe);
    
    res.json(createSuccessResponse(stats, 'Scan statistics retrieved successfully'));
  });

  getOverallStats = asyncHandler(async (req: Request, res: Response) => {
    const { timeframe } = timeframeSchema.parse(req.query);
    
    const stats = await this.statsService.getOverallStats(timeframe);
    
    res.json(createSuccessResponse(stats, 'Overall statistics retrieved successfully'));
  });

  getDetailedScanStats = asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    
    const stats = await this.statsService.getDetailedScanStats(id);
    
    res.json(createSuccessResponse(stats, 'Detailed scan statistics retrieved successfully'));
  });

  getGlobalScanStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = await this.statsService.getDetailedScanStats();
    
    res.json(createSuccessResponse(stats, 'Global scan statistics retrieved successfully'));
  });
}