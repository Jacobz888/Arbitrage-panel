import { describe, it, expect } from 'vitest';
import { Decimal } from '@prisma/client';
import {
  serializeDecimal,
  deserializeDecimal,
  formatPrice,
  formatPercentage,
  calculateSpread,
  calculateProfitEstimate,
} from '../../src/utils/decimal.js';

describe('Decimal Utilities', () => {
  describe('serializeDecimal', () => {
    it('converts Decimal to string', () => {
      const decimal = new Decimal('123.456789');
      expect(serializeDecimal(decimal)).toBe('123.456789');
    });

    it('handles null values', () => {
      expect(serializeDecimal(null)).toBe('0');
    });

    it('handles undefined values', () => {
      expect(serializeDecimal(undefined)).toBe('0');
    });
  });

  describe('deserializeDecimal', () => {
    it('converts string to Decimal', () => {
      const result = deserializeDecimal('123.456');
      expect(result.toString()).toBe('123.456');
    });

    it('converts number to Decimal', () => {
      const result = deserializeDecimal(123.456);
      expect(result.toNumber()).toBeCloseTo(123.456, 3);
    });

    it('handles null values', () => {
      const result = deserializeDecimal(null);
      expect(result.toString()).toBe('0');
    });

    it('handles undefined values', () => {
      const result = deserializeDecimal(undefined);
      expect(result.toString()).toBe('0');
    });
  });

  describe('formatPrice', () => {
    it('formats price with default 6 decimals', () => {
      const price = new Decimal('123.456789123');
      expect(formatPrice(price)).toBe('123.456789');
    });

    it('formats price with custom decimals', () => {
      const price = new Decimal('123.456789');
      expect(formatPrice(price, 2)).toBe('123.46');
    });

    it('handles null values', () => {
      expect(formatPrice(null)).toBe('0');
    });

    it('handles very small prices', () => {
      const price = new Decimal('0.000001234');
      expect(formatPrice(price, 8)).toBe('0.00000123');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentage with default 2 decimals', () => {
      const percent = new Decimal('12.3456');
      expect(formatPercentage(percent)).toBe('12.35%');
    });

    it('formats percentage with custom decimals', () => {
      const percent = new Decimal('12.3456');
      expect(formatPercentage(percent, 4)).toBe('12.3456%');
    });

    it('handles null values', () => {
      expect(formatPercentage(null)).toBe('0.00%');
    });

    it('handles negative percentages', () => {
      const percent = new Decimal('-5.67');
      expect(formatPercentage(percent)).toBe('-5.67%');
    });
  });

  describe('calculateSpread', () => {
    it('calculates positive spread correctly', () => {
      const buyPrice = new Decimal('100');
      const sellPrice = new Decimal('105');
      const spread = calculateSpread(buyPrice, sellPrice);
      expect(spread.toNumber()).toBeCloseTo(5, 5);
    });

    it('calculates negative spread correctly', () => {
      const buyPrice = new Decimal('105');
      const sellPrice = new Decimal('100');
      const spread = calculateSpread(buyPrice, sellPrice);
      expect(spread.toNumber()).toBeCloseTo(-4.762, 3);
    });

    it('handles zero buy price', () => {
      const buyPrice = new Decimal('0');
      const sellPrice = new Decimal('100');
      const spread = calculateSpread(buyPrice, sellPrice);
      expect(spread.toString()).toBe('0');
    });

    it('calculates spread with precision for Gate vs Kyber prices', () => {
      // Gate.io price (8 decimals)
      const gateBuyPrice = new Decimal('0.12345678');
      // Kyber price (18 decimals precision, but typical 8 decimal display)
      const kyberSellPrice = new Decimal('0.12456789');
      
      const spread = calculateSpread(gateBuyPrice, kyberSellPrice);
      // (0.12456789 - 0.12345678) / 0.12345678 * 100 = 0.899...%
      expect(spread.toNumber()).toBeCloseTo(0.899, 2);
    });

    it('maintains precision with very small spreads', () => {
      const buyPrice = new Decimal('1234.56789012');
      const sellPrice = new Decimal('1234.56890123');
      const spread = calculateSpread(buyPrice, sellPrice);
      // Should not lose precision on small differences
      expect(spread.toNumber()).toBeCloseTo(0.0000819, 7);
    });
  });

  describe('calculateProfitEstimate', () => {
    it('calculates profit with default fee rate', () => {
      const spread = new Decimal('5'); // 5%
      const volume = new Decimal('10000'); // $10,000
      const profit = calculateProfitEstimate(spread, volume);
      
      // Gross profit: 5% of 10000 = 500
      // Fees: 0.1% * 10000 * 2 = 20
      // Net profit: 500 - 20 = 480
      expect(profit.toNumber()).toBeCloseTo(480, 2);
    });

    it('calculates profit with custom fee rate', () => {
      const spread = new Decimal('3'); // 3%
      const volume = new Decimal('5000'); // $5,000
      const feeRate = new Decimal('0.002'); // 0.2%
      const profit = calculateProfitEstimate(spread, volume, feeRate);
      
      // Gross profit: 3% of 5000 = 150
      // Fees: 0.2% * 5000 * 2 = 20
      // Net profit: 150 - 20 = 130
      expect(profit.toNumber()).toBeCloseTo(130, 2);
    });

    it('handles negative profit scenarios', () => {
      const spread = new Decimal('0.1'); // 0.1%
      const volume = new Decimal('10000'); // $10,000
      const profit = calculateProfitEstimate(spread, volume);
      
      // Gross profit: 0.1% of 10000 = 10
      // Fees: 0.1% * 10000 * 2 = 20
      // Net profit: 10 - 20 = -10 (loss)
      expect(profit.toNumber()).toBeCloseTo(-10, 2);
    });

    it('maintains precision for high-value trades', () => {
      const spread = new Decimal('2.5'); // 2.5%
      const volume = new Decimal('100000'); // $100,000
      const profit = calculateProfitEstimate(spread, volume);
      
      // Gross profit: 2.5% of 100000 = 2500
      // Fees: 0.1% * 100000 * 2 = 200
      // Net profit: 2500 - 200 = 2300
      expect(profit.toNumber()).toBeCloseTo(2300, 2);
    });
  });
});
