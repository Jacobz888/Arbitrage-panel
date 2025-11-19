import { Decimal } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { 
  PaginationParams, 
  PaginatedResponse, 
  SerializedOpportunity,
  ServiceDependencies 
} from '../types/index.js';
import { 
  serializeDecimal, 
  getStatusIndicator,
  calculateProfitEstimate 
} from '../utils/decimal.js';

export class OpportunityService {
  private prisma: PrismaClient;
  private logger: any;
  private metrics: any;

  constructor(deps: ServiceDependencies) {
    this.prisma = deps.prisma;
    this.logger = deps.logger;
    this.metrics = deps.metrics;
  }

  async getLatestOpportunities(
    pagination: PaginationParams
  ): Promise<PaginatedResponse<SerializedOpportunity>> {
    const startTime = Date.now();
    
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = pagination;

      const skip = (page - 1) * limit;
      const take = Math.min(limit, 100); // Max 100 per page

      const where = {
        status: {
          in: ['PENDING', 'ACTIVE']
        },
        expiresAt: {
          gte: new Date()
        }
      };

      const [opportunities, total] = await Promise.all([
        this.prisma.opportunity.findMany({
          where,
          skip,
          take,
          orderBy: {
            [sortBy]: sortOrder
          },
          include: {
            pair: {
              select: {
                symbol: true,
                baseAsset: true,
                quoteAsset: true
              }
            }
          }
        }),
        this.prisma.opportunity.count({ where })
      ]);

      const serializedOpportunities = opportunities.map(opp => this.serializeOpportunity(opp));

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findMany', 'opportunity', (Date.now() - startTime) / 1000);
      }

      return {
        success: true,
        data: serializedOpportunities,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      this.logger.error('Failed to get latest opportunities', { error, pagination });
      throw error;
    }
  }

  async getOpportunityById(id: number): Promise<SerializedOpportunity | null> {
    const startTime = Date.now();
    
    try {
      const opportunity = await this.prisma.opportunity.findUnique({
        where: { id },
        include: {
          pair: {
            select: {
              symbol: true,
              baseAsset: true,
              quoteAsset: true
            }
          }
        }
      });

      recordDatabaseMetric('findUnique', 'opportunity', (Date.now() - startTime) / 1000);

      if (!opportunity) {
        return null;
      }

      return this.serializeOpportunity(opportunity);
    } catch (error) {
      this.logger.error('Failed to get opportunity by ID', { error, id });
      throw error;
    }
  }

  async createOpportunity(data: {
    pairId: number;
    buyExchange: string;
    sellExchange: string;
    buyPrice: Decimal;
    sellPrice: Decimal;
    volume: Decimal;
    expiresAt?: Date;
  }): Promise<SerializedOpportunity> {
    const startTime = Date.now();
    
    try {
      const spread = this.calculateSpread(data.buyPrice, data.sellPrice);
      const profitEstimate = calculateProfitEstimate(spread, data.volume);

      const opportunity = await this.prisma.opportunity.create({
        data: {
          ...data,
          spread,
          profitEstimate,
          status: 'PENDING',
          expiresAt: data.expiresAt || new Date(Date.now() + 5 * 60 * 1000) // 5 minutes default
        },
        include: {
          pair: {
            select: {
              symbol: true,
              baseAsset: true,
              quoteAsset: true
            }
          }
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('create', 'opportunity', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Opportunity created', { 
        id: opportunity.id, 
        pairId: data.pairId,
        spread: spread.toString(),
        profitEstimate: profitEstimate.toString()
      });

      return this.serializeOpportunity(opportunity);
    } catch (error) {
      this.logger.error('Failed to create opportunity', { error, data });
      throw error;
    }
  }

  async updateOpportunityStatus(
    id: number, 
    status: 'PENDING' | 'ACTIVE' | 'EXECUTED' | 'FAILED' | 'EXPIRED'
  ): Promise<SerializedOpportunity> {
    const startTime = Date.now();
    
    try {
      const opportunity = await this.prisma.opportunity.update({
        where: { id },
        data: { 
          status,
          executedAt: status === 'EXECUTED' ? new Date() : undefined
        },
        include: {
          pair: {
            select: {
              symbol: true,
              baseAsset: true,
              quoteAsset: true
            }
          }
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('update', 'opportunity', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Opportunity status updated', { 
        id, 
        status,
        previousStatus: opportunity.status
      });

      return this.serializeOpportunity(opportunity);
    } catch (error) {
      this.logger.error('Failed to update opportunity status', { error, id, status });
      throw error;
    }
  }

  async getOpportunitiesByPair(pairId: number, limit: number = 10): Promise<SerializedOpportunity[]> {
    const startTime = Date.now();
    
    try {
      const opportunities = await this.prisma.opportunity.findMany({
        where: { pairId },
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          pair: {
            select: {
              symbol: true,
              baseAsset: true,
              quoteAsset: true
            }
          }
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findMany', 'opportunity', (Date.now() - startTime) / 1000);
      }

      return opportunities.map(opp => this.serializeOpportunity(opp));
    } catch (error) {
      this.logger.error('Failed to get opportunities by pair', { error, pairId, limit });
      throw error;
    }
  }

  private serializeOpportunity(opportunity: any): SerializedOpportunity {
    const spread = parseFloat(opportunity.spread.toString());
    const statusIndicator = getStatusIndicator(
      opportunity.status,
      spread,
      opportunity.expiresAt
    );

    return {
      id: opportunity.id,
      pairId: opportunity.pairId,
      buyExchange: opportunity.buyExchange,
      sellExchange: opportunity.sellExchange,
      buyPrice: serializeDecimal(opportunity.buyPrice),
      sellPrice: serializeDecimal(opportunity.sellPrice),
      spread: serializeDecimal(opportunity.spread),
      profitEstimate: serializeDecimal(opportunity.profitEstimate),
      volume: serializeDecimal(opportunity.volume),
      status: opportunity.status,
      executedAt: opportunity.executedAt?.toISOString(),
      expiresAt: opportunity.expiresAt?.toISOString(),
      createdAt: opportunity.createdAt.toISOString(),
      updatedAt: opportunity.updatedAt.toISOString(),
      statusIndicator
    };
  }

  private calculateSpread(buyPrice: Decimal, sellPrice: Decimal): Decimal {
    if (buyPrice.equals(0)) return new Decimal(0);
    return sellPrice.minus(buyPrice).div(buyPrice).times(100);
  }
}