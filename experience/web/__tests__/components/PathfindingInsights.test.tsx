import React from 'react';
import { render, screen } from '@testing-library/react';
import { PathfindingInsights } from '../../components/PathfindingInsights';

// Mock ConceptTooltip to verify it's receiving correct props
jest.mock('../../components/ConceptTooltip', () => ({
  ConceptTooltip: ({ termKey, children }: { termKey: string; children: React.ReactNode }) => (
    <span data-testid="concept-tooltip" data-term={termKey}>
      {children}
    </span>
  ),
}));

describe('PathfindingInsights', () => {
  const mockMetrics = {
    nodes_explored: 42,
    max_queue_size: 15,
    search_depth: 5,
    pruned_paths: 3,
    execution_time_ms: 12.5,
  };

  it('renders nothing when metrics are missing', () => {
    const { container } = render(<PathfindingInsights metrics={null as any} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders all metrics correctly', () => {
    render(<PathfindingInsights metrics={mockMetrics} />);

    // Check specific values
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('15 nodes')).toBeInTheDocument();
    expect(screen.getByText('12.5ms')).toBeInTheDocument();
  });

  it('renders tooltips for key metrics', () => {
    render(<PathfindingInsights metrics={mockMetrics} />);

    // Check that ConceptTooltip is used with correct keys
    const tooltips = screen.getAllByTestId('concept-tooltip');

    // We expect 3 tooltips: NODES_EXPLORED, SEARCH_DEPTH, PRUNED_PATHS
    expect(tooltips).toHaveLength(3);

    const keys = tooltips.map(t => t.getAttribute('data-term'));
    expect(keys).toContain('NODES_EXPLORED');
    expect(keys).toContain('SEARCH_DEPTH');
    expect(keys).toContain('PRUNED_PATHS');
  });

  it('renders max memory without tooltip', () => {
    render(<PathfindingInsights metrics={mockMetrics} />);

    // Max Memory does not use a tooltip in the current implementation
    // We can verify this by finding the label "Max Memory" and checking parent
    const maxMemoryLabel = screen.getByText('Max Memory');
    // Ensure it is NOT inside a tooltip mock
    expect(maxMemoryLabel.closest('[data-testid="concept-tooltip"]')).toBeNull();
  });
});
