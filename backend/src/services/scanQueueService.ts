import { Queue, QueueScheduler, Job, JobsOptions } from 'bullmq';
import IORedis from 'ioredis';
import {
  MANUAL_SCAN_QUEUE,
  DEAD_LETTER_QUEUE,
  SCAN_JOB_NAME,
  ScanJobRequest,
  ScanJobPayload,
  ScanJobResponse,
  QueueDepthSnapshot
} from '@shared/typings/queues';
import { ServiceDependencies } from '../types/index.js';
import { updateScanQueueDepth } from '../middleware/metrics.js';

const DEFAULT_JOB_OPTIONS: JobsOptions = {
  removeOnComplete: 100,
  removeOnFail: 200,
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 3000
  }
};

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export class ScanQueueService {
  private logger: any;
  private redis: IORedis;
  private manualQueue: Queue<ScanJobPayload>;
  private deadLetterQueue: Queue<ScanJobPayload>;
  private scheduler?: QueueScheduler;

  constructor(deps: ServiceDependencies) {
    this.logger = deps.logger;
    this.redis = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false
    });

    this.manualQueue = new Queue(MANUAL_SCAN_QUEUE, {
      connection: this.redis
    });

    this.deadLetterQueue = new Queue(DEAD_LETTER_QUEUE, {
      connection: this.redis
    });
  }

  async initialize(): Promise<void> {
    this.scheduler = new QueueScheduler(MANUAL_SCAN_QUEUE, {
      connection: this.redis
    });
    await this.scheduler.waitUntilReady();
    await this.refreshQueueDepth();
    this.logger.info('Scan queue service connected', { redis: REDIS_URL });
  }

  async enqueueScanJob(request: ScanJobRequest): Promise<ScanJobResponse> {
    const payload: ScanJobPayload = {
      ...request,
      trigger: 'manual',
      requestedAt: new Date().toISOString()
    };

    const job = await this.manualQueue.add(SCAN_JOB_NAME, payload, DEFAULT_JOB_OPTIONS);
    await this.refreshQueueDepth();

    this.logger.info('Manual scan job enqueued', {
      jobId: job.id,
      pairId: request.pairId,
      force: request.force
    });

    return {
      jobId: job.id!.toString(),
      status: 'queued',
      queuedAt: new Date(job.timestamp ?? Date.now()).toISOString(),
      estimatedDuration: 30
    };
  }

  async getJobStatus(jobId: string): Promise<ScanJobResponse | null> {
    const job = await this.manualQueue.getJob(jobId);
    if (!job) {
      return null;
    }

    const state = await job.getState();
    return {
      jobId: job.id!.toString(),
      status: this.mapState(state),
      queuedAt: new Date(job.timestamp ?? Date.now()).toISOString(),
      completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined
    };
  }

  async getAllJobs(limit: number = 50): Promise<Array<Record<string, unknown>>> {
    const jobs = await this.manualQueue.getJobs(
      ['waiting', 'delayed', 'active', 'completed', 'failed'],
      0,
      limit - 1,
      true
    );

    return jobs.map(job => this.serializeJob(job));
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = await this.manualQueue.getJob(jobId);
    if (!job) {
      return false;
    }

    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      await this.refreshQueueDepth();
      this.logger.info('Manual scan job cancelled', { jobId });
      return true;
    }

    return false;
  }

  async getQueueStats(): Promise<{ queued: number; processing: number; completed: number; failed: number; total: number; depth: QueueDepthSnapshot; }> {
    const counts = await this.manualQueue.getJobCounts('waiting', 'delayed', 'active', 'completed', 'failed');
    const depth: QueueDepthSnapshot = {
      waiting: counts.waiting,
      active: counts.active,
      delayed: counts.delayed,
      failed: counts.failed,
      completed: counts.completed
    };

    return {
      queued: counts.waiting + counts.delayed,
      processing: counts.active,
      completed: counts.completed,
      failed: counts.failed,
      total: counts.waiting + counts.delayed + counts.active + counts.completed + counts.failed,
      depth
    };
  }

  async cleanupOldJobs(retentionMs: number = 24 * 60 * 60 * 1000): Promise<void> {
    await Promise.all([
      this.manualQueue.clean(retentionMs, 100, 'completed'),
      this.manualQueue.clean(retentionMs, 100, 'failed')
    ]);
    await this.refreshQueueDepth();
  }

  async close(): Promise<void> {
    await this.scheduler?.close();
    await this.manualQueue.close();
    await this.deadLetterQueue.close();
    await this.redis.quit();
  }

  private async refreshQueueDepth(): Promise<void> {
    const counts = await this.manualQueue.getJobCounts('waiting', 'delayed', 'active');
    const depth = counts.waiting + counts.delayed + counts.active;
    updateScanQueueDepth(depth);
  }

  private mapState(state: string): ScanJobResponse['status'] {
    switch (state) {
      case 'waiting':
      case 'delayed':
        return 'queued';
      case 'active':
        return 'processing';
      case 'completed':
        return 'completed';
      case 'failed':
      default:
        return 'failed';
    }
  }

  private serializeJob(job: Job<ScanJobPayload>) {
    return {
      id: job.id,
      data: job.data,
      status: job.name,
      state: job.returnvalue,
      queuedAt: new Date(job.timestamp ?? Date.now()).toISOString(),
      completedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : undefined,
      failedReason: job.failedReason
    };
  }
}
