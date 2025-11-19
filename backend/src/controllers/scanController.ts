import { Request, Response } from 'express';
import { z } from 'zod';
import { ScanQueueService } from '../services/scanQueueService.js';
import { asyncHandler, createSuccessResponse, createErrorResponse } from '../utils/response.js';

const scanRequestSchema = z.object({
  pairId: z.coerce.number().int().min(1).optional(),
  force: z.boolean().optional().default(false)
});

const jobIdParamSchema = z.object({
  jobId: z.string().min(1)
});

export class ScanController {
  private scanQueueService: ScanQueueService;

  constructor(scanQueueService: ScanQueueService) {
    this.scanQueueService = scanQueueService;
  }

  enqueueScan = asyncHandler(async (req: Request, res: Response) => {
    const data = scanRequestSchema.parse(req.body);
    
    const result = await this.scanQueueService.enqueueScanJob(data);
    
    res.status(202).json(createSuccessResponse(result, 'Scan job enqueued successfully'));
  });

  getJobStatus = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = jobIdParamSchema.parse(req.params);
    
    const job = await this.scanQueueService.getJobStatus(jobId);
    
    if (!job) {
      return res.status(404).json(createErrorResponse('Job not found'));
    }
    
    res.json(createSuccessResponse(job, 'Job status retrieved successfully'));
  });

  getAllJobs = asyncHandler(async (req: Request, res: Response) => {
    const jobs = await this.scanQueueService.getAllJobs();
    
    res.json(createSuccessResponse(jobs, 'All jobs retrieved successfully'));
  });

  cancelJob = asyncHandler(async (req: Request, res: Response) => {
    const { jobId } = jobIdParamSchema.parse(req.params);
    
    const cancelled = await this.scanQueueService.cancelJob(jobId);
    
    if (!cancelled) {
      return res.status(404).json(createErrorResponse('Job not found or cannot be cancelled'));
    }
    
    res.json(createSuccessResponse(null, 'Job cancelled successfully'));
  });

  getQueueStats = asyncHandler(async (req: Request, res: Response) => {
    const stats = this.scanQueueService.getQueueStats();
    
    res.json(createSuccessResponse(stats, 'Queue statistics retrieved successfully'));
  });
}