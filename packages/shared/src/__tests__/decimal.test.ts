import { describe, it, expect } from 'vitest';
import {
  createDecimal,
  addDecimals,
  subtractDecimals,
  multiplyDecimals,
  divideDecimals,
  compareDecimals,
  decimalToString,
  Decimal,
} from '../decimal.js';

describe('Shared Decimal Utilities', () => {
  describe('createDecimal', () => {
    it('creates Decimal from string', () => {
      const result = createDecimal('123.456');
      expect(result.toString()).toBe('123.456');
    });

    it('creates Decimal from number', () => {
      const result = createDecimal(123.456);
      expect(result.toNumber()).toBeCloseTo(123.456, 3);
    });

    it('creates Decimal from another Decimal', () => {
      const original = new Decimal('123.456');
      const result = createDecimal(original);
      expect(result.toString()).toBe('123.456');
    });

    it('maintains high precision', () => {
      const result = createDecimal('123.456789012345678901234567');
      expect(result.toString()).toBe('123.456789012345678901234567');
    });
  });

  describe('addDecimals', () => {
    it('adds two Decimals correctly', () => {
      const a = new Decimal('100.5');
      const b = new Decimal('50.3');
      const result = addDecimals(a, b);
      expect(result.toString()).toBe('150.8');
    });

    it('maintains precision with small numbers', () => {
      const a = new Decimal('0.000000001');
      const b = new Decimal('0.000000002');
      const result = addDecimals(a, b);
      expect(result.toFixed(9)).toBe('0.000000003');
    });

    it('handles large numbers', () => {
      const a = new Decimal('999999999999.99');
      const b = new Decimal('0.01');
      const result = addDecimals(a, b);
      expect(result.toString()).toBe('1000000000000');
    });
  });

  describe('subtractDecimals', () => {
    it('subtracts two Decimals correctly', () => {
      const a = new Decimal('100.5');
      const b = new Decimal('50.3');
      const result = subtractDecimals(a, b);
      expect(result.toString()).toBe('50.2');
    });

    it('handles negative results', () => {
      const a = new Decimal('50.3');
      const b = new Decimal('100.5');
      const result = subtractDecimals(a, b);
      expect(result.toString()).toBe('-50.2');
    });

    it('maintains precision with small differences', () => {
      const a = new Decimal('1.000000001');
      const b = new Decimal('1.000000000');
      const result = subtractDecimals(a, b);
      expect(result.toFixed(9)).toBe('0.000000001');
    });
  });

  describe('multiplyDecimals', () => {
    it('multiplies two Decimals correctly', () => {
      const a = new Decimal('10.5');
      const b = new Decimal('2');
      const result = multiplyDecimals(a, b);
      expect(result.toString()).toBe('21');
    });

    it('handles decimal multiplication', () => {
      const a = new Decimal('0.1');
      const b = new Decimal('0.2');
      const result = multiplyDecimals(a, b);
      expect(result.toString()).toBe('0.02');
    });

    it('maintains precision with very small numbers', () => {
      const a = new Decimal('0.000001');
      const b = new Decimal('0.000001');
      const result = multiplyDecimals(a, b);
      expect(result.toFixed(12)).toBe('0.000000000001');
    });

    it('handles price normalization scenario (Gate vs Kyber)', () => {
      // Simulating price difference calculation
      const gatePrice = new Decimal('0.12345678'); // Gate.io precision
      const kyberPrice = new Decimal('0.12456789'); // Kyber precision
      const volume = new Decimal('10000');
      
      const difference = subtractDecimals(kyberPrice, gatePrice);
      const profit = multiplyDecimals(difference, volume);
      
      // (0.12456789 - 0.12345678) * 10000 = 11.11
      expect(profit.toNumber()).toBeCloseTo(11.11, 2);
    });
  });

  describe('divideDecimals', () => {
    it('divides two Decimals correctly', () => {
      const a = new Decimal('100');
      const b = new Decimal('4');
      const result = divideDecimals(a, b);
      expect(result.toString()).toBe('25');
    });

    it('handles decimal division', () => {
      const a = new Decimal('1');
      const b = new Decimal('3');
      const result = divideDecimals(a, b);
      expect(result.toFixed(10)).toBe('0.3333333333');
    });

    it('maintains precision for spread calculations', () => {
      const priceDiff = new Decimal('5');
      const buyPrice = new Decimal('100');
      const spreadPercent = multiplyDecimals(divideDecimals(priceDiff, buyPrice), new Decimal('100'));
      expect(spreadPercent.toString()).toBe('5');
    });
  });

  describe('compareDecimals', () => {
    it('returns positive when a > b', () => {
      const a = new Decimal('100');
      const b = new Decimal('50');
      expect(compareDecimals(a, b)).toBeGreaterThan(0);
    });

    it('returns negative when a < b', () => {
      const a = new Decimal('50');
      const b = new Decimal('100');
      expect(compareDecimals(a, b)).toBeLessThan(0);
    });

    it('returns zero when a equals b', () => {
      const a = new Decimal('100');
      const b = new Decimal('100');
      expect(compareDecimals(a, b)).toBe(0);
    });

    it('compares with precision', () => {
      const a = new Decimal('0.000000001');
      const b = new Decimal('0.000000002');
      expect(compareDecimals(a, b)).toBeLessThan(0);
    });
  });

  describe('decimalToString', () => {
    it('converts Decimal to string', () => {
      const decimal = new Decimal('123.456');
      expect(decimalToString(decimal)).toBe('123.456');
    });

    it('formats with specified decimal places', () => {
      const decimal = new Decimal('123.456789');
      expect(decimalToString(decimal, 2)).toBe('123.46');
    });

    it('formats with zero decimal places', () => {
      const decimal = new Decimal('123.456');
      expect(decimalToString(decimal, 0)).toBe('123');
    });

    it('formats with more decimal places than available', () => {
      const decimal = new Decimal('123.45');
      expect(decimalToString(decimal, 6)).toBe('123.450000');
    });
  });

  describe('Cross-exchange price normalization', () => {
    it('handles Gate.io 8-decimal precision', () => {
      const gatePrice = createDecimal('0.12345678');
      expect(decimalToString(gatePrice, 8)).toBe('0.12345678');
    });

    it('handles Kyber 18-decimal precision', () => {
      const kyberPrice = createDecimal('0.123456789012345678');
      expect(decimalToString(kyberPrice, 18)).toBe('0.123456789012345678');
    });

    it('normalizes prices for comparison', () => {
      const gatePrice = createDecimal('1.12345678');
      const kyberPrice = createDecimal('1.12456789');
      
      // Normalize to same precision (8 decimals)
      const gateNormalized = decimalToString(gatePrice, 8);
      const kyberNormalized = decimalToString(kyberPrice, 8);
      
      expect(gateNormalized).toBe('1.12345678');
      expect(kyberNormalized).toBe('1.12456789');
      
      // Calculate spread
      const diff = subtractDecimals(kyberPrice, gatePrice);
      const spread = multiplyDecimals(
        divideDecimals(diff, gatePrice),
        createDecimal('100')
      );
      
      expect(spread.toNumber()).toBeCloseTo(0.0989, 4);
    });
  });
});
