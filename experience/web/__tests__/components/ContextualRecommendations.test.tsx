import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContextualRecommendations } from "@/components/ContextualRecommendations";
import { getObserverClient } from "@love/experience-shared";

// Mock API
jest.mock("@love/experience-shared", () => ({
  getObserverClient: jest.fn(),
  UserContext: {}
}));

describe("ContextualRecommendations", () => {
  const mockGetContextRecommendations = jest.fn();
  const mockOnRecommendationsReceived = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getObserverClient as jest.Mock).mockReturnValue({
      getContextRecommendations: mockGetContextRecommendations
    });
  });

  it("should toggle expansion", () => {
    render(<ContextualRecommendations />);

    const toggleBtn = screen.getByRole("button", { name: /Context-Aware Recommendations/i });

    // Initially closed (except title is always visible)
    expect(screen.queryByText("Tell us about your current situation")).not.toBeInTheDocument();

    // Open
    fireEvent.click(toggleBtn);
    expect(screen.getByText("Tell us about your current situation for personalized strategy suggestions:")).toBeInTheDocument();

    // Close
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Tell us about your current situation")).not.toBeInTheDocument();
  });

  it("should validate empty context", async () => {
    render(<ContextualRecommendations />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));

    const getBtn = screen.getByText("🎯 Get Recommendations");
    expect(getBtn).toBeDisabled();

    // fireEvent.click(getBtn); // Can't click disabled.
    // But let's verify error if validation logic runs (logic says disabled condition).
    // Let's force enable or test logic via direct interaction? 
    // Logic: disabled={isLoading || Object.keys(context).length === 0}
    // So clicking shouldn't fire.
  });

  it("should fetch recommendations", async () => {
    mockGetContextRecommendations.mockResolvedValue({
      recommended_strategies: ["Breathe", "Connect"],
      avoid_strategies: ["Stress"]
    });

    render(<ContextualRecommendations onRecommendationsReceived={mockOnRecommendationsReceived} />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));

    // Select logic
    const morningBtn = screen.getByText("Morning");
    fireEvent.click(morningBtn);

    const getBtn = screen.getByText("🎯 Get Recommendations");
    expect(getBtn).not.toBeDisabled();

    fireEvent.click(getBtn);

    expect(screen.getByText("Loading...")).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Breathe")).toBeInTheDocument();
      expect(screen.getByText("Connect")).toBeInTheDocument();
      expect(screen.getByText("Stress")).toBeInTheDocument();
    });

    expect(mockGetContextRecommendations).toHaveBeenCalledWith(expect.objectContaining({
      time_of_day: "morning"
    }));
    expect(mockOnRecommendationsReceived).toHaveBeenCalledWith(["Breathe", "Connect"]);
  });

  it("should handle API errors", async () => {
    mockGetContextRecommendations.mockRejectedValue(new Error("API Error"));

    render(<ContextualRecommendations />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));
    fireEvent.click(screen.getByText("Morning"));
    fireEvent.click(screen.getByText("🎯 Get Recommendations"));

    await waitFor(() => {
      expect(screen.getByText("Could not load recommendations")).toBeInTheDocument();
    });
  });

  it("should clear context", async () => {
    render(<ContextualRecommendations />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));

    fireEvent.click(screen.getByText("Morning"));
    expect(screen.getByText("🎯 Get Recommendations")).not.toBeDisabled();

    const clearBtn = screen.getByText("Clear");
    fireEvent.click(clearBtn);

    expect(screen.getByText("🎯 Get Recommendations")).toBeDisabled();
  });
});
