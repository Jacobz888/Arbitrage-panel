import { PairService } from '../../src/services/pairService.js';
import { PrismaClient } from '@prisma/client';
import { Decimal } from '@prisma/client';

// Mock the Decimal class
jest.mock('@prisma/client', () => ({
  ...jest.requireActual('@prisma/client'),
  Decimal: jest.fn().mockImplementation((value: string | number) => ({
    toString: () => String(value),
    toNumber: () => Number(value),
    equals: jest.fn().mockReturnValue(false),
    minus: jest.fn().mockReturnThis(),
    plus: jest.fn().mockReturnThis(),
    times: jest.fn().mockReturnThis(),
    div: jest.fn().mockReturnThis(),
  })),
}));

describe('PairService', () => {
  let pairService: PairService;
  let mockPrisma: jest.Mocked<PrismaClient>;
  let mockLogger: any;

  beforeEach(() => {
    mockLogger = {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    };

    mockPrisma = new PrismaClient() as jest.Mocked<PrismaClient>;
    
    pairService = new PairService({
      prisma: mockPrisma,
      logger: mockLogger,
      metrics: { record: jest.fn() },
    });
  });

  describe('getTopPairs', () => {
    it('should return top pairs with opportunity counts', async () => {
      const mockPairs = [
        {
          id: 1,
          symbol: 'BTC/USDT',
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            opportunities: 10,
            scanStats: 5,
          },
        },
        {
          id: 2,
          symbol: 'ETH/USDT',
          baseAsset: 'ETH',
          quoteAsset: 'USDT',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: {
            opportunities: 5,
            scanStats: 3,
          },
        },
      ];

      mockPrisma.pair.findMany = jest.fn().mockResolvedValue(mockPairs);

      const result = await pairService.getTopPairs(10);

      expect(mockPrisma.pair.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        take: 10,
        include: {
          _count: {
            select: {
              opportunities: {
                where: {
                  status: {
                    in: ['PENDING', 'ACTIVE'],
                  },
                  expiresAt: {
                    gte: expect.any(Date),
                  },
                },
              },
              scanStats: true,
            },
          },
        },
        orderBy: [
          {
            opportunities: {
              _count: 'desc',
            },
          },
          {
            updatedAt: 'desc',
          },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: true,
        createdAt: mockPairs[0].createdAt.toISOString(),
        updatedAt: mockPairs[0].updatedAt.toISOString(),
        _count: { opportunities: 10, scanStats: 5 },
      });
    });

    it('should limit results to maximum 50 pairs', async () => {
      mockPrisma.pair.findMany = jest.fn().mockResolvedValue([]);

      await pairService.getTopPairs(100);

      expect(mockPrisma.pair.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
        })
      );
    });
  });

  describe('getPairById', () => {
    it('should return pair when found', async () => {
      const mockPair = {
        id: 1,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          opportunities: 10,
          scanStats: 5,
        },
      };

      mockPrisma.pair.findUnique = jest.fn().mockResolvedValue(mockPair);

      const result = await pairService.getPairById(1);

      expect(mockPrisma.pair.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 1,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: true,
        createdAt: mockPair.createdAt.toISOString(),
        updatedAt: mockPair.updatedAt.toISOString(),
        _count: { opportunities: 10, scanStats: 5 },
      });
    });

    it('should return null when pair not found', async () => {
      mockPrisma.pair.findUnique = jest.fn().mockResolvedValue(null);

      const result = await pairService.getPairById(999);

      expect(result).toBeNull();
    });
  });

  describe('createPair', () => {
    it('should create a new pair', async () => {
      const pairData = {
        symbol: 'ADA/USDT',
        baseAsset: 'ADA',
        quoteAsset: 'USDT',
      };

      const mockCreatedPair = {
        id: 3,
        symbol: 'ADA/USDT',
        baseAsset: 'ADA',
        quoteAsset: 'USDT',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          opportunities: 0,
          scanStats: 0,
        },
      };

      mockPrisma.pair.create = jest.fn().mockResolvedValue(mockCreatedPair);

      const result = await pairService.createPair(pairData);

      expect(mockPrisma.pair.create).toHaveBeenCalledWith({
        data: {
          symbol: 'ADA/USDT',
          baseAsset: 'ADA',
          quoteAsset: 'USDT',
          isActive: true,
        },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true,
            },
          },
        },
      });

      expect(result).toEqual({
        id: 3,
        symbol: 'ADA/USDT',
        baseAsset: 'ADA',
        quoteAsset: 'USDT',
        isActive: true,
        createdAt: mockCreatedPair.createdAt.toISOString(),
        updatedAt: mockCreatedPair.updatedAt.toISOString(),
        _count: { opportunities: 0, scanStats: 0 },
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Pair created', {
        id: 3,
        symbol: 'ADA/USDT',
        baseAsset: 'ADA',
        quoteAsset: 'USDT',
      });
    });
  });

  describe('updatePairStatus', () => {
    it('should update pair status', async () => {
      const mockUpdatedPair = {
        id: 1,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: {
          opportunities: 10,
          scanStats: 5,
        },
      };

      mockPrisma.pair.update = jest.fn().mockResolvedValue(mockUpdatedPair);

      const result = await pairService.updatePairStatus(1, false);

      expect(mockPrisma.pair.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { isActive: false },
        include: {
          _count: {
            select: {
              opportunities: true,
              scanStats: true,
            },
          },
        },
      });

      expect(result.isActive).toBe(false);
      expect(mockLogger.info).toHaveBeenCalledWith('Pair status updated', {
        id: 1,
        symbol: 'BTC/USDT',
        isActive: false,
      });
    });
  });
});