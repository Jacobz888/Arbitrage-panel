import { Decimal } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { 
  ScanJobRequest, 
  ScanJobResponse,
  ServiceDependencies 
} from '../types/index.js';
import { updateScanQueueDepth, incrementScanQueue, decrementScanQueue } from '../middleware/metrics.js';

interface QueuedJob {
  id: string;
  pairId?: number;
  force: boolean;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  result?: any;
  error?: string;
}

export class ScanQueueService {
  private prisma: PrismaClient;
  private logger: any;
  private metrics: any;
  private gateAdapter?: any;
  private kyberAdapter?: any;
  
  private queue: Map<string, QueuedJob> = new Map();
  private processing: Set<string> = new Set();
  private jobIdCounter: number = 0;

  constructor(deps: ServiceDependencies) {
    this.prisma = deps.prisma;
    this.logger = deps.logger;
    this.metrics = deps.metrics;
    this.gateAdapter = deps.gateAdapter;
    this.kyberAdapter = deps.kyberAdapter;
  }

  async enqueueScanJob(request: ScanJobRequest): Promise<ScanJobResponse> {
    try {
      const jobId = this.generateJobId();
      
      const job: QueuedJob = {
        id: jobId,
        pairId: request.pairId,
        force: request.force || false,
        status: 'queued',
        createdAt: new Date()
      };

      this.queue.set(jobId, job);
      incrementScanQueue();
      
      this.logger.info('Scan job enqueued', { 
        jobId, 
        pairId: request.pairId, 
        force: request.force 
      });

      // Process job asynchronously
      this.processJob(jobId).catch(error => {
        this.logger.error('Job processing failed', { jobId, error });
      });

      return {
        jobId,
        status: 'queued',
        estimatedDuration: 30, // 30 seconds estimate
        queuedAt: job.createdAt.toISOString()
      };
    } catch (error) {
      this.logger.error('Failed to enqueue scan job', { error, request });
      throw error;
    }
  }

  async getJobStatus(jobId: string): Promise<ScanJobResponse | null> {
    const job = this.queue.get(jobId);
    
    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      status: job.status,
      queuedAt: job.createdAt.toISOString()
    };
  }

  async getAllJobs(): Promise<QueuedJob[]> {
    return Array.from(this.queue.values()).sort((a, b) => 
      b.createdAt.getTime() - a.createdAt.getTime()
    );
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.queue.get(jobId);
    
    if (!job) {
      return false;
    }

    if (job.status === 'queued') {
      job.status = 'failed';
      job.error = 'Job cancelled by user';
      job.completedAt = new Date();
      
      decrementScanQueue();
      
      this.logger.info('Scan job cancelled', { jobId });
      return true;
    }

    return false;
  }

  private async processJob(jobId: string): Promise<void> {
    const job = this.queue.get(jobId);
    
    if (!job) {
      return;
    }

    try {
      // Update job status
      job.status = 'processing';
      job.startedAt = new Date();
      this.processing.add(jobId);
      
      this.logger.info('Processing scan job', { jobId });

      // Perform the actual scan
      const result = await this.performScan(job);
      
      // Update job with result
      job.status = 'completed';
      job.completedAt = new Date();
      job.result = result;
      
      this.logger.info('Scan job completed', { 
        jobId, 
        duration: job.completedAt.getTime() - job.startedAt!.getTime(),
        opportunitiesFound: result.opportunitiesFound
      });

    } catch (error) {
      job.status = 'failed';
      job.completedAt = new Date();
      job.error = error instanceof Error ? error.message : 'Unknown error';
      
      this.logger.error('Scan job failed', { jobId, error });
    } finally {
      this.processing.delete(jobId);
      decrementScanQueue();
    }
  }

  private async performScan(job: QueuedJob): Promise<{
    opportunitiesFound: number;
    pairsScanned: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const opportunitiesFound = 0;
    const pairsScanned = 0;
    const errors: string[] = [];

    try {
      // Get pairs to scan
      const pairs = await this.getPairsToScan(job.pairId);
      
      for (const pair of pairs) {
        try {
          await this.scanPair(pair);
          pairsScanned++;
        } catch (error) {
          const errorMsg = `Failed to scan pair ${pair.symbol}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          this.logger.warn('Pair scan failed', { pairId: pair.id, symbol: pair.symbol, error });
        }
      }

      // Record scan statistics
      await this.recordScanStats(job.pairId, {
        totalScans: 1,
        successfulScans: errors.length === 0 ? 1 : 0,
        failedScans: errors.length > 0 ? 1 : 0,
        opportunitiesFound,
        averageScanTime: new Decimal(((Date.now() - startTime) / 1000).toFixed(2))
      });

      return {
        opportunitiesFound,
        pairsScanned,
        errors
      };

    } catch (error) {
      this.logger.error('Scan execution failed', { jobId: job.id, error });
      throw error;
    }
  }

  private async getPairsToScan(pairId?: number) {
    if (pairId) {
      const pair = await this.prisma.pair.findUnique({
        where: { id: pairId, isActive: true }
      });
      
      if (!pair) {
        throw new Error(`Pair with ID ${pairId} not found or inactive`);
      }
      
      return [pair];
    }

    return await this.prisma.pair.findMany({
      where: { isActive: true },
      take: 10, // Limit to 10 pairs per scan
      orderBy: { updatedAt: 'asc' } // Scan oldest first
    });
  }

  private async scanPair(pair: any): Promise<void> {
    if (!this.gateAdapter || !this.kyberAdapter) {
      throw new Error('Market adapters not available');
    }

    try {
      // Get prices from both exchanges
      const [gatePrice, kyberPrice, gateVolume, kyberVolume] = await Promise.all([
        this.gateAdapter.getPrice(pair.symbol),
        this.kyberAdapter.getPrice(pair.symbol),
        this.gateAdapter.getVolume(pair.symbol),
        this.kyberAdapter.getVolume(pair.symbol)
      ]);

      // Check for arbitrage opportunities
      const spread1 = this.calculateSpread(gatePrice, kyberPrice); // Buy Gate, Sell Kyber
      const spread2 = this.calculateSpread(kyberPrice, gatePrice); // Buy Kyber, Sell Gate

      const minSpread = new Decimal('1.5'); // 1.5% minimum spread

      if (spread1.gte(minSpread)) {
        await this.createOpportunity(pair, 'Gate.io', 'KyberSwap', gatePrice, kyberPrice, gateVolume);
      }

      if (spread2.gte(minSpread)) {
        await this.createOpportunity(pair, 'KyberSwap', 'Gate.io', kyberPrice, gatePrice, kyberVolume);
      }

    } catch (error) {
      this.logger.error('Pair scan execution failed', { 
        pairId: pair.id, 
        symbol: pair.symbol, 
        error 
      });
      throw error;
    }
  }

  private calculateSpread(buyPrice: Decimal, sellPrice: Decimal): Decimal {
    if (buyPrice.equals(0)) return new Decimal(0);
    return sellPrice.minus(buyPrice).div(buyPrice).times(100);
  }

  private async createOpportunity(
    pair: any,
    buyExchange: string,
    sellExchange: string,
    buyPrice: Decimal,
    sellPrice: Decimal,
    volume: Decimal
  ): Promise<void> {
    const spread = this.calculateSpread(buyPrice, sellPrice);
    const profitEstimate = spread.div(100).times(volume).minus(volume.times('0.002')); // 0.2% total fees

    await this.prisma.opportunity.create({
      data: {
        pairId: pair.id,
        buyExchange,
        sellExchange,
        buyPrice,
        sellPrice,
        spread,
        profitEstimate,
        volume: volume.minus(volume.times('0.1')), // Use 90% of available volume
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
      }
    });

    this.logger.info('Opportunity created', {
      pairId: pair.id,
      symbol: pair.symbol,
      buyExchange,
      sellExchange,
      spread: spread.toString(),
      profitEstimate: profitEstimate.toString()
    });
  }

  private async recordScanStats(pairId: number | undefined, stats: {
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    opportunitiesFound: number;
    averageScanTime: Decimal;
  }): Promise<void> {
    await this.prisma.scanStats.create({
      data: {
        pairId,
        ...stats,
        lastScanAt: new Date()
      }
    });
  }

  private generateJobId(): string {
    return `scan_${Date.now()}_${++this.jobIdCounter}`;
  }

  // Cleanup old jobs (call this periodically)
  cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000): void {
    const cutoff = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    for (const [jobId, job] of this.queue.entries()) {
      if (job.createdAt < cutoff && (job.status === 'completed' || job.status === 'failed')) {
        this.queue.delete(jobId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.info('Cleaned up old jobs', { count: cleanedCount });
    }
  }

  getQueueStats(): {
    queued: number;
    processing: number;
    completed: number;
    failed: number;
    total: number;
  } {
    const jobs = Array.from(this.queue.values());
    
    return {
      queued: jobs.filter(j => j.status === 'queued').length,
      processing: jobs.filter(j => j.status === 'processing').length,
      completed: jobs.filter(j => j.status === 'completed').length,
      failed: jobs.filter(j => j.status === 'failed').length,
      total: jobs.length
    };
  }
}