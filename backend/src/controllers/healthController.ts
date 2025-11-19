import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { asyncHandler, createSuccessResponse } from '../utils/response.js';

export class HealthController {
  private prisma: PrismaClient;
  private startTime: number;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.startTime = Date.now();
  }

  getHealth = asyncHandler(async (req: Request, res: Response) => {
    const uptime = Date.now() - this.startTime;
    const memory = process.memoryUsage();
    
    // Check database connection
    let databaseStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      databaseStatus = 'error';
    }

    // Check Redis connection (mock for now)
    const redisStatus = 'connected'; // Would implement actual Redis check

    // Determine overall health
    let overallStatus = 'healthy';
    if (databaseStatus === 'error' || redisStatus === 'error') {
      overallStatus = 'unhealthy';
    } else if (uptime < 30000) { // First 30 seconds
      overallStatus = 'degraded';
    }

    const healthData = {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Math.floor(uptime / 1000),
      version: process.env.npm_package_version || '1.0.0',
      database: databaseStatus,
      redis: redisStatus,
      memory: {
        used: Math.round(memory.heapUsed / 1024 / 1024), // MB
        total: Math.round(memory.heapTotal / 1024 / 1024), // MB
        percentage: Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      environment: process.env.NODE_ENV || 'development'
    };

    const statusCode = overallStatus === 'unhealthy' ? 503 : 200;
    
    res.status(statusCode).json(createSuccessResponse(healthData, 'Health status retrieved'));
  });

  getMetrics = asyncHandler(async (req: Request, res: Response) => {
    const metrics = await import('../middleware/metrics.js');
    
    res.set('Content-Type', metrics.register.contentType);
    res.end(await metrics.register.metrics());
  });
}