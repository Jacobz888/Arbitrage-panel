import { Decimal } from '@prisma/client';

export type DecimalLike = Decimal | string | number;

export function normalizePairSymbol(symbol: string): string {
  if (!symbol) {
    throw new Error('Pair symbol is required');
  }

  const trimmed = symbol.trim().toUpperCase();
  if (trimmed.includes('/')) {
    return trimmed;
  }

  const sanitized = trimmed.replace(/[-_]/g, '');
  const quotes = ['USDT', 'USD', 'BTC', 'ETH'];
  for (const quote of quotes) {
    if (sanitized.endsWith(quote)) {
      const base = sanitized.slice(0, -quote.length);
      return `${base}/${quote}`;
    }
  }

  return `${sanitized}/USDT`;
}

export function calculateSpread(buyPrice: DecimalLike, sellPrice: DecimalLike): Decimal {
  const buy = new Decimal(buyPrice);
  const sell = new Decimal(sellPrice);
  if (buy.equals(0)) {
    return new Decimal(0);
  }

  return sell.minus(buy).div(buy).times(100);
}

export function calculatePotentialUsdGain(spread: Decimal, notional: DecimalLike): Decimal {
  const tradeNotional = new Decimal(notional);
  return spread.div(100).times(tradeNotional);
}

export function calculateAverageDuration(history: number[], latest: number): number {
  const values = [...history, latest].filter(value => Number.isFinite(value) && value >= 0);
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((acc, value) => acc + value, 0);
  return Math.round(total / values.length);
}

export function clampTradeSize(maxInvestment: Decimal, availableVolume: Decimal): Decimal {
  return Decimal.min(maxInvestment, availableVolume);
}
