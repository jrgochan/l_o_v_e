import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PersonalStrategies } from "@/components/PersonalStrategies";
import { getObserverClient } from "@love/experience-shared";

// Mock shared library
jest.mock("@love/experience-shared", () => ({
  getObserverClient: jest.fn(),
}));

jest.mock("@/utils/logger", () => ({
  logger: {
    error: jest.fn(),
  },
}));

describe("PersonalStrategies", () => {
  const mockUserId = "user-123";
  const mockGetUserEffectiveStrategies = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getObserverClient as jest.Mock).mockReturnValue({
      getUserEffectiveStrategies: mockGetUserEffectiveStrategies,
    });
  });

  const mockStrategiesData = {
    top_strategies: [
      {
        strategy_id: "s-1",
        strategy_name: "Deep Breathing",
        avg_rating: 4.5,
        times_tried: 10,
        ratings: [],
      },
      {
        strategy_id: "s-2",
        strategy_name: "Walking",
        avg_rating: 3.5,
        times_tried: 5,
        ratings: [],
      },
    ],
  };

  it("renders loading state", () => {
    mockGetUserEffectiveStrategies.mockReturnValue(new Promise(() => {}));
    render(<PersonalStrategies userId={mockUserId} />);
    expect(screen.getByText("Loading your effective strategies...")).toBeInTheDocument();
  });

  it("renders strategies list correctly", async () => {
    mockGetUserEffectiveStrategies.mockResolvedValue(mockStrategiesData);
    render(<PersonalStrategies userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText("Your Top Strategies")).toBeInTheDocument();
    });

    // Expand
    fireEvent.click(screen.getByText("Your Top Strategies"));

    // Check Top Strategy
    expect(screen.getByText("Deep Breathing")).toBeInTheDocument();
    expect(screen.getByText("4.5")).toBeInTheDocument();
    expect(screen.getByText("Tried 10x")).toBeInTheDocument();

    // Check Badge
    expect(screen.getByText("Highly Effective")).toBeInTheDocument();

    // Check Second Strategy (No badge)
    expect(screen.getByText("Walking")).toBeInTheDocument();
    // Should NOT have Highly Effective for 3.5
    // But "Highly Effective" text exists once for the first strategy.
    // We can check the number of badges.
    const badges = screen.getAllByText("Highly Effective");
    expect(badges).toHaveLength(1);
  });

  it("handles empty strategies", async () => {
    mockGetUserEffectiveStrategies.mockResolvedValue({ top_strategies: [] });
    render(<PersonalStrategies userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText("Your Effective Strategies")).toBeInTheDocument();
      expect(screen.getByText(/Complete journeys and provide feedback/)).toBeInTheDocument();
    });
  });

  it("handles API error", async () => {
    mockGetUserEffectiveStrategies.mockRejectedValue(new Error("Fail"));
    render(<PersonalStrategies userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText("Could not load your strategy history")).toBeInTheDocument();
    });
  });
});
