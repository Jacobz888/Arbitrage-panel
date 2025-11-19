import axios, { AxiosInstance } from 'axios';
import Decimal from 'decimal.js';
import { formatUnits, parseUnits } from 'ethers';
import { AdapterOptions, BaseMarketAdapter, MarketQuote } from './baseAdapter.js';

export interface KyberAdapterOptions extends AdapterOptions {
  rpcUrl?: string;
  chainId?: number;
  baseUrl?: string;
}

export class KyberAdapter extends BaseMarketAdapter {
  name = 'KyberSwap';
  private rpcUrl?: string;
  private chainId: number;
  private http: AxiosInstance;

  constructor(options: KyberAdapterOptions = {}) {
    super({ ...options, mock: options.mock ?? !options.rpcUrl });
    this.rpcUrl = options.rpcUrl;
    this.chainId = options.chainId ?? 1;
    this.http = axios.create({
      baseURL: options.baseUrl ?? 'https://api.kyber.org',
      timeout: 8000
    });
  }

  async connect(): Promise<void> {
    if (!this.rpcUrl) {
      this.log('warn', 'Kyber adapter running without RPC URL, mock quotes will be used');
    }
    this.connected = true;
    this.log('info', 'Kyber adapter connected', { mock: this.mockMode, chainId: this.chainId });
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.log('info', 'Kyber adapter disconnected');
  }

  async getPrice(pair: string): Promise<Decimal> {
    const normalized = this.normalizePair(pair);
    const quote = await this.schedule(() => this.fetchQuote(normalized));
    return quote.price;
  }

  async getVolume(pair: string): Promise<Decimal> {
    const normalized = this.normalizePair(pair);
    const quote = await this.schedule(() => this.fetchQuote(normalized));
    return quote.volume;
  }

  private async fetchQuote(pair: string): Promise<MarketQuote> {
    if (this.mockMode) {
      return this.generateMockQuote(pair);
    }

    try {
      const response = await this.http.get('/market/tickers');
      const tickers = response.data?.data ?? response.data ?? [];
      const formattedPair = pair.replace('/', '-');
      const ticker = Array.isArray(tickers)
        ? tickers.find((item: any) => item.symbol === formattedPair || item.pair === formattedPair)
        : tickers[formattedPair];

      if (!ticker) {
        throw new Error(`Pair ${pair} not found in Kyber tickers`);
      }

      const decimals: number = typeof ticker.priceDecimals === 'number' ? ticker.priceDecimals : 6;
      const rawPrice = ticker.lastPrice ?? ticker.price ?? ticker.midPrice;
      const rawVolume = ticker.quoteVolume ?? ticker.baseVolume ?? 0;

      const price = this.parseDecimal(rawPrice, decimals);
      const volume = this.parseDecimal(rawVolume, 2);

      return {
        price,
        volume,
        timestamp: Date.now()
      };
    } catch (error) {
      this.log('warn', 'Kyber API request failed, falling back to mock data', {
        pair,
        error: error instanceof Error ? error.message : 'unknown'
      });
      return this.generateMockQuote(pair);
    }
  }

  private parseDecimal(value: string | number, decimals: number): Decimal {
    const raw = typeof value === 'number' ? value.toFixed(decimals) : value?.toString() ?? '0';
    const units = parseUnits(raw, decimals);
    const normalized = formatUnits(units, decimals);
    return new Decimal(normalized);
  }

  private generateMockQuote(pair: string): MarketQuote {
    const basePrices: Record<string, number> = {
      'BTC/USDT': 45150,
      'ETH/USDT': 2515,
      'APE/USDT': 1.52,
      'MANA/USDT': 0.51,
      'BNB/USDT': 301
    };

    const basePrice = basePrices[pair] ?? 52;
    const noise = 1 + (Math.random() - 0.5) * 0.03;
    const price = new Decimal((basePrice * noise).toFixed(6));
    const volume = new Decimal((80000 + Math.random() * 32000).toFixed(2));

    return {
      price,
      volume,
      timestamp: Date.now()
    };
  }
}
