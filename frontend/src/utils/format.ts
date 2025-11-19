import Decimal from 'decimal.js';

Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export const formatCurrency = (value: string | number | Decimal, currency: string = 'USD'): string => {
  const decimal = new Decimal(value);
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  });

  return formatter.format(decimal.toNumber());
};

export const formatPercentage = (value: string | number | Decimal, decimals: number = 2): string => {
  const decimal = new Decimal(value);
  return decimal.toFixed(decimals) + '%';
};

export const formatNumber = (value: string | number | Decimal, decimals: number = 2): string => {
  const decimal = new Decimal(value);
  return decimal.toFixed(decimals);
};

export const formatLargeNumber = (value: string | number | Decimal): string => {
  const decimal = new Decimal(value);
  const num = decimal.toNumber();

  if (Math.abs(num) >= 1e9) {
    return (num / 1e9).toFixed(2) + 'B';
  }

  if (Math.abs(num) >= 1e6) {
    return (num / 1e6).toFixed(2) + 'M';
  }

  if (Math.abs(num) >= 1e3) {
    return (num / 1e3).toFixed(2) + 'K';
  }

  return decimal.toFixed(2);
};

export const parseDecimal = (value: string | number | Decimal): Decimal => {
  return new Decimal(value);
};

export const addDecimals = (a: string | number | Decimal, b: string | number | Decimal): Decimal => {
  return new Decimal(a).plus(new Decimal(b));
};

export const subtractDecimals = (a: string | number | Decimal, b: string | number | Decimal): Decimal => {
  return new Decimal(a).minus(new Decimal(b));
};

export const multiplyDecimals = (a: string | number | Decimal, b: string | number | Decimal): Decimal => {
  return new Decimal(a).times(new Decimal(b));
};

export const divideDecimals = (a: string | number | Decimal, b: string | number | Decimal): Decimal => {
  return new Decimal(a).dividedBy(new Decimal(b));
};

export const compareDecimals = (a: string | number | Decimal, b: string | number | Decimal): number => {
  return new Decimal(a).comparedTo(new Decimal(b));
};

export const formatDate = (date: string | Date): string => {
  const d = new Date(date);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - d.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return formatDate(date);
};

export const formatDuration = (seconds: number): string => {
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  return `${Math.floor(seconds / 3600)}h`;
};
