import Decimal from 'decimal.js';

/**
 * Configure Decimal precision and rounding
 */
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Create a Decimal value from a string or number
 */
export const createDecimal = (value: string | number | Decimal): Decimal => {
  return new Decimal(value);
};

/**
 * Add two Decimal values
 */
export const addDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.plus(b);
};

/**
 * Subtract two Decimal values
 */
export const subtractDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.minus(b);
};

/**
 * Multiply two Decimal values
 */
export const multiplyDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.times(b);
};

/**
 * Divide two Decimal values
 */
export const divideDecimals = (a: Decimal, b: Decimal): Decimal => {
  return a.dividedBy(b);
};

/**
 * Compare two Decimal values
 */
export const compareDecimals = (a: Decimal, b: Decimal): number => {
  return a.comparedTo(b);
};

/**
 * Convert Decimal to string with specified decimal places
 */
export const decimalToString = (value: Decimal, decimalPlaces?: number): string => {
  if (decimalPlaces !== undefined) {
    return value.toFixed(decimalPlaces);
  }
  return value.toString();
};

export { Decimal };
