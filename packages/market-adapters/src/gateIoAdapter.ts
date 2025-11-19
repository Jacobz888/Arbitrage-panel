import axios, { AxiosInstance } from 'axios';
import Decimal from 'decimal.js';
import { AdapterOptions, BaseMarketAdapter, MarketQuote } from './baseAdapter.js';

export interface GateAdapterOptions extends AdapterOptions {
  apiKey?: string;
  apiSecret?: string;
  baseUrl?: string;
}

export class GateIoAdapter extends BaseMarketAdapter {
  name = 'Gate.io';
  private apiKey?: string;
  private apiSecret?: string;
  private http: AxiosInstance;

  constructor(options: GateAdapterOptions = {}) {
    super(options);
    this.apiKey = options.apiKey;
    this.apiSecret = options.apiSecret;
    this.http = axios.create({
      baseURL: options.baseUrl ?? 'https://api.gateio.ws/api/v4',
      timeout: 8000
    });
  }

  async connect(): Promise<void> {
    if (!this.mockMode && (!this.apiKey || !this.apiSecret)) {
      this.log('warn', 'Gate.io adapter missing API credentials, entering mock mode');
      this.mockMode = true;
    }

    this.connected = true;
    this.log('info', 'Gate.io adapter connected', { mock: this.mockMode });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.log('info', 'Gate.io adapter disconnected');
  }

  async getPrice(pair: string): Promise<Decimal> {
    const normalized = this.normalizePair(pair);
    const quote = await this.schedule(() => this.fetchTicker(normalized));
    return quote.price;
  }

  async getVolume(pair: string): Promise<Decimal> {
    const normalized = this.normalizePair(pair);
    const quote = await this.schedule(() => this.fetchTicker(normalized));
    return quote.volume;
  }

  private async fetchTicker(pair: string): Promise<MarketQuote> {
    if (this.mockMode) {
      return this.generateMockQuote(pair);
    }

    try {
      const response = await this.http.get('/spot/tickers', {
        params: { currency_pair: this.pairForRest(pair) }
      });

      const [ticker] = response.data ?? [];
      if (!ticker) {
        throw new Error('No ticker data returned from Gate.io');
      }

      const price = this.decimalFrom(ticker.last);
      const volume = this.decimalFrom(ticker.quote_volume ?? ticker.base_volume ?? '0');

      return {
        price,
        volume,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log('warn', 'Gate.io API request failed, falling back to mock data', {
        pair,
        error: error instanceof Error ? error.message : 'unknown'
      });
      return this.generateMockQuote(pair);
    }
  }

  private generateMockQuote(pair: string): MarketQuote {
    const basePrices: Record<string, number> = {
      'BTC/USDT': 45000,
      'ETH/USDT': 2500,
      'APE/USDT': 1.5,
      'MANA/USDT': 0.5,
      'BNB/USDT': 300
    };

    const basePrice = basePrices[pair] ?? 50;
    const price = new Decimal((basePrice + Math.random() * basePrice * 0.02).toFixed(6));
    const volume = new Decimal((100000 + Math.random() * 50000).toFixed(2));

    return {
      price,
      volume,
      timestamp: Date.now()
    };
  }
}
