import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatCard } from '../StatCard.js';

describe('StatCard', () => {
  it('renders title and value', () => {
    render(
      <StatCard
        title="Total Opportunities"
        value="125"
      />
    );

    expect(screen.getByText('Total Opportunities')).toBeInTheDocument();
    expect(screen.getByText('125')).toBeInTheDocument();
  });

  it('renders sub value when provided', () => {
    render(
      <StatCard
        title="Total Opportunities"
        value="125"
        subValue="42 active"
      />
    );

    expect(screen.getByText('42 active')).toBeInTheDocument();
  });

  it('shows skeleton loader when loading', () => {
    const { container } = render(
      <StatCard
        title="Total Opportunities"
        value="125"
        loading={true}
      />
    );

    const skeleton = container.querySelector('.skeleton');
    expect(skeleton).toBeInTheDocument();
  });

  it('applies correct color classes', () => {
    const { container } = render(
      <StatCard
        title="Test"
        value="100"
        color="success"
      />
    );

    const cardElement = container.querySelector('.card');
    expect(cardElement).toHaveClass('bg-success-900/20', 'border-success-800');
  });

  it('renders icon when provided', () => {
    render(
      <StatCard
        title="Test"
        value="100"
        icon="💰"
      />
    );

    expect(screen.getByText('💰')).toBeInTheDocument();
  });
});
