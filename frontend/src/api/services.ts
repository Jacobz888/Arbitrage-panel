import { apiClient } from './client.js';
import {
  Opportunity,
  Pair,
  OpportunityStats,
  ScanStats,
  OverallStats,
  JobStatus,
  GetLatestOpportunitiesResponse,
  Settings,
} from './types.js';

export const opportunityService = {
  async getLatest(page: number = 1, limit: number = 10, sortBy: string = 'createdAt', sortOrder: string = 'desc') {
    return apiClient.get<GetLatestOpportunitiesResponse>('/opportunities/latest', {
      params: { page, limit, sortBy, sortOrder },
    });
  },

  async getById(id: number) {
    return apiClient.get<Opportunity>(`/opportunities/${id}`);
  },

  async updateStatus(id: number, status: string) {
    return apiClient.put<Opportunity>(`/opportunities/${id}/status`, { status });
  },

  async getByPair(pairId: number, limit: number = 10) {
    return apiClient.get<Opportunity[]>(`/opportunities/pair/${pairId}`, { params: { limit } });
  },
};

export const pairService = {
  async getAll() {
    return apiClient.get<Pair[]>('/pairs');
  },

  async getTop() {
    return apiClient.get<Pair[]>('/pairs/top');
  },

  async getById(id: number) {
    return apiClient.get<Pair>(`/pairs/${id}`);
  },

  async getBySymbol(symbol: string) {
    return apiClient.get<Pair>(`/pairs/symbol/${symbol}`);
  },

  async create(data: { symbol: string; baseAsset: string; quoteAsset: string; isActive?: boolean }) {
    return apiClient.post<Pair>('/pairs', data);
  },

  async updateStatus(id: number, isActive: boolean) {
    return apiClient.put<Pair>(`/pairs/${id}/status`, { isActive });
  },
};

export const statsService = {
  async getOpportunityStats(timeframe?: string) {
    return apiClient.get<OpportunityStats>('/stats/opportunities', {
      params: timeframe ? { timeframe } : undefined,
    });
  },

  async getScanStats(timeframe?: string) {
    return apiClient.get<ScanStats>('/stats/scans', {
      params: timeframe ? { timeframe } : undefined,
    });
  },

  async getOverallStats(timeframe?: string) {
    return apiClient.get<OverallStats>('/stats/overall', {
      params: timeframe ? { timeframe } : undefined,
    });
  },

  async getDetailedScanStats(pairId?: number) {
    if (pairId) {
      return apiClient.get<ScanStats>(`/stats/scans/${pairId}`);
    }
    return apiClient.get<ScanStats>('/stats/scans/global');
  },
};

export const scanService = {
  async enqueueScan(pairId?: number, force: boolean = false) {
    return apiClient.post<JobStatus>('/scan', {
      pairId,
      force,
    });
  },

  async getJobStatus(jobId: string) {
    return apiClient.get<JobStatus>(`/scan/jobs/${jobId}`);
  },

  async getAllJobs() {
    return apiClient.get<JobStatus[]>('/scan/jobs');
  },

  async cancelJob(jobId: string) {
    return apiClient.delete<null>(`/scan/jobs/${jobId}`);
  },

  async getQueueStats() {
    return apiClient.get<{ pending: number; processing: number; completed: number; failed: number }>('/scan/queue/stats');
  },
};

export const settingsService = {
  async getAll() {
    return apiClient.get<Settings[]>('/settings');
  },

  async getByKey(key: string) {
    return apiClient.get<Settings>(`/settings/${key}`);
  },

  async update(key: string, value: string) {
    return apiClient.put<Settings>(`/settings/${key}`, { value });
  },
};

export const seedService = {
  async seed() {
    return apiClient.post<{ message: string; output?: string }>('/seed');
  },
};
