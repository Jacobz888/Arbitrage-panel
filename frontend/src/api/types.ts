export interface Pair {
  id: number;
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Opportunity {
  id: number;
  pairId: number;
  pair?: Pair;
  buyExchange: string;
  sellExchange: string;
  buyPrice: string | number;
  sellPrice: string | number;
  spread: string | number;
  profitEstimate: string | number;
  volume: string | number;
  status: 'PENDING' | 'ACTIVE' | 'EXECUTED' | 'FAILED' | 'EXPIRED';
  executedAt?: string | null;
  expiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanStats {
  id: number;
  pairId?: number | null;
  pair?: Pair | null;
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  opportunitiesFound: number;
  lastScanAt?: string | null;
  averageScanTime?: string | number | null;
  minPrice?: string | number | null;
  maxPrice?: string | number | null;
  avgPrice?: string | number | null;
  createdAt: string;
  updatedAt: string;
}

export interface OpportunityStats {
  totalOpportunities: number;
  activeOpportunities: number;
  executedOpportunities: number;
  failedOpportunities: number;
  expiredOpportunities: number;
  averageSpread: string | number;
  totalPotentialGain: string | number;
  averageDuration: number;
}

export interface ScanQueueStats {
  pending: number;
  processing: number;
  completed: number;
  failed: number;
}

export interface OverallStats {
  opportunities: OpportunityStats;
  scanStats: ScanStats;
  queueStats: ScanQueueStats;
}

export interface JobStatus {
  id: string;
  pairId?: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: string;
  updatedAt: string;
  result?: unknown;
}

export interface GetLatestOpportunitiesResponse {
  data: Opportunity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface Settings {
  id: number;
  key: string;
  value: string;
  description?: string;
  minSpread?: string | number | null;
  maxInvestment?: string | number | null;
  scanInterval?: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
