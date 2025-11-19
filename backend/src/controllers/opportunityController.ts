import { Request, Response } from 'express';
import { z } from 'zod';
import { OpportunityService } from '../services/opportunityService.js';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../utils/response.js';

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  sortBy: z.enum(['createdAt', 'updatedAt', 'spread', 'profitEstimate', 'volume']).optional().default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc')
});

const idParamSchema = z.object({
  id: z.coerce.number().int().min(1)
});

export class OpportunityController {
  private opportunityService: OpportunityService;

  constructor(opportunityService: OpportunityService) {
    this.opportunityService = opportunityService;
  }

  getLatestOpportunities = asyncHandler(async (req: Request, res: Response) => {
    const pagination = paginationSchema.parse(req.query);
    
    const result = await this.opportunityService.getLatestOpportunities(pagination);
    
    res.json(createSuccessResponse(result, 'Latest opportunities retrieved successfully'));
  });

  getOpportunityById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    
    const opportunity = await this.opportunityService.getOpportunityById(id);
    
    if (!opportunity) {
      return res.status(404).json(createErrorResponse('Opportunity not found'));
    }
    
    res.json(createSuccessResponse(opportunity, 'Opportunity retrieved successfully'));
  });

  updateOpportunityStatus = asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    
    const statusSchema = z.object({
      status: z.enum(['PENDING', 'ACTIVE', 'EXECUTED', 'FAILED', 'EXPIRED'])
    });
    
    const { status } = statusSchema.parse(req.body);
    
    const opportunity = await this.opportunityService.updateOpportunityStatus(id, status);
    
    res.json(createSuccessResponse(opportunity, `Opportunity status updated to ${status}`));
  });

  getOpportunitiesByPair = asyncHandler(async (req: Request, res: Response) => {
    const { id } = idParamSchema.parse(req.params);
    
    const limitSchema = z.object({
      limit: z.coerce.number().int().min(1).max(50).optional().default(10)
    });
    
    const { limit } = limitSchema.parse(req.query);
    
    const opportunities = await this.opportunityService.getOpportunitiesByPair(id, limit);
    
    res.json(createSuccessResponse(opportunities, 'Opportunities by pair retrieved successfully'));
  });
}