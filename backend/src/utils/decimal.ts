import { Decimal } from '@prisma/client';

export function serializeDecimal(decimal: Decimal | null | undefined): string {
  if (!decimal) return '0';
  return decimal.toString();
}

export function deserializeDecimal(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined) return new Decimal(0);
  return new Decimal(value);
}

export function formatPrice(decimal: Decimal | null | undefined, decimals: number = 6): string {
  if (!decimal) return '0';
  return decimal.toFixed(decimals);
}

export function formatPercentage(decimal: Decimal | null | undefined, decimals: number = 2): string {
  if (!decimal) return '0.00%';
  return `${decimal.toFixed(decimals)}%`;
}

export function calculateSpread(buyPrice: Decimal, sellPrice: Decimal): Decimal {
  if (buyPrice.equals(0)) return new Decimal(0);
  return sellPrice.minus(buyPrice).div(buyPrice).times(100);
}

export function calculateProfitEstimate(
  spread: Decimal,
  volume: Decimal,
  feeRate: Decimal = new Decimal('0.001') // 0.1% default fee
): Decimal {
  const grossProfit = spread.div(100).times(volume);
  const fees = volume.times(feeRate).times(2); // Buy and sell fees
  return grossProfit.minus(fees);
}