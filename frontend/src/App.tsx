import React, { useState } from 'react';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import {
  Topbar,
  PeriodSelector,
  StatCard,
  OpportunitiesTable,
  PairsTable,
  ToastContainer,
} from './components/index.js';
import {
  useLatestOpportunities,
  useOverallStats,
  useTopPairs,
} from './hooks/useQueries.js';
import { formatCurrency } from './utils/format.js';
import { ToastProvider } from './context/ToastContext.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 30,
    },
  },
});

type Period = '1h' | '24h' | '7d' | '30d';

const DashboardContent: React.FC = () => {
  const [period, setPeriod] = useState<Period>('24h');
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState<
    Array<{ id: string; message: string; type?: 'success' | 'error' | 'info' }>
  >([]);

  const { data: stats, isLoading: statsLoading, error: statsError } = useOverallStats(period);
  const { data: opportunitiesData, isLoading: oppLoading } = useLatestOpportunities(currentPage, 10);
  const { data: pairsData, isLoading: pairsLoading } = useTopPairs();

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts((prev) => [...prev, { id, message, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleScanSuccess = (message: string) => {
    addToast(message, 'success');
  };

  const handleScanError = (error: string) => {
    addToast(error, 'error');
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Topbar onScanSuccess={handleScanSuccess} onScanError={handleScanError} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Period Selector */}
        <div className="mb-8">
          <PeriodSelector
            value={period}
            onChange={setPeriod}
            error={statsError ? (statsError as Error).message : undefined}
          />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Opportunities"
            value={stats?.opportunities.totalOpportunities || 0}
            subValue={`${stats?.opportunities.activeOpportunities || 0} active`}
            loading={statsLoading}
            icon="📊"
            color="primary"
          />
          <StatCard
            title="Potential Gain"
            value={formatCurrency(stats?.opportunities.totalPotentialGain || 0)}
            subValue="Total across all pairs"
            loading={statsLoading}
            icon="💰"
            color="success"
          />
          <StatCard
            title="Avg Duration"
            value={`${Math.round(stats?.opportunities.averageDuration || 0)}s`}
            subValue="Average opportunity duration"
            loading={statsLoading}
            icon="⏱️"
            color="warning"
          />
          <StatCard
            title="Scans Performed"
            value={stats?.scanStats.totalScans || 0}
            subValue={`${stats?.scanStats.successfulScans || 0} successful`}
            loading={statsLoading}
            icon="🔄"
            color="error"
          />
        </div>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top Pairs */}
          <PairsTable pairs={pairsData || []} loading={pairsLoading} title="Top 10 Pairs" />

          {/* Latest Opportunities */}
          <OpportunitiesTable
            opportunities={opportunitiesData?.data || []}
            loading={oppLoading}
            total={opportunitiesData?.pagination.total || 0}
            page={currentPage}
            pageSize={10}
            onPageChange={setCurrentPage}
          />
        </div>
      </main>

      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <DashboardContent />
      </ToastProvider>
    </QueryClientProvider>
  );
};

export default App;
