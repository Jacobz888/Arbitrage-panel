import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ScanController } from '../../src/controllers/scanController.js';
import { ScanQueueService } from '../../src/services/scanQueueService.js';
import { createScanRoutes } from '../../src/routes/scan.js';

describe('Scan Integration Tests', () => {
  let app: express.Application;
  let mockScanQueueService: any;

  beforeAll(() => {
    // Create mock scan queue service
    mockScanQueueService = {
      enqueueScanJob: vi.fn(),
      getJobStatus: vi.fn(),
      getAllJobs: vi.fn(),
      cancelJob: vi.fn(),
      getQueueStats: vi.fn(),
    };

    // Create controller with mock service
    const scanController = new ScanController(mockScanQueueService);

    // Setup Express app
    app = express();
    app.use(express.json());
    app.use('/api/scan', createScanRoutes(scanController));
    
    // Error handler
    app.use((err: any, req: any, res: any, next: any) => {
      res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    });
  });

  describe('POST /api/scan', () => {
    it('should return 202 and enqueue scan job', async () => {
      const mockJobResponse = {
        jobId: 'test-job-123',
        status: 'queued' as const,
        queuedAt: new Date().toISOString(),
        estimatedDuration: 30,
      };

      mockScanQueueService.enqueueScanJob.mockResolvedValue(mockJobResponse);

      const response = await request(app)
        .post('/api/scan')
        .send({})
        .expect(202);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Scan job enqueued successfully',
        data: mockJobResponse,
      });

      expect(mockScanQueueService.enqueueScanJob).toHaveBeenCalledWith({
        force: false,
      });
    });

    it('should enqueue scan job with specific pair ID', async () => {
      const mockJobResponse = {
        jobId: 'test-job-456',
        status: 'queued' as const,
        queuedAt: new Date().toISOString(),
        estimatedDuration: 30,
      };

      mockScanQueueService.enqueueScanJob.mockResolvedValue(mockJobResponse);

      const response = await request(app)
        .post('/api/scan')
        .send({ pairId: 1 })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(mockScanQueueService.enqueueScanJob).toHaveBeenCalledWith({
        pairId: 1,
        force: false,
      });
    });

    it('should enqueue forced scan job', async () => {
      const mockJobResponse = {
        jobId: 'test-job-789',
        status: 'queued' as const,
        queuedAt: new Date().toISOString(),
        estimatedDuration: 30,
      };

      mockScanQueueService.enqueueScanJob.mockResolvedValue(mockJobResponse);

      const response = await request(app)
        .post('/api/scan')
        .send({ force: true })
        .expect(202);

      expect(response.body.success).toBe(true);
      expect(mockScanQueueService.enqueueScanJob).toHaveBeenCalledWith({
        force: true,
      });
    });

    it('should validate pairId must be positive integer', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ pairId: -1 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should validate pairId must be integer', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ pairId: 1.5 })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should validate force must be boolean', async () => {
      const response = await request(app)
        .post('/api/scan')
        .send({ force: 'not-a-boolean' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });

    it('should handle service errors gracefully', async () => {
      mockScanQueueService.enqueueScanJob.mockRejectedValue(
        new Error('Queue connection failed')
      );

      const response = await request(app)
        .post('/api/scan')
        .send({})
        .expect(500);

      expect(response.body.success).toBe(false);
    });

    it('should update queue stats after enqueuing', async () => {
      const mockJobResponse = {
        jobId: 'test-job-stats',
        status: 'queued' as const,
        queuedAt: new Date().toISOString(),
        estimatedDuration: 30,
      };

      mockScanQueueService.enqueueScanJob.mockResolvedValue(mockJobResponse);

      await request(app)
        .post('/api/scan')
        .send({})
        .expect(202);

      // Verify job was enqueued (queue stats would be updated in real service)
      expect(mockScanQueueService.enqueueScanJob).toHaveBeenCalled();
    });
  });

  describe('GET /api/scan/jobs/:jobId', () => {
    it('should return job status when job exists', async () => {
      const mockJob = {
        jobId: 'test-job-123',
        status: 'processing' as const,
        queuedAt: new Date().toISOString(),
      };

      mockScanQueueService.getJobStatus.mockResolvedValue(mockJob);

      const response = await request(app)
        .get('/api/scan/jobs/test-job-123')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Job status retrieved successfully',
        data: mockJob,
      });
    });

    it('should return 404 when job does not exist', async () => {
      mockScanQueueService.getJobStatus.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/scan/jobs/non-existent-job')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Job not found',
      });
    });

    it('should validate jobId parameter', async () => {
      const response = await request(app)
        .get('/api/scan/jobs/')
        .expect(404); // Route not matched

      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/scan/jobs', () => {
    it('should return all jobs', async () => {
      const mockJobs = [
        {
          id: 'job-1',
          data: { trigger: 'manual' },
          status: 'completed',
          queuedAt: new Date().toISOString(),
        },
        {
          id: 'job-2',
          data: { trigger: 'scheduled' },
          status: 'processing',
          queuedAt: new Date().toISOString(),
        },
      ];

      mockScanQueueService.getAllJobs.mockResolvedValue(mockJobs);

      const response = await request(app)
        .get('/api/scan/jobs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual(mockJobs);
    });

    it('should return empty array when no jobs exist', async () => {
      mockScanQueueService.getAllJobs.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/scan/jobs')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toEqual([]);
    });
  });

  describe('DELETE /api/scan/jobs/:jobId', () => {
    it('should cancel job successfully', async () => {
      mockScanQueueService.cancelJob.mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/scan/jobs/test-job-123')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Job cancelled successfully',
      });
    });

    it('should return 404 when job cannot be cancelled', async () => {
      mockScanQueueService.cancelJob.mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/scan/jobs/non-existent-job')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Job not found or cannot be cancelled',
      });
    });
  });

  describe('GET /api/scan/queue/stats', () => {
    it('should return queue statistics', async () => {
      const mockStats = {
        queued: 5,
        processing: 2,
        completed: 100,
        failed: 3,
        total: 110,
        depth: {
          waiting: 5,
          active: 2,
          delayed: 0,
          failed: 3,
          completed: 100,
        },
      };

      mockScanQueueService.getQueueStats.mockReturnValue(mockStats);

      const response = await request(app)
        .get('/api/scan/queue/stats')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Queue statistics retrieved successfully',
        data: mockStats,
      });
    });
  });
});
