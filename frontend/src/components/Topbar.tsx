import React from 'react';
import { useEnqueueScan } from '../hooks/useQueries.js';

interface TopbarProps {
  onScanSuccess?: (message: string) => void;
  onScanError?: (error: string) => void;
}

export const Topbar: React.FC<TopbarProps> = ({ onScanSuccess, onScanError }) => {
  const enqueueScanMutation = useEnqueueScan();
  const [isConnected] = React.useState(true);

  const handleManualScan = async () => {
    try {
      const result = await enqueueScanMutation.mutateAsync({});
      onScanSuccess?.(`Scan job enqueued: ${result.id}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start scan';
      onScanError?.(message);
    }
  };

  return (
    <div className="bg-slate-900 border-b border-slate-800 px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Arbitrage Dashboard</h1>
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-success-500' : 'bg-error-500'
              }`}
              aria-label={isConnected ? 'Connected' : 'Disconnected'}
            />
            <span className="text-sm text-slate-300">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>

        <button
          onClick={handleManualScan}
          disabled={enqueueScanMutation.isPending || !isConnected}
          className="btn btn-primary gap-2"
          aria-label="Trigger manual scan"
        >
          {enqueueScanMutation.isPending ? (
            <>
              <span className="animate-spin">⟳</span>
              Scanning...
            </>
          ) : (
            <>
              <span>↻</span>
              Manual Scan
            </>
          )}
        </button>
      </div>
    </div>
  );
};
