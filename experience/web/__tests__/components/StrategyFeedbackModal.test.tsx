import { render, screen, fireEvent } from "@testing-library/react";
import { StrategyFeedbackModal } from "@/components/StrategyFeedbackModal";

describe("StrategyFeedbackModal", () => {
  const mockStrategies = [
    {
      strategy_id: "strat-1",
      name: "Deep Breathing",
      description: "Breathe deeply",
      type: "regulatory",
    },
    {
      strategy_id: "strat-2",
      name: "Reframing",
      description: "Think differently",
      type: "cognitive",
    },
  ];

  const mockWaypoint = {
    emotion: "Anxiety",
    strategies: mockStrategies as any,
  };

  const mockOnSubmit = jest.fn();
  const mockOnSkip = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders modal with strategies", () => {
    render(
      <StrategyFeedbackModal
        waypoint={mockWaypoint}
        onSubmit={mockOnSubmit}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    );

    expect(screen.getByText("Waypoint Reached! 🎉")).toBeInTheDocument();
    expect(screen.getByText("Anxiety")).toBeInTheDocument();
    expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
    expect(screen.getByText("Reframing")).toBeInTheDocument();
  });

  it("toggles strategy expansion on selection", () => {
    render(
      <StrategyFeedbackModal
        waypoint={mockWaypoint}
        onSubmit={mockOnSubmit}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    );

    // Initial state: no expansion
    expect(screen.queryByText(/How helpful was this?/)).not.toBeInTheDocument();

    // Select first strategy
    fireEvent.click(screen.getByText("Deep Breathing"));

    // Expected to see form fields
    expect(screen.getByText("How helpful was this? (1-5 stars)")).toBeInTheDocument();
    expect(screen.getByText("Time spent (minutes)")).toBeInTheDocument();
  });

  it("handles interactions and submission", () => {
    render(
      <StrategyFeedbackModal
        waypoint={mockWaypoint}
        onSubmit={mockOnSubmit}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    );

    // Select "Deep Breathing"
    fireEvent.click(screen.getByText("Deep Breathing"));

    // Rate 4 stars
    // Stars are buttons. Let's find by text "★" or just click the 4th one.
    // They are rendered as [1,2,3,4,5].
    const stars = screen.getAllByText("★");
    fireEvent.click(stars[3]); // 4th star (index 3)

    // Enter time spent
    const timeInput = screen.getByPlaceholderText("e.g., 15");
    fireEvent.change(timeInput, { target: { value: "10" } });

    // Mark as completed
    const completedCheckbox = screen.getByLabelText("I completed this strategy fully");
    fireEvent.click(completedCheckbox);

    // Add note
    const notesInput = screen.getByPlaceholderText("Any thoughts or observations...");
    fireEvent.change(notesInput, { target: { value: "Very calming" } });

    // Submit
    const submitButton = screen.getByText(/Submit Feedback/);
    expect(submitButton).toBeEnabled();
    fireEvent.click(submitButton);

    expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    const feedback = mockOnSubmit.mock.calls[0][0][0]; // First strategy feedback

    // Check payload (Deep Breathing)
    expect(feedback).toMatchObject({
      strategy_id: "strat-1",
      name: "Deep Breathing",
      tried: true,
      helpful_rating: 4,
      time_spent: 10,
      completed: true,
      notes: "Very calming",
    });

    // Check payload (Reframing - untried)
    const untriedFeedback = mockOnSubmit.mock.calls[0][0][1];
    expect(untriedFeedback).toMatchObject({
      strategy_id: "strat-2",
      tried: false,
    });
  });

  it("handles skip and close", () => {
    render(
      <StrategyFeedbackModal
        waypoint={mockWaypoint}
        onSubmit={mockOnSubmit}
        onSkip={mockOnSkip}
        onClose={mockOnClose}
      />
    );

    fireEvent.click(screen.getByText("Skip Feedback"));
    expect(mockOnSkip).toHaveBeenCalled();

    fireEvent.click(screen.getByText("✕"));
    expect(mockOnClose).toHaveBeenCalled();
  });
});
