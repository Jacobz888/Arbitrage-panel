import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  opportunityService,
  pairService,
  statsService,
  scanService,
  settingsService,
  seedService,
} from '../api/index.js';

// Queries
export const useLatestOpportunities = (page: number = 1, limit: number = 10) => {
  return useQuery({
    queryKey: ['opportunities', 'latest', page, limit],
    queryFn: () => opportunityService.getLatest(page, limit),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // 60 seconds
  });
};

export const useOpportunityById = (id: number) => {
  return useQuery({
    queryKey: ['opportunities', id],
    queryFn: () => opportunityService.getById(id),
    staleTime: 30 * 1000,
  });
};

export const useOpportunitiesByPair = (pairId: number, limit: number = 10) => {
  return useQuery({
    queryKey: ['opportunities', 'pair', pairId, limit],
    queryFn: () => opportunityService.getByPair(pairId, limit),
    staleTime: 30 * 1000,
  });
};

export const useAllPairs = () => {
  return useQuery({
    queryKey: ['pairs', 'all'],
    queryFn: () => pairService.getAll(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
};

export const useTopPairs = () => {
  return useQuery({
    queryKey: ['pairs', 'top'],
    queryFn: () => pairService.getTop(),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 10 * 60 * 1000,
  });
};

export const usePairById = (id: number) => {
  return useQuery({
    queryKey: ['pairs', id],
    queryFn: () => pairService.getById(id),
    staleTime: 5 * 60 * 1000,
  });
};

export const useOpportunityStats = (timeframe?: string) => {
  return useQuery({
    queryKey: ['stats', 'opportunities', timeframe],
    queryFn: () => statsService.getOpportunityStats(timeframe),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useScanStats = (timeframe?: string) => {
  return useQuery({
    queryKey: ['stats', 'scans', timeframe],
    queryFn: () => statsService.getScanStats(timeframe),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useOverallStats = (timeframe?: string) => {
  return useQuery({
    queryKey: ['stats', 'overall', timeframe],
    queryFn: () => statsService.getOverallStats(timeframe),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });
};

export const useDetailedScanStats = (pairId?: number) => {
  return useQuery({
    queryKey: ['stats', 'scans', 'detailed', pairId],
    queryFn: () => statsService.getDetailedScanStats(pairId),
    staleTime: 30 * 1000,
  });
};

export const useAllSettings = () => {
  return useQuery({
    queryKey: ['settings', 'all'],
    queryFn: () => settingsService.getAll(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useSettingByKey = (key: string) => {
  return useQuery({
    queryKey: ['settings', key],
    queryFn: () => settingsService.getByKey(key),
    staleTime: 5 * 60 * 1000,
  });
};

// Mutations
export const useUpdateOpportunityStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      opportunityService.updateStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};

export const useCreatePair = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { symbol: string; baseAsset: string; quoteAsset: string; isActive?: boolean }) =>
      pairService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
    },
  });
};

export const useUpdatePairStatus = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      pairService.updateStatus(id, isActive),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
    },
  });
};

export const useEnqueueScan = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { pairId?: number; force?: boolean }) =>
      scanService.enqueueScan(data.pairId, data.force),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['scan'] });
    },
  });
};

export const useCancelJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (jobId: string) => scanService.cancelJob(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scan'] });
    },
  });
};

export const useUpdateSetting = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      settingsService.update(key, value),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
};

export const useSeed = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => seedService.seed(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['pairs'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
};
