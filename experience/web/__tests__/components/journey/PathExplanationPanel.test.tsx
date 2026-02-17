import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { PathExplanationPanel } from "@/components/journey/PathExplanationPanel";
import { usePathExplorerStore } from "@/stores/usePathExplorerStore";

// Mock the store
jest.mock("@/stores/usePathExplorerStore");
// Mock child components to simplify testing
jest.mock("@/components/journey/StepAlternativeSelector", () => ({
  StepAlternativeSelector: ({ onClose }: any) => (
    <div data-testid="step-selector">
      Step Selector
      <button onClick={onClose}>Close Selector</button>
    </div>
  ),
}));
jest.mock("@/components/journey/PathfindingInsights", () => ({
  PathfindingInsights: () => <div data-testid="insights">Insights</div>,
}));

describe("PathExplanationPanel", () => {
  let mockStore: any;

  beforeEach(() => {
    mockStore = {
      primaryPath: {
        steps: [
          { from_emotion: "Sadness", to_emotion: "Neutral", summary: "Step 1 summary" },
          { from_emotion: "Neutral", to_emotion: "Joy", summary: "Step 2 summary" },
        ],
        waypoints: [{ emotion_id: "e1" }, { emotion_id: "e2" }],
        goal_state: { emotion_id: "goal" },
        search_metadata: { visited_count: 10 },
        path_metrics: { estimated_time: "20m", difficulty: "Easy" },
      },
      selectedStepIndex: 0,
      showExplanation: true,
      toggleExplanation: jest.fn(),
      selectStep: jest.fn(),
    };
    (usePathExplorerStore as unknown as jest.Mock).mockReturnValue(mockStore);
  });

  it("renders nothing if primaryPath is missing", () => {
    mockStore.primaryPath = null;
    const { container } = render(<PathExplanationPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing if showExplanation is false", () => {
    mockStore.showExplanation = false;
    const { container } = render(<PathExplanationPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders panel content", () => {
    render(<PathExplanationPanel />);
    expect(screen.getByText("Journey Details")).toBeInTheDocument();
    expect(screen.getByText("Step 1 summary")).toBeInTheDocument();
    expect(screen.getByText("20m")).toBeInTheDocument();
    expect(screen.getByText("Easy")).toBeInTheDocument();
    expect(screen.getByTestId("insights")).toBeInTheDocument();
  });

  it("closes panel when close button is clicked", () => {
    render(<PathExplanationPanel />);
    // The close button is the one with '✕' text
    fireEvent.click(screen.getByText("✕"));
    expect(mockStore.toggleExplanation).toHaveBeenCalledWith(false);
  });

  it("selects a step when clicked", () => {
    render(<PathExplanationPanel />);
    const step2 = screen.getByText("Step 2 summary").closest("div");
    // We need to click the container div of the step
    // The summary is inside p, inside div. The onClick is on the parent div.
    // Let's find by text 'Step 2' (the span)
    fireEvent.click(screen.getByText("Step 2"));
    expect(mockStore.selectStep).toHaveBeenCalledWith(1);
  });

  it("opens and closes step modifier", () => {
    render(<PathExplanationPanel />);

    // Modify button is visible for selected step (index 0)
    const modifyBtn = screen.getByText(/Modify Step/i);
    fireEvent.click(modifyBtn);

    expect(screen.getByTestId("step-selector")).toBeInTheDocument();

    // Close selector
    fireEvent.click(screen.getByText("Close Selector"));
    expect(screen.queryByTestId("step-selector")).not.toBeInTheDocument();
  });

  it("renders fallbacks for missing metrics and IDs", () => {
    mockStore.primaryPath = {
      steps: [{ from: "A", to: "B", summary: "S" }],
      waypoints: [{}], // No emotion_id
      goal_state: {}, // No emotion_id
      // No path_metrics
    };
    render(<PathExplanationPanel />);

    expect(screen.getByText("15-30m")).toBeInTheDocument();
    expect(screen.getByText("Moderate")).toBeInTheDocument();

    // Open modifier to check IDs fallback (passed to StepAlternativeSelector which we verify via props if we could,
    // but here we just ensure no crash. We can check if it rendered the mocked selector).
    // Note: Modifier button only appears if selectedStepIndex is valid.

    // We mocked StepAlternativeSelector, but we can't easily check props passed to it
    // without mocking implementation to capture props.
    // However, the branches in the component are `|| ""` which are passed as props.
    // We trust that if it renders without error, the branch was executed.
    const modifyBtn = screen.getByText(/Modify Step/i);
    fireEvent.click(modifyBtn);
    expect(screen.getByTestId("step-selector")).toBeInTheDocument();
  });
});
