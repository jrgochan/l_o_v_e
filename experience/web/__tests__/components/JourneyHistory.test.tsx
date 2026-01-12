import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JourneyHistory } from "@/components/JourneyHistory";
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

describe("JourneyHistory", () => {
  const mockUserId = "user-123";
  const mockGetUserJourneyHistory = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (getObserverClient as jest.Mock).mockReturnValue({
      getUserJourneyHistory: mockGetUserJourneyHistory,
    });
  });

  const mockHistoryData = {
    total_journeys: 10,
    completed: 8,
    abandoned: 1,
    in_progress: 1,
    success_rate: 0.8,
    journeys: [
      {
        id: "j-1",
        status: "completed",
        started_at: "2024-01-01T10:00:00Z",
        completed_at: "2024-01-01T10:30:00Z",
        waypoints: { "w-1": {}, "w-2": {} }, // minimal mock
        current_waypoint: 1,
      },
      {
        id: "j-2",
        status: "in_progress",
        started_at: "2024-01-02T10:00:00Z",
        // No completed_at
        waypoints: { "w-1": {} },
        current_waypoint: 0,
      },
    ],
  };

  it("renders loading state initially", async () => {
    // Return a promise that doesn't resolve immediately to check loading
    mockGetUserJourneyHistory.mockReturnValue(new Promise(() => {}));
    render(<JourneyHistory userId={mockUserId} />);
    expect(screen.getByText("Loading journey history...")).toBeInTheDocument();
  });

  it("renders history summary when data loads", async () => {
    mockGetUserJourneyHistory.mockResolvedValue(mockHistoryData);

    render(<JourneyHistory userId={mockUserId} />);

    // Wait for load
    await waitFor(() => {
      expect(screen.getByText(/Journey History/)).toBeInTheDocument();
    });

    // Expand
    fireEvent.click(screen.getByText(/Journey History/));

    // Check stats
    expect(screen.getByText("80%")).toBeInTheDocument(); // Success rate
    expect(screen.getByText("8/10 completed")).toBeInTheDocument();

    // Check journey list
    expect(screen.getByText("completed")).toBeInTheDocument();
    expect(screen.getByText("in progress")).toBeInTheDocument();
  });

  it("handles empty history", async () => {
    mockGetUserJourneyHistory.mockResolvedValue({ total_journeys: 0, journeys: [] });
    render(<JourneyHistory userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText("Your Journey History")).toBeInTheDocument();
      expect(screen.getByText(/Start your first journey/)).toBeInTheDocument();
    });
  });

  it("handles API error", async () => {
    mockGetUserJourneyHistory.mockRejectedValue(new Error("API Fail"));
    render(<JourneyHistory userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText("Could not load journey history")).toBeInTheDocument();
    });
  });

  it("expands journey details", async () => {
    mockGetUserJourneyHistory.mockResolvedValue(mockHistoryData);
    render(<JourneyHistory userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/Journey History/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Journey History/));

    // Find the completed journey row (maybe by text "completed")
    const completedRow = screen.getByText("completed").closest("button");
    expect(completedRow).toBeInTheDocument();

    if (completedRow) {
      fireEvent.click(completedRow);
      expect(screen.getByText(/Waypoints: 2/)).toBeInTheDocument();
    }
  });
});
