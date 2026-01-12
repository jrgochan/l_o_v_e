import { render, screen, fireEvent } from "@testing-library/react";
import { StatisticsPanel } from "@/components/admin/panels/StatisticsPanel";

// Mock hooks
jest.mock("@/hooks/admin/useStatistics", () => ({
  useStatistics: jest.fn(),
}));
jest.mock("@/hooks/useLoadCachedPaths", () => ({
  useLoadCachedPaths: jest.fn(),
}));

import { useStatistics } from "@/hooks/admin/useStatistics";
import { useLoadCachedPaths } from "@/hooks/useLoadCachedPaths";

describe("StatisticsPanel", () => {
  const mockClearCache = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default healthy state
    (useStatistics as jest.Mock).mockReturnValue({
      stats: {
        total_cached: 100,
        total_possible: 200,
        completion_percentage: 50,
        difficulty_distribution: { easy: 30, moderate: 50, difficult: 20 },
        distance_stats: { avg: 2.5, min: 1, max: 5 },
        bridge_paths: 10,
        avg_waypoints: 3,
        last_computed: new Date().toISOString(),
      },
      loading: false,
      error: null,
      isClearing: false,
      clearCache: mockClearCache,
    });
    (useLoadCachedPaths as jest.Mock).mockReturnValue({
      loadTime: 500,
      error: null,
    });
  });

  it("should render loading state", () => {
    (useStatistics as jest.Mock).mockReturnValue({
      loading: true,
      stats: null,
    });
    render(<StatisticsPanel />);
    expect(screen.getByText("Loading statistics...")).toBeInTheDocument();
  });

  it("should render error state", () => {
    (useStatistics as jest.Mock).mockReturnValue({
      error: "Failed to fetch stats",
    });
    render(<StatisticsPanel />);
    expect(screen.getByText(/Error: Failed to fetch stats/)).toBeInTheDocument();
  });

  it("should render empty state", () => {
    (useStatistics as jest.Mock).mockReturnValue({
      stats: { total_cached: 0 },
    });
    render(<StatisticsPanel />);
    expect(screen.getByText(/No paths computed yet/)).toBeInTheDocument();
  });

  it("should render populated statistics", () => {
    render(<StatisticsPanel />);

    // Progress
    expect(screen.getByText("100 / 200")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    // Distribution
    expect(screen.getByText("Easy")).toBeInTheDocument();

    // Distance metrics
    expect(screen.getByText("Average:")).toBeInTheDocument();
  });

  it("should handle cache clearing", () => {
    render(<StatisticsPanel />);

    const clearBtn = screen.getByText(/Clear Cache/i);
    fireEvent.click(clearBtn);

    expect(mockClearCache).toHaveBeenCalled();
  });

  it("should show clearing state", () => {
    (useStatistics as jest.Mock).mockReturnValue({
      stats: { total_cached: 100 },
      isClearing: true,
      clearCache: mockClearCache,
    });
    render(<StatisticsPanel />);

    expect(screen.getByText(/Clearing.../)).toBeInTheDocument();
  });
});
