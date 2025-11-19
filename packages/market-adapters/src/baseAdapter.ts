import Bottleneck from 'bottleneck';
import Decimal from 'decimal.js';

export interface AdapterLogger {
  debug?: (msg: string, meta?: Record<string, unknown>) => void;
  info?: (msg: string, meta?: Record<string, unknown>) => void;
  warn?: (msg: string, meta?: Record<string, unknown>) => void;
  error?: (msg: string, meta?: Record<string, unknown>) => void;
}

export interface AdapterOptions {
  logger?: AdapterLogger;
  limiter?: Partial<Bottleneck.ConstructorOptions>;
  mock?: boolean;
}

export interface MarketQuote {
  price: Decimal;
  volume: Decimal;
  timestamp: number;
}

export abstract class BaseMarketAdapter {
  abstract name: string;
  protected connected = false;
  protected limiter: Bottleneck;
  protected logger: AdapterLogger;
  protected mockMode: boolean;

  constructor(options: AdapterOptions = {}) {
    this.logger = options.logger || console;
    this.mockMode = options.mock ?? false;
    this.limiter = new Bottleneck({
      minTime: 200,
      maxConcurrent: 1,
      ...options.limiter
    });
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;

  abstract getPrice(pair: string): Promise<Decimal>;
  abstract getVolume(pair: string): Promise<Decimal>;

  protected async schedule<T>(fn: () => Promise<T>): Promise<T> {
    return this.limiter.schedule(async () => fn());
  }

  protected normalizePair(pair: string): string {
    if (!pair) {
      throw new Error('Pair symbol is required');
    }

    const trimmed = pair.trim();
    if (trimmed.includes('/')) {
      return trimmed.toUpperCase();
    }

    // attempts to split by common quote assets
    const upper = trimmed.toUpperCase().replace(/[-_]/g, '');
    const quotes = ['USDT', 'USD', 'ETH', 'BTC', 'BNB'];
    for (const quote of quotes) {
      if (upper.endsWith(quote)) {
        const base = upper.slice(0, -quote.length);
        return `${base}/${quote}`;
      }
    }

    if (upper.length <= 6) {
      return `${upper}/USDT`;
    }

    return `${upper.slice(0, upper.length - 4)}/${upper.slice(-4)}`;
  }

  protected pairForRest(pair: string): string {
    return this.normalizePair(pair).replace('/', '_');
  }

  protected decimalFrom(value: string | number | Decimal): Decimal {
    if (value instanceof Decimal) {
      return value;
    }
    return new Decimal(value);
  }

  protected log(level: keyof AdapterLogger, msg: string, meta?: Record<string, unknown>): void {
    const fn = this.logger[level];
    if (fn) {
      fn(msg, meta);
    }
  }
}

export type MarketAdapter = Pick<BaseMarketAdapter, 'name' | 'connect' | 'disconnect' | 'getPrice' | 'getVolume'>;
