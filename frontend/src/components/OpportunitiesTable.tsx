import React from 'react';
import { Opportunity } from '../api/index.js';
import { formatCurrency, formatPercentage, formatRelativeTime } from '../utils/format.js';

interface OpportunitiesTableProps {
  opportunities: Opportunity[];
  loading?: boolean;
  total?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const statusClasses: Record<string, string> = {
    ACTIVE: 'status-active',
    EXECUTED: 'status-active',
    PENDING: 'status-pending',
    FAILED: 'status-failed',
    EXPIRED: 'status-closed',
  };

  return (
    <span className={`status-badge ${statusClasses[status] || 'status-pending'}`}>
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'ACTIVE' || status === 'EXECUTED'
            ? 'bg-success-500'
            : status === 'FAILED'
              ? 'bg-error-500'
              : 'bg-purple-500'
        }`}
      />
      {status}
    </span>
  );
};

const SkeletonRow: React.FC = () => (
  <tr>
    <td colSpan={7}>
      <div className="flex gap-4 py-3">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>
    </td>
  </tr>
);

export const OpportunitiesTable: React.FC<OpportunitiesTableProps> = ({
  opportunities,
  loading = false,
  total = 0,
  page = 1,
  pageSize = 10,
  onPageChange,
}) => {
  const pages = Math.ceil(total / pageSize);

  if (loading && opportunities.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Pair</th>
                <th>Exchange</th>
                <th>Spread</th>
                <th>Potential Gain</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...Array(5)].map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (opportunities.length === 0) {
    return (
      <div className="card p-8">
        <div className="text-center">
          <p className="text-slate-400 mb-2">No opportunities found</p>
          <p className="text-sm text-slate-500">Try adjusting your filters or period</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Pair</th>
              <th>Buy / Sell</th>
              <th>Spread</th>
              <th>Potential Gain</th>
              <th>Status</th>
              <th>Time</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr key={opp.id}>
                <td className="font-semibold text-white">{opp.pair?.symbol || 'N/A'}</td>
                <td className="text-sm">
                  <div className="text-slate-300">{opp.buyExchange}</div>
                  <div className="text-slate-500">→ {opp.sellExchange}</div>
                </td>
                <td className="text-sm text-warning-400">{formatPercentage(opp.spread, 4)}</td>
                <td className="font-semibold text-success-400">
                  {formatCurrency(opp.profitEstimate)}
                </td>
                <td>
                  <StatusBadge status={opp.status} />
                </td>
                <td className="text-xs text-slate-400">{formatRelativeTime(opp.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800">
          <div className="text-sm text-slate-400">
            Page {page} of {pages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(page - 1)}
              disabled={page === 1}
              className="btn btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange?.(page + 1)}
              disabled={page === pages}
              className="btn btn-secondary px-4 py-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
