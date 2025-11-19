import { Decimal } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { 
  SerializedScanStats,
  ServiceDependencies 
} from '../types/index.js';
import { serializeDecimal } from '../utils/decimal.js';

export interface OpportunityStats {
  totalOpportunities: number;
  activeOpportunities: number;
  executedOpportunities: number;
  failedOpportunities: number;
  expiredOpportunities: number;
  averageSpread: string;
  totalVolume: string;
  totalProfitEstimate: string;
}

export interface ScanStats {
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  averageScanTime: string;
  lastScanAt?: string;
  scanSuccessRate: number;
}

export interface OverallStats {
  opportunities: OpportunityStats;
  scans: ScanStats;
  topPairs: Array<{
    symbol: string;
    opportunityCount: number;
    averageSpread: string;
  }>;
  recentActivity: Array<{
    type: 'opportunity' | 'scan';
    timestamp: string;
    details: any;
  }>;
}

export class StatsService {
  private prisma: PrismaClient;
  private logger: any;
  private metrics: any;

  constructor(deps: ServiceDependencies) {
    this.prisma = deps.prisma;
    this.logger = deps.logger;
    this.metrics = deps.metrics;
  }

  async getOpportunityStats(timeframe?: '1h' | '24h' | '7d' | '30d'): Promise<OpportunityStats> {
    const startTime = Date.now();
    
    try {
      const dateFilter = this.getTimeframeFilter(timeframe);
      
      const [
        totalResult,
        activeResult,
        executedResult,
        failedResult,
        expiredResult,
        avgSpreadResult,
        totalVolumeResult,
        totalProfitResult
      ] = await Promise.all([
        this.prisma.opportunity.count({ where: dateFilter }),
        this.prisma.opportunity.count({ 
          where: { 
            ...dateFilter,
            status: { in: ['PENDING', 'ACTIVE'] },
            expiresAt: { gte: new Date() }
          } 
        }),
        this.prisma.opportunity.count({ 
          where: { 
            ...dateFilter,
            status: 'EXECUTED' 
          } 
        }),
        this.prisma.opportunity.count({ 
          where: { 
            ...dateFilter,
            status: 'FAILED' 
          } 
        }),
        this.prisma.opportunity.count({ 
          where: { 
            ...dateFilter,
            status: 'EXPIRED' 
          } 
        }),
        this.prisma.opportunity.aggregate({
          where: dateFilter,
          _avg: { spread: true }
        }),
        this.prisma.opportunity.aggregate({
          where: dateFilter,
          _sum: { volume: true }
        }),
        this.prisma.opportunity.aggregate({
          where: dateFilter,
          _sum: { profitEstimate: true }
        })
      ]);

      if (this.metrics && this.metrics.record) {
        this.metrics.record('aggregate', 'opportunity', (Date.now() - startTime) / 1000);
      }

      return {
        totalOpportunities: totalResult,
        activeOpportunities: activeResult,
        executedOpportunities: executedResult,
        failedOpportunities: failedResult,
        expiredOpportunities: expiredResult,
        averageSpread: serializeDecimal(avgSpreadResult._avg.spread || new Decimal(0)),
        totalVolume: serializeDecimal(totalVolumeResult._sum.volume || new Decimal(0)),
        totalProfitEstimate: serializeDecimal(totalProfitResult._sum.profitEstimate || new Decimal(0))
      };
    } catch (error) {
      this.logger.error('Failed to get opportunity stats', { error, timeframe });
      throw error;
    }
  }

  async getScanStats(timeframe?: '1h' | '24h' | '7d' | '30d'): Promise<ScanStats> {
    const startTime = Date.now();
    
    try {
      const dateFilter = this.getTimeframeFilter(timeframe);
      
      const [
        totalScansResult,
        successfulScansResult,
        failedScansResult,
        avgScanTimeResult,
        lastScanResult
      ] = await Promise.all([
        this.prisma.scanStats.aggregate({
          where: dateFilter,
          _sum: { totalScans: true }
        }),
        this.prisma.scanStats.aggregate({
          where: dateFilter,
          _sum: { successfulScans: true }
        }),
        this.prisma.scanStats.aggregate({
          where: dateFilter,
          _sum: { failedScans: true }
        }),
        this.prisma.scanStats.aggregate({
          where: dateFilter,
          _avg: { averageScanTime: true }
        }),
        this.prisma.scanStats.findFirst({
          where: dateFilter,
          orderBy: { lastScanAt: 'desc' },
          select: { lastScanAt: true }
        })
      ]);

      if (this.metrics && this.metrics.record) {
        this.metrics.record('aggregate', 'scanStats', (Date.now() - startTime) / 1000);
      }

      const totalScans = totalScansResult._sum.totalScans || 0;
      const successfulScans = successfulScansResult._sum.successfulScans || 0;
      const failedScans = failedScansResult._sum.failedScans || 0;
      const scanSuccessRate = totalScans > 0 ? (successfulScans / totalScans) * 100 : 0;

      return {
        totalScans,
        successfulScans,
        failedScans,
        averageScanTime: serializeDecimal(avgScanTimeResult._avg.averageScanTime || new Decimal(0)),
        lastScanAt: lastScanResult?.lastScanAt?.toISOString(),
        scanSuccessRate
      };
    } catch (error) {
      this.logger.error('Failed to get scan stats', { error, timeframe });
      throw error;
    }
  }

  async getOverallStats(timeframe?: '1h' | '24h' | '7d' | '30d'): Promise<OverallStats> {
    try {
      const [opportunityStats, scanStats, topPairs] = await Promise.all([
        this.getOpportunityStats(timeframe),
        this.getScanStats(timeframe),
        this.getTopPairsByOpportunities(timeframe)
      ]);

      const recentActivity = await this.getRecentActivity();

      return {
        opportunities: opportunityStats,
        scans: scanStats,
        topPairs,
        recentActivity
      };
    } catch (error) {
      this.logger.error('Failed to get overall stats', { error, timeframe });
      throw error;
    }
  }

  async getDetailedScanStats(pairId?: number): Promise<SerializedScanStats[]> {
    const startTime = Date.now();
    
    try {
      const where = pairId ? { pairId } : {};
      
      const scanStats = await this.prisma.scanStats.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: 100
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findMany', 'scanStats', (Date.now() - startTime) / 1000);
      }

      return scanStats.map(stat => this.serializeScanStats(stat));
    } catch (error) {
      this.logger.error('Failed to get detailed scan stats', { error, pairId });
      throw error;
    }
  }

  async recordScan(data: {
    pairId?: number;
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    opportunitiesFound: number;
    averageScanTime?: Decimal;
    minPrice?: Decimal;
    maxPrice?: Decimal;
    avgPrice?: Decimal;
  }): Promise<SerializedScanStats> {
    const startTime = Date.now();
    
    try {
      const scanStats = await this.prisma.scanStats.create({
        data: {
          ...data,
          lastScanAt: new Date()
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('create', 'scanStats', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Scan stats recorded', { 
        id: scanStats.id, 
        pairId: data.pairId,
        successfulScans: data.successfulScans,
        opportunitiesFound: data.opportunitiesFound
      });

      return this.serializeScanStats(scanStats);
    } catch (error) {
      this.logger.error('Failed to record scan stats', { error, data });
      throw error;
    }
  }

  private async getTopPairsByOpportunities(timeframe?: '1h' | '24h' | '7d' | '30d') {
    const dateFilter = this.getTimeframeFilter(timeframe);
    
    const topPairs = await this.prisma.pair.findMany({
      where: { isActive: true },
      include: {
        opportunities: {
          where: dateFilter,
          select: {
            spread: true
          }
        }
      },
      take: 10
    });

    return topPairs
      .map(pair => {
        const opportunities = pair.opportunities;
        const opportunityCount = opportunities.length;
        const averageSpread = opportunityCount > 0 
          ? opportunities.reduce((sum, opp) => sum + parseFloat(opp.spread.toString()), 0) / opportunityCount
          : 0;

        return {
          symbol: pair.symbol,
          opportunityCount,
          averageSpread: averageSpread.toFixed(2)
        };
      })
      .sort((a, b) => b.opportunityCount - a.opportunityCount);
  }

  private async getRecentActivity() {
    const recentOpportunities = await this.prisma.opportunity.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        status: true,
        spread: true,
        pair: {
          select: { symbol: true }
        }
      }
    });

    const recentScans = await this.prisma.scanStats.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        successfulScans: true,
        opportunitiesFound: true,
        pair: {
          select: { symbol: true }
        }
      }
    });

    const activity = [
      ...recentOpportunities.map(opp => ({
        type: 'opportunity' as const,
        timestamp: opp.createdAt.toISOString(),
        details: {
          id: opp.id,
          symbol: opp.pair.symbol,
          status: opp.status,
          spread: opp.spread.toString()
        }
      })),
      ...recentScans.map(scan => ({
        type: 'scan' as const,
        timestamp: scan.createdAt.toISOString(),
        details: {
          id: scan.id,
          symbol: scan.pair?.symbol || 'Global',
          successfulScans: scan.successfulScans,
          opportunitiesFound: scan.opportunitiesFound
        }
      }))
    ];

    return activity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10);
  }

  private getTimeframeFilter(timeframe?: '1h' | '24h' | '7d' | '30d') {
    if (!timeframe) return {};
    
    const now = new Date();
    let startDate: Date;
    
    switch (timeframe) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        return {};
    }
    
    return {
      createdAt: {
        gte: startDate
      }
    };
  }

  private serializeScanStats(scanStats: any): SerializedScanStats {
    return {
      id: scanStats.id,
      pairId: scanStats.pairId,
      totalScans: scanStats.totalScans,
      successfulScans: scanStats.successfulScans,
      failedScans: scanStats.failedScans,
      opportunitiesFound: scanStats.opportunitiesFound,
      lastScanAt: scanStats.lastScanAt?.toISOString(),
      averageScanTime: serializeDecimal(scanStats.averageScanTime),
      minPrice: serializeDecimal(scanStats.minPrice),
      maxPrice: serializeDecimal(scanStats.maxPrice),
      avgPrice: serializeDecimal(scanStats.avgPrice),
      createdAt: scanStats.createdAt.toISOString(),
      updatedAt: scanStats.updatedAt.toISOString()
    };
  }
}