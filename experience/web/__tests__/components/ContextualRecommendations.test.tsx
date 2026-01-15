import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ContextualRecommendations } from "@/components/ContextualRecommendations";
import { getObserverClient } from "@love/experience-shared";

// Mock API
jest.mock("@love/experience-shared", () => ({
  getObserverClient: jest.fn(),
  UserContext: {},
}));

describe("ContextualRecommendations", () => {
  const mockGetContextRecommendations = jest.fn();
  const mockOnRecommendationsReceived = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getObserverClient as jest.Mock).mockReturnValue({
      getContextRecommendations: mockGetContextRecommendations,
    });
  });

  it("should toggle expansion", () => {
    render(<ContextualRecommendations />);

    const toggleBtn = screen.getByRole("button", { name: /Context-Aware Recommendations/i });

    // Initially closed (except title is always visible)
    expect(screen.queryByText("Tell us about your current situation")).not.toBeInTheDocument();

    // Open
    fireEvent.click(toggleBtn);
    expect(
      screen.getByText(
        "Tell us about your current situation for personalized strategy suggestions:"
      )
    ).toBeInTheDocument();

    // Close
    fireEvent.click(toggleBtn);
    expect(screen.queryByText("Tell us about your current situation")).not.toBeInTheDocument();
  });

  it("should validate empty context", async () => {
    render(<ContextualRecommendations />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));

    const getBtn = screen.getByText("🎯 Get Recommendations");
    expect(getBtn).not.toBeDisabled();

    // Force click to test validation logic (lines 42-43)
    fireEvent.click(getBtn);

    expect(screen.getByText("Please select at least one context option")).toBeInTheDocument();
  });

  it("should fetch recommendations", async () => {
    mockGetContextRecommendations.mockResolvedValue({
      recommended_strategies: ["Breathe", "Connect"],
      avoid_strategies: ["Stress"],
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

    expect(mockGetContextRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({
        time_of_day: "morning",
      })
    );
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

    expect(screen.getByText("🎯 Get Recommendations")).not.toBeDisabled();
  });

  it("should handle all context inputs", () => {
    render(<ContextualRecommendations />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));

    // Energy (rendered as lowercase in DOM)
    fireEvent.click(screen.getByText("high"));
    fireEvent.click(screen.getByText("moderate"));

    // Location
    fireEvent.click(screen.getByText("home"));

    // Available Time
    fireEvent.click(screen.getByText("15 minutes"));

    // Experience
    fireEvent.click(screen.getByText("beginner"));

    // Button should be enabled
    expect(screen.getByText("🎯 Get Recommendations")).toBeEnabled();
  });

  it("should handle empty recommendations", async () => {
    mockGetContextRecommendations.mockResolvedValue({
      recommended_strategies: [], // Empty
      avoid_strategies: [],
    });

    render(<ContextualRecommendations />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));
    fireEvent.click(screen.getByText("Evening"));
    fireEvent.click(screen.getByText("🎯 Get Recommendations"));

    await waitFor(() => {
      expect(screen.getByText(/No specific recommendations/)).toBeInTheDocument();
    });
  });

  it("should handle missing optional response fields", async () => {
    mockGetContextRecommendations.mockResolvedValue({}); // No arrays

    render(<ContextualRecommendations onRecommendationsReceived={mockOnRecommendationsReceived} />);
    fireEvent.click(screen.getByRole("button", { name: /Context-Aware Recommendations/i }));
    fireEvent.click(screen.getByText("Evening"));
    fireEvent.click(screen.getByText("🎯 Get Recommendations"));

    await waitFor(() => {
      // Should show the container but with "No specific recommendations" default fallback?
      // Or if undefined, does it error?
      // Code: recommended_strategies && length > 0
      // If undefined, it goes to : ( <div... No specific ... )
      expect(screen.getByText(/No specific recommendations/)).toBeInTheDocument();
    });

    // Check callback safety
    expect(mockOnRecommendationsReceived).not.toHaveBeenCalled();
  });
});
