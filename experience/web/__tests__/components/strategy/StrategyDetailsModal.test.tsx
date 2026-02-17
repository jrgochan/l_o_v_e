import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { StrategyDetailsModal } from "@/components/StrategyDetailsModal";
import { Strategy } from "@/stores/useStrategyBrowserStore";

const mockStrategy: Strategy = {
  strategy_id: "strat-1",
  name: "Test Strategy",
  type: "cognitive_reappraisal",
  description: "A test description",
  evidence_level: "meta_analysis",
  difficulty_level: 3,
  time_required: "15 min",
  steps: ["Step 1", { description: "Step 2 desc" } as any, { other: "data" } as any],
  effectiveness_rating: 4.5,
};

describe("StrategyDetailsModal", () => {
  it("renders nothing if strategy is missing", () => {
    const { container } = render(
      <StrategyDetailsModal strategy={null as any} onClose={jest.fn()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders strategy details correctly", () => {
    render(<StrategyDetailsModal strategy={mockStrategy} onClose={jest.fn()} />);

    expect(screen.getByText("Test Strategy")).toBeInTheDocument();
    expect(screen.getByText("COGNITIVE REAPPRAISAL")).toBeInTheDocument(); // formatted type
    expect(screen.getByText("META-ANALYSIS")).toBeInTheDocument();
    expect(screen.getByText("A test description")).toBeInTheDocument();
    expect(screen.getByText("15 min")).toBeInTheDocument();
    expect(screen.getByText("3/5")).toBeInTheDocument();
  });

  it("renders steps correctly", () => {
    render(<StrategyDetailsModal strategy={mockStrategy} onClose={jest.fn()} />);

    expect(screen.getByText("Implementation Steps")).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2 desc")).toBeInTheDocument();
    expect(screen.getByText(/other.*data/)).toBeInTheDocument();
  });

  it("renders fallback for step object without description", () => {
    const rawStepStrategy = {
      ...mockStrategy,
      steps: [{ some_raw_data: 123 } as any],
    };
    render(<StrategyDetailsModal strategy={rawStepStrategy} onClose={jest.fn()} />);
    expect(screen.getByText('{"some_raw_data":123}')).toBeInTheDocument();
  });

  it("renders fallback for missing metrics", () => {
    const incompleteStrategy = { ...mockStrategy, time_required: undefined };
    render(<StrategyDetailsModal strategy={incompleteStrategy} onClose={jest.fn()} />);
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });

  it("renders fallback for missing type", () => {
    const noTypeStrategy = { ...mockStrategy, type: undefined as any };
    render(<StrategyDetailsModal strategy={noTypeStrategy} onClose={jest.fn()} />);
    expect(screen.getByText("GENERAL")).toBeInTheDocument();
  });

  it("renders fallback when steps are empty", () => {
    const noStepsStrategy = { ...mockStrategy, steps: [] };
    render(<StrategyDetailsModal strategy={noStepsStrategy} onClose={jest.fn()} />);

    expect(screen.queryByText("Implementation Steps")).not.toBeInTheDocument();
    expect(
      screen.getByText(/Specific steps for this strategy are currently being digitized/i)
    ).toBeInTheDocument();
  });

  it("handles styles for different evidence levels", () => {
    const rctStrategy = { ...mockStrategy, evidence_level: "rct" };
    const { rerender } = render(
      <StrategyDetailsModal strategy={rctStrategy} onClose={jest.fn()} />
    );
    expect(screen.getByText("RCT")).toBeInTheDocument();

    const clinicalStrategy = { ...mockStrategy, evidence_level: "clinical" };
    rerender(<StrategyDetailsModal strategy={clinicalStrategy} onClose={jest.fn()} />);
    expect(screen.getByText("CLINICAL")).toBeInTheDocument();

    const unknownStrategy = { ...mockStrategy, evidence_level: "unknown_level" };
    rerender(<StrategyDetailsModal strategy={unknownStrategy} onClose={jest.fn()} />);
    expect(screen.getByText("UNKNOWN_LEVEL")).toBeInTheDocument();
  });

  it("calls onClose when close button or backdrop is clicked", () => {
    const onClose = jest.fn();
    render(<StrategyDetailsModal strategy={mockStrategy} onClose={onClose} />);

    fireEvent.click(screen.getByText("✕"));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText("Close"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
