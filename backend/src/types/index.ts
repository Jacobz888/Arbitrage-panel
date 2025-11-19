import { Decimal } from '@prisma/client';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OpportunityStatusIndicator {
  status: 'green' | 'purple' | 'yellow' | 'red';
  label: string;
  description: string;
}

export interface SerializedOpportunity {
  id: number;
  pairId: number;
  buyExchange: string;
  sellExchange: string;
  buyPrice: string;
  sellPrice: string;
  spread: string;
  profitEstimate: string;
  volume: string;
  status: string;
  executedAt?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
  statusIndicator: OpportunityStatusIndicator;
}

export interface SerializedPair {
  id: number;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    opportunities: number;
    scanStats: number;
  };
}

export interface SerializedScanStats {
  id: number;
  pairId?: number;
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  opportunitiesFound: number;
  lastScanAt?: string;
  averageScanTime?: string;
  minPrice?: string;
  maxPrice?: string;
  avgPrice?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SerializedSettings {
  id: number;
  key: string;
  value: string;
  description?: string;
  minSpread?: string;
  maxInvestment?: string;
  scanInterval?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ScanJobRequest {
  pairId?: number;
  force?: boolean;
}

export interface ScanJobResponse {
  jobId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  estimatedDuration?: number;
  queuedAt: string;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  database: 'connected' | 'disconnected' | 'error';
  redis: 'connected' | 'disconnected' | 'error';
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
}

export interface MarketAdapter {
  name: string;
  isConnected(): boolean;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getPrice(pair: string): Promise<Decimal>;
  getVolume(pair: string): Promise<Decimal>;
}

export interface ServiceDependencies {
  prisma: any;
  logger: any;
  metrics: any;
  gateAdapter?: MarketAdapter;
  kyberAdapter?: MarketAdapter;
}