import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subValue?: string;
  loading?: boolean;
  icon?: React.ReactNode;
  color?: 'primary' | 'success' | 'warning' | 'error';
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subValue,
  loading = false,
  icon,
  color = 'primary',
}) => {
  const colorClasses: Record<string, string> = {
    primary: 'border-primary-800 bg-primary-900/20',
    success: 'border-success-800 bg-success-900/20',
    warning: 'border-warning-800 bg-warning-900/20',
    error: 'border-error-800 bg-error-900/20',
  };

  return (
    <div className={`card p-6 border-2 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            {title}
          </p>
          {loading ? (
            <div className="skeleton h-8 w-24 rounded" />
          ) : (
            <>
              <p className="text-3xl font-bold text-white">{value}</p>
              {subValue && <p className="text-xs text-slate-400 mt-1">{subValue}</p>}
            </>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-60">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
