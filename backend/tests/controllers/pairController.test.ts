import request from 'supertest';
import express from 'express';
import { PairController } from '../../src/controllers/pairController.js';
import { PairService } from '../../src/services/pairService.js';

// Mock the PairService
jest.mock('../../src/services/pairService.js');

describe('PairController', () => {
  let app: express.Application;
  let pairController: PairController;
  let mockPairService: jest.Mocked<PairService>;

  beforeEach(() => {
    mockPairService = {
      getTopPairs: jest.fn(),
      getPairById: jest.fn(),
      getPairBySymbol: jest.fn(),
      getAllPairs: jest.fn(),
      createPair: jest.fn(),
      updatePairStatus: jest.fn(),
    } as any;

    pairController = new PairController(mockPairService);

    app = express();
    app.use(express.json());

    // Setup routes manually for testing
    app.get('/api/pairs/top', pairController.getTopPairs);
    app.get('/api/pairs/:id', pairController.getPairById);
    app.get('/api/pairs/symbol/:symbol', pairController.getPairBySymbol);
    app.get('/api/pairs', pairController.getAllPairs);
    app.post('/api/pairs', pairController.createPair);
    app.put('/api/pairs/:id/status', pairController.updatePairStatus);
  });

  describe('GET /api/pairs/top', () => {
    it('should return top pairs', async () => {
      const mockPairs = [
        {
          id: 1,
          symbol: 'BTC/USDT',
          baseAsset: 'BTC',
          quoteAsset: 'USDT',
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
          _count: { opportunities: 10, scanStats: 5 },
        },
      ];

      mockPairService.getTopPairs.mockResolvedValue(mockPairs);

      const response = await request(app)
        .get('/api/pairs/top')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPairs,
        message: 'Top pairs retrieved successfully',
      });

      expect(mockPairService.getTopPairs).toHaveBeenCalledWith(10); // default limit
    });

    it('should accept custom limit parameter', async () => {
      mockPairService.getTopPairs.mockResolvedValue([]);

      await request(app)
        .get('/api/pairs/top?limit=5')
        .expect(200);

      expect(mockPairService.getTopPairs).toHaveBeenCalledWith(5);
    });
  });

  describe('GET /api/pairs/:id', () => {
    it('should return pair when found', async () => {
      const mockPair = {
        id: 1,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: true,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        _count: { opportunities: 10, scanStats: 5 },
      };

      mockPairService.getPairById.mockResolvedValue(mockPair);

      const response = await request(app)
        .get('/api/pairs/1')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockPair,
        message: 'Pair retrieved successfully',
      });

      expect(mockPairService.getPairById).toHaveBeenCalledWith(1);
    });

    it('should return 404 when pair not found', async () => {
      mockPairService.getPairById.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/pairs/999')
        .expect(404);

      expect(response.body).toEqual({
        success: false,
        error: 'Pair not found',
      });
    });

    it('should validate ID parameter', async () => {
      const response = await request(app)
        .get('/api/pairs/invalid')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('POST /api/pairs', () => {
    it('should create a new pair', async () => {
      const newPairData = {
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
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        _count: { opportunities: 0, scanStats: 0 },
      };

      mockPairService.createPair.mockResolvedValue(mockCreatedPair);

      const response = await request(app)
        .post('/api/pairs')
        .send(newPairData)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: mockCreatedPair,
        message: 'Pair created successfully',
      });

      expect(mockPairService.createPair).toHaveBeenCalledWith(newPairData);
    });

    it('should validate request body', async () => {
      const invalidData = {
        symbol: '', // Empty symbol
        baseAsset: 'ADA',
        quoteAsset: 'USDT',
      };

      const response = await request(app)
        .post('/api/pairs')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });

  describe('PUT /api/pairs/:id/status', () => {
    it('should update pair status', async () => {
      const updateData = { isActive: false };
      const mockUpdatedPair = {
        id: 1,
        symbol: 'BTC/USDT',
        baseAsset: 'BTC',
        quoteAsset: 'USDT',
        isActive: false,
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z',
        _count: { opportunities: 10, scanStats: 5 },
      };

      mockPairService.updatePairStatus.mockResolvedValue(mockUpdatedPair);

      const response = await request(app)
        .put('/api/pairs/1/status')
        .send(updateData)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockUpdatedPair,
        message: 'Pair status updated to inactive',
      });

      expect(mockPairService.updatePairStatus).toHaveBeenCalledWith(1, false);
    });

    it('should validate request body', async () => {
      const invalidData = { isActive: 'not-a-boolean' };

      const response = await request(app)
        .put('/api/pairs/1/status')
        .send(invalidData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Validation failed');
    });
  });
});