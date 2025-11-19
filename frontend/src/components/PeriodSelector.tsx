import React from 'react';

type Period = '1h' | '24h' | '7d' | '30d';

interface PeriodSelectorProps {
  value: Period;
  onChange: (period: Period) => void;
  error?: string;
}

export const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange, error }) => {
  const periods: Array<{ value: Period; label: string }> = [
    { value: '1h', label: '1 Hour' },
    { value: '24h', label: '24 Hours' },
    { value: '7d', label: '7 Days' },
    { value: '30d', label: '30 Days' },
  ];

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex gap-3 flex-wrap">
        <legend className="text-sm font-semibold text-slate-300 mb-2">Period</legend>
        {periods.map((period) => (
          <label key={period.value} className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="period"
              value={period.value}
              checked={value === period.value}
              onChange={(e) => onChange(e.target.value as Period)}
              className="w-4 h-4 cursor-pointer"
              aria-label={`Select ${period.label}`}
            />
            <span className="text-sm text-slate-300 hover:text-slate-100 transition-colors">
              {period.label}
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <div
          className="text-sm text-error-400 bg-error-900/20 border border-error-800 rounded px-3 py-2"
          role="alert"
        >
          {error}
        </div>
      )}
    </div>
  );
};
