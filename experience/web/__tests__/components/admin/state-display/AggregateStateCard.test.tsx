import { render, screen } from "@testing-library/react";
import { AggregateStateCard } from "@/components/admin/state-display/AggregateStateCard";
import type { AggregateState } from "@/types/chat";

describe("AggregateStateCard", () => {
  const mockAggregate: AggregateState = {
    complexity_score: 0.8,
    emotional_clarity: 0.8,
    temporal_pattern: "sequential",
    vac: {
      valence: 0.5,
      arousal: 0.2,
      connection: 0.9,
    },
  };

  it("renders Complexity and Clarity labels correctly", () => {
    render(<AggregateStateCard aggregate={mockAggregate} />);
    expect(screen.getByText("High")).toBeInTheDocument(); // Complexity 0.8
    expect(screen.getByText("Clear")).toBeInTheDocument(); // Clarity 0.8
  });

  it("renders Temporal Pattern icon and description", () => {
    render(<AggregateStateCard aggregate={mockAggregate} />);
    expect(screen.getByText("→")).toBeInTheDocument(); // sequential icon
    expect(screen.getByText("One after another")).toBeInTheDocument();
    expect(screen.getByText("sequential")).toBeInTheDocument();
  });

  it("renders Weighted VAC values", () => {
    render(<AggregateStateCard aggregate={mockAggregate} />);
    expect(screen.getByText("(0.50, 0.20, 0.90)")).toBeInTheDocument();
  });

  it("renders correct labels for various scores", () => {
    const lowScoreAggregate = {
      ...mockAggregate,
      complexity_score: 0.3,
      emotional_clarity: 0.3,
      temporal_pattern: "concurrent" as const,
    };

    const { rerender } = render(<AggregateStateCard aggregate={lowScoreAggregate} />);
    expect(screen.getByText("Low")).toBeInTheDocument();
    expect(screen.getByText("Muddied")).toBeInTheDocument();
    expect(screen.getByText("⊕")).toBeInTheDocument();
    expect(screen.getByText("Happening simultaneously")).toBeInTheDocument();

    const moderateScoreAggregate = {
      ...mockAggregate,
      complexity_score: 0.5,
      emotional_clarity: 0.5,
      temporal_pattern: "emerging" as const,
    };

    rerender(<AggregateStateCard aggregate={moderateScoreAggregate} />);
    // Use getAllByText for "Moderate" since it appears for both Complexity and Clarity
    expect(screen.getAllByText("Moderate")).toHaveLength(2);
    expect(screen.getByText("↗")).toBeInTheDocument();
    expect(screen.getByText("Building or developing")).toBeInTheDocument();
  });

  it("renders fallback for unknown temporal pattern", () => {
    const unknownAggregate = {
      ...mockAggregate,
      temporal_pattern: "unknown-pattern" as any,
    };
    render(<AggregateStateCard aggregate={unknownAggregate} />);
    // Fallback icon is "•"
    expect(screen.getByText("•")).toBeInTheDocument();
    // Fallback description is the pattern string itself
    // Fallback description is the pattern string itself
    expect(screen.getAllByText("unknown-pattern")).toHaveLength(2);
  });
});
