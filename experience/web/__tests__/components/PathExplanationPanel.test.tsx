import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PathExplanationPanel } from "../../components/PathExplanationPanel";

// Mock dependencies
jest.mock("../../components/journey/PathfindingInsights", () => ({
  PathfindingInsights: () => <div data-testid="pathfinding-insights">Insights Mock</div>,
}));

// Mock StepAlternativeSelector (dynamically loaded often, but here imported directly)
jest.mock("../../components/journey/StepAlternativeSelector", () => ({
  StepAlternativeSelector: () => <div data-testid="step-alternative-selector">Selector Mock</div>,
}));

// Mock store
const mockSelectStep = jest.fn();
const mockToggleExplanation = jest.fn();

const mockPrimaryPath = {
  steps: [
    { from_emotion: "Sadness", to_emotion: "Reflection", summary: "Step 1 summary" },
    { from_emotion: "Reflection", to_emotion: "Acceptance", summary: "Step 2 summary" },
  ],
  waypoints: [{ emotion_id: "id1" }, { emotion_id: "id2" }],
  goal_state: { emotion_id: "goal_id" },
  path_metrics: { estimated_time: "10m", difficulty: "Easy" },
  search_metadata: { nodes_explored: 10 },
};

jest.mock("../../stores/usePathExplorerStore", () => ({
  usePathExplorerStore: jest.fn(() => ({
    primaryPath: mockPrimaryPath,
    selectedStepIndex: null,
    showExplanation: true,
    toggleExplanation: mockToggleExplanation,
    selectStep: mockSelectStep,
  })),
}));

// Need to update the mock implementation for different test cases
import { usePathExplorerStore } from "../../stores/usePathExplorerStore";

describe("PathExplanationPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (usePathExplorerStore as unknown as jest.Mock).mockImplementation(() => ({
      primaryPath: mockPrimaryPath,
      selectedStepIndex: null,
      showExplanation: true,
      toggleExplanation: mockToggleExplanation,
      selectStep: mockSelectStep,
    }));
  });

  it("renders nothing if showExplanation is false", () => {
    (usePathExplorerStore as unknown as jest.Mock).mockImplementation(() => ({
      primaryPath: mockPrimaryPath,
      showExplanation: false, // Hidden
    }));
    const { container } = render(<PathExplanationPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders journey details and steps", () => {
    render(<PathExplanationPanel />);
    expect(screen.getByText("Journey Details")).toBeInTheDocument();
    expect(screen.getByText("Step 1")).toBeInTheDocument();
    expect(screen.getByText("Step 2")).toBeInTheDocument();
    expect(screen.getByText("Sadness")).toBeInTheDocument();
    expect(screen.getAllByText("Reflection").length).toBeGreaterThan(0); // Appears twice (to and from)
  });

  it("calls selectStep when a step is clicked", () => {
    render(<PathExplanationPanel />);
    const step1 = screen.getByText("Step 1").closest("div.cursor-pointer");
    fireEvent.click(step1!);
    expect(mockSelectStep).toHaveBeenCalledWith(0);
  });

  it("shows Modify button when a step is selected", () => {
    (usePathExplorerStore as unknown as jest.Mock).mockImplementation(() => ({
      primaryPath: mockPrimaryPath,
      selectedStepIndex: 0, // Step 1 selected
      showExplanation: true,
      toggleExplanation: mockToggleExplanation,
      selectStep: mockSelectStep,
    }));

    render(<PathExplanationPanel />);
    expect(screen.getByText("✎ Modify Step")).toBeInTheDocument();
  });

  it("opens StepAlternativeSelector when Modify is clicked", () => {
    (usePathExplorerStore as unknown as jest.Mock).mockImplementation(() => ({
      primaryPath: mockPrimaryPath,
      selectedStepIndex: 0,
      showExplanation: true,
      toggleExplanation: mockToggleExplanation,
      selectStep: mockSelectStep,
    }));

    render(<PathExplanationPanel />);

    // Selector should not be visible initially
    expect(screen.queryByTestId("step-alternative-selector")).toBeNull();

    // Click modify
    const modifyBtn = screen.getByText("✎ Modify Step");
    fireEvent.click(modifyBtn);

    // Selector should be visible
    expect(screen.getByTestId("step-alternative-selector")).toBeInTheDocument();
  });

  it("renders PathfindingInsights if metadata exists", () => {
    render(<PathExplanationPanel />);
    expect(screen.getByTestId("pathfinding-insights")).toBeInTheDocument();
  });
});
