import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { JourneyHistory } from "@/components/JourneyHistory";
import * as JourneyIndex from "@/components/journey";
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
  it("renders correct duration and status visuals", async () => {
    const edgeCaseData = {
      ...mockHistoryData,
      journeys: [
        {
          id: "long-journey",
          status: "abandoned",
          started_at: "2024-01-01T10:00:00Z",
          completed_at: "2024-01-01T12:30:00Z", // 2h 30m
          waypoints: {}, // 0 waypoints
          current_waypoint: 0,
        },
        {
          id: "unknown-status",
          status: "unknown_status_type",
          started_at: "2024-01-01T10:00:00Z",
          completed_at: null,
          waypoints: {},
          current_waypoint: 0,
        },
      ],
    };

    mockGetUserJourneyHistory.mockResolvedValue(edgeCaseData);
    render(<JourneyHistory userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/Journey History/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText(/Journey History/));

    // Check Long Duration (2h 30m)
    expect(screen.getByText(/2h 30m/)).toBeInTheDocument();

    // Check Abandoned Status Visuals
    const abandonedRow = screen.getByText("abandoned").closest("div.border");
    expect(abandonedRow).toHaveClass("bg-red-900/40");
    expect(screen.getAllByText("✗").length).toBeGreaterThan(0);

    // Check Unknown Status Fallback
    const unknownRow = screen.getByText("unknown status_type").closest("div.border");
    expect(unknownRow).toHaveClass("bg-gray-900/40");
    expect(screen.getByText("?")).toBeInTheDocument();

    // Check 0 Waypoints
    // Expand the long journey
    const longJourneyBtn = screen.getByText("abandoned").closest("button");
    if (longJourneyBtn) {
      fireEvent.click(longJourneyBtn);
      expect(screen.getByText(/Waypoints: 0/)).toBeInTheDocument();

      // Click again to collapse (cover toggle logic)
      fireEvent.click(longJourneyBtn);
      expect(screen.queryByText(/Waypoints: 0/)).not.toBeInTheDocument();
    }
  });

  it("handles fallback for undefined current_waypoint", async () => {
    const data = {
      ...mockHistoryData,
      journeys: [
        {
          id: "legacy",
          status: "completed",
          started_at: "2023-01-01",
          waypoints: { w1: {} },
          current_waypoint: undefined,
        },
      ],
    };
    mockGetUserJourneyHistory.mockResolvedValue(data);
    render(<JourneyHistory userId={mockUserId} />);

    await waitFor(() => expect(screen.getByText(/Journey History/)).toBeInTheDocument());
    fireEvent.click(screen.getByText(/Journey History/));

    const row = screen.getByText("completed").closest("button");
    if (row) fireEvent.click(row);

    // Should NOT show "Progress: Waypoint X"
    expect(screen.queryByText(/Progress: Waypoint/)).not.toBeInTheDocument();
  });
  it("exports all components from barrel file", () => {
    expect(JourneyIndex.JourneyHistory).toBeDefined();
    expect(JourneyIndex.JourneyProgress).toBeDefined();
    expect(JourneyIndex.PathComparisonView).toBeDefined();
    expect(JourneyIndex.PathDetailsOverlay).toBeDefined();
    expect(JourneyIndex.PathExplanationPanel).toBeDefined();
    expect(JourneyIndex.PathfindingInsights).toBeDefined();
    expect(JourneyIndex.StepAlternativeSelector).toBeDefined();
    expect(JourneyIndex.TransitionPathRenderer).toBeDefined();
    expect(JourneyIndex.WaypointArrivalOverlay).toBeDefined();
    expect(JourneyIndex.WaypointTooltip).toBeDefined();
  });
});
