import { Decimal } from '@prisma/client';
import { PrismaClient } from '@prisma/client';
import { 
  SerializedPair, 
  ServiceDependencies 
} from '../types/index.js';

export class PairService {
  private prisma: PrismaClient;
  private logger: any;
  private metrics: any;

  constructor(deps: ServiceDependencies) {
    this.prisma = deps.prisma;
    this.logger = deps.logger;
    this.metrics = deps.metrics;
  }

  async getTopPairs(limit: number = 10): Promise<SerializedPair[]> {
    const startTime = Date.now();
    
    try {
      const pairs = await this.prisma.pair.findMany({
        where: {
          isActive: true
        },
        take: Math.min(limit, 50), // Max 50 pairs
        include: {
          _count: {
            select: {
              opportunities: {
                where: {
                  status: {
                    in: ['PENDING', 'ACTIVE']
                  },
                  expiresAt: {
                    gte: new Date()
                  }
                }
              },
              scanStats: true
            }
          }
        },
        orderBy: [
          {
            opportunities: {
              _count: 'desc'
            }
          },
          {
            updatedAt: 'desc'
          }
        ]
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findMany', 'pair', (Date.now() - startTime) / 1000);
      }

      return pairs.map(pair => this.serializePair(pair));
    } catch (error) {
      this.logger.error('Failed to get top pairs', { error, limit });
      throw error;
    }
  }

  async getPairById(id: number): Promise<SerializedPair | null> {
    const startTime = Date.now();
    
    try {
      const pair = await this.prisma.pair.findUnique({
        where: { id },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true
            }
          }
        }
      });

      recordDatabaseMetric('findUnique', 'pair', (Date.now() - startTime) / 1000);

      if (!pair) {
        return null;
      }

      return this.serializePair(pair);
    } catch (error) {
      this.logger.error('Failed to get pair by ID', { error, id });
      throw error;
    }
  }

  async getPairBySymbol(symbol: string): Promise<SerializedPair | null> {
    const startTime = Date.now();
    
    try {
      const pair = await this.prisma.pair.findUnique({
        where: { symbol: symbol.toUpperCase() },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true
            }
          }
        }
      });

      recordDatabaseMetric('findUnique', 'pair', (Date.now() - startTime) / 1000);

      if (!pair) {
        return null;
      }

      return this.serializePair(pair);
    } catch (error) {
      this.logger.error('Failed to get pair by symbol', { error, symbol });
      throw error;
    }
  }

  async getAllPairs(activeOnly: boolean = true): Promise<SerializedPair[]> {
    const startTime = Date.now();
    
    try {
      const where = activeOnly ? { isActive: true } : {};
      
      const pairs = await this.prisma.pair.findMany({
        where,
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true
            }
          }
        },
        orderBy: {
          symbol: 'asc'
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('findMany', 'pair', (Date.now() - startTime) / 1000);
      }

      return pairs.map(pair => this.serializePair(pair));
    } catch (error) {
      this.logger.error('Failed to get all pairs', { error, activeOnly });
      throw error;
    }
  }

  async createPair(data: {
    symbol: string;
    baseAsset: string;
    quoteAsset: string;
    isActive?: boolean;
  }): Promise<SerializedPair> {
    const startTime = Date.now();
    
    try {
      const pair = await this.prisma.pair.create({
        data: {
          symbol: data.symbol.toUpperCase(),
          baseAsset: data.baseAsset.toUpperCase(),
          quoteAsset: data.quoteAsset.toUpperCase(),
          isActive: data.isActive ?? true
        },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true
            }
          }
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('create', 'pair', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Pair created', { 
        id: pair.id, 
        symbol: pair.symbol,
        baseAsset: pair.baseAsset,
        quoteAsset: pair.quoteAsset
      });

      return this.serializePair(pair);
    } catch (error) {
      this.logger.error('Failed to create pair', { error, data });
      throw error;
    }
  }

  async updatePairStatus(id: number, isActive: boolean): Promise<SerializedPair> {
    const startTime = Date.now();
    
    try {
      const pair = await this.prisma.pair.update({
        where: { id },
        data: { isActive },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true
            }
          }
        }
      });

      if (this.metrics && this.metrics.record) {
        this.metrics.record('update', 'pair', (Date.now() - startTime) / 1000);
      }

      this.logger.info('Pair status updated', { 
        id, 
        symbol: pair.symbol,
        isActive
      });

      return this.serializePair(pair);
    } catch (error) {
      this.logger.error('Failed to update pair status', { error, id, isActive });
      throw error;
    }
  }

  private serializePair(pair: any): SerializedPair {
    return {
      id: pair.id,
      symbol: pair.symbol,
      baseAsset: pair.baseAsset,
      quoteAsset: pair.quoteAsset,
      isActive: pair.isActive,
      createdAt: pair.createdAt.toISOString(),
      updatedAt: pair.updatedAt.toISOString(),
      _count: pair._count
    };
  }
}