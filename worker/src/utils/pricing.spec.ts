import { describe, expect, it } from 'vitest';
import { Decimal } from '@prisma/client';
import {
  normalizePairSymbol,
  calculateSpread,
  calculatePotentialUsdGain,
  calculateAverageDuration,
  clampTradeSize
} from './pricing.js';

describe('pricing utilities', () => {
  it('normalizes pair symbols', () => {
    expect(normalizePairSymbol('btc_usdt')).toBe('BTC/USDT');
    expect(normalizePairSymbol(' ethusd ')).toBe('ETH/USD');
    expect(normalizePairSymbol('MANA/USDT')).toBe('MANA/USDT');
  });

  it('calculates spreads using Decimal precision', () => {
    const spread = calculateSpread('100', '105');
    expect(spread.toNumber()).toBeCloseTo(5, 5);
  });

  it('derives profit estimates in USD', () => {
    const spread = new Decimal('2.5');
    const gain = calculatePotentialUsdGain(spread, '10000');
    expect(gain.toNumber()).toBeCloseTo(250, 5);
  });

  it('clamps trade size to available volume', () => {
    const maxInvestment = new Decimal('5000');
    const available = new Decimal('1200');
    expect(clampTradeSize(maxInvestment, available).toString()).toBe('1200');
  });

  it('calculates average durations safely', () => {
    const average = calculateAverageDuration([100, 120, 80], 90);
    expect(average).toBe(98);
  });
});
