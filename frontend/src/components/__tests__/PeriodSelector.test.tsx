import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PeriodSelector } from '../PeriodSelector.js';

describe('PeriodSelector', () => {
  it('renders all period options', () => {
    const onChange = vi.fn();
    render(
      <PeriodSelector value="1h" onChange={onChange} />
    );

    expect(screen.getByLabelText('Select 1 Hour')).toBeInTheDocument();
    expect(screen.getByLabelText('Select 24 Hours')).toBeInTheDocument();
    expect(screen.getByLabelText('Select 7 Days')).toBeInTheDocument();
    expect(screen.getByLabelText('Select 30 Days')).toBeInTheDocument();
  });

  it('shows selected period', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <PeriodSelector value="1h" onChange={onChange} />
    );

    const input1h = screen.getByDisplayValue('1h') as HTMLInputElement;
    expect(input1h.checked).toBe(true);

    rerender(
      <PeriodSelector value="7d" onChange={onChange} />
    );

    const input7d = screen.getByDisplayValue('7d') as HTMLInputElement;
    expect(input7d.checked).toBe(true);
  });

  it('calls onChange when period is selected', () => {
    const onChange = vi.fn();
    render(
      <PeriodSelector value="1h" onChange={onChange} />
    );

    const input24h = screen.getByDisplayValue('24h') as HTMLInputElement;
    fireEvent.click(input24h);

    expect(onChange).toHaveBeenCalledWith('24h');
  });

  it('displays error message when provided', () => {
    const onChange = vi.fn();
    const error = 'Invalid period';
    render(
      <PeriodSelector value="1h" onChange={onChange} error={error} />
    );

    expect(screen.getByText(error)).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('has proper ARIA attributes', () => {
    const onChange = vi.fn();
    render(
      <PeriodSelector value="1h" onChange={onChange} />
    );

    const inputs = screen.getAllByRole('radio');
    inputs.forEach((input) => {
      expect(input).toHaveAttribute('aria-label');
    });
  });
});
