import React from 'react';
import { Pair } from '../api/index.js';

interface PairsTableProps {
  pairs: Pair[];
  loading?: boolean;
  title?: string;
}

const SkeletonRow: React.FC = () => (
  <tr>
    <td colSpan={4}>
      <div className="flex gap-4 py-3">
        <div className="skeleton h-4 w-32 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-4 w-20 rounded" />
      </div>
    </td>
  </tr>
);

export const PairsTable: React.FC<PairsTableProps> = ({
  pairs,
  loading = false,
  title = 'Top Pairs',
}) => {
  if (loading && pairs.length === 0) {
    return (
      <div className="card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Base</th>
                <th>Quote</th>
                <th>Status</th>
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

  if (pairs.length === 0) {
    return (
      <div className="card">
        <div className="px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
        </div>
        <div className="p-8 text-center">
          <p className="text-slate-400">No pairs found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
      </div>
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Base</th>
              <th>Quote</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pairs.map((pair) => (
              <tr key={pair.id}>
                <td className="font-semibold text-white">{pair.symbol}</td>
                <td className="text-slate-300">{pair.baseAsset}</td>
                <td className="text-slate-300">{pair.quoteAsset}</td>
                <td>
                  <span
                    className={`status-badge ${
                      pair.isActive ? 'status-active' : 'status-closed'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        pair.isActive ? 'bg-success-500' : 'bg-purple-500'
                      }`}
                    />
                    {pair.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
