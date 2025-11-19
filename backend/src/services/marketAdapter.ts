import { Decimal } from '@prisma/client';
import { MarketAdapter } from '../../types/index.js';

export abstract class BaseMarketAdapter implements MarketAdapter {
  abstract name: string;
  protected connected: boolean = false;
  protected logger: any;

  constructor(logger: any) {
    this.logger = logger;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract getPrice(pair: string): Promise<Decimal>;
  abstract getVolume(pair: string): Promise<Decimal>;

  isConnected(): boolean {
    return this.connected;
  }

  protected validatePair(pair: string): boolean {
    // Basic pair validation (e.g., "BTC/USDT", "ETH/USDT")
    const pairRegex = /^[A-Z0-9]+\/[A-Z0-9]+$/;
    return pairRegex.test(pair);
  }

  protected normalizePair(pair: string): string {
    // Normalize pair format (e.g., "btcusdt" -> "BTC/USDT")
    if (pair.includes('/')) return pair.toUpperCase();
    
    // Try to detect common patterns
    const commonQuotes = ['USDT', 'USD', 'BTC', 'ETH', 'BNB'];
    for (const quote of commonQuotes) {
      if (pair.endsWith(quote.toLowerCase())) {
        const base = pair.slice(0, -quote.length);
        return `${base.toUpperCase()}/${quote}`;
      }
    }
    
    // Default to USDT if we can't determine
    return `${pair.slice(0, -4).toUpperCase()}/USDT`;
  }
}