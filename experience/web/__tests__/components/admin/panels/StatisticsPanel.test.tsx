import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { StatisticsPanel } from "@/components/admin/panels/StatisticsPanel";
import { useStatistics } from "@/hooks/admin/useStatistics";
import { useLoadCachedPaths } from "@/hooks/useLoadCachedPaths";

// Mocks
jest.mock("@/hooks/admin/useStatistics", () => ({
  useStatistics: jest.fn(),
}));

jest.mock("@/hooks/useLoadCachedPaths", () => ({
  useLoadCachedPaths: jest.fn(),
}));

describe("StatisticsPanel", () => {
  const mockClearCache = jest.fn();

  const defaultStats = {
    total_cached: 100,
    total_possible: 200,
    completion_percentage: 50,
    difficulty_distribution: { easy: 20, moderate: 30, difficult: 50 },
    distance_stats: { avg: 1.5, min: 0.5, max: 3.0 },
    bridge_paths: 5,
    avg_waypoints: 4.2,
    last_computed: new Date().toISOString(),
  };

  const setupHooks = (statsOverrides = {}, loadOverrides = {}) => {
    (useStatistics as jest.Mock).mockReturnValue({
      stats: { ...defaultStats, ...statsOverrides },
      loading: false,
      error: null,
      isClearing: false,
      clearCache: mockClearCache,
      ...statsOverrides // Allow overriding loading/error directly
    });

    (useLoadCachedPaths as jest.Mock).mockReturnValue({
      loadTime: 120,
      error: null,
      ...loadOverrides
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders loading state", () => {
    setupHooks({ stats: null, loading: true });
    render(<StatisticsPanel />);
    expect(screen.getByText("Loading statistics...")).toBeInTheDocument();
  });

  it("renders error state", () => {
    setupHooks({ error: "Backend failed" });
    render(<StatisticsPanel />);
    expect(screen.getByText("Error: Backend failed")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    setupHooks({ stats: { total_cached: 0 } });
    render(<StatisticsPanel />);
    expect(screen.getByText(/No paths computed yet/i)).toBeInTheDocument();
  });

  it("renders full statistics", () => {
    setupHooks();
    render(<StatisticsPanel />);

    // Progress
    expect(screen.getByText("100 / 200")).toBeInTheDocument();
    expect(screen.getByText("50%")).toBeInTheDocument();

    // Performance
    expect(screen.getByText("120ms")).toBeInTheDocument();

    // Distribution
    expect(screen.getByText("20")).toBeInTheDocument(); // Easy
    expect(screen.getByText("30")).toBeInTheDocument(); // Moderate
    expect(screen.getByText("50")).toBeInTheDocument(); // Difficult

    // Distance
    expect(screen.getByText("1.5")).toBeInTheDocument();
    expect(screen.getByText("0.5")).toBeInTheDocument(); // min
    expect(screen.getByText("3")).toBeInTheDocument(); // max

    // Bridge & Waypoints
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("4.2")).toBeInTheDocument();
  });

  it("renders load error", () => {
    setupHooks({}, { error: "Cache miss" });
    render(<StatisticsPanel />);
    expect(screen.getByText("Warning: Cache miss")).toBeInTheDocument();
  });

  it("handles cache clearing", async () => {
    setupHooks();
    render(<StatisticsPanel />);

    const clearBtn = screen.getByText("🗑️ Clear Cache");
    await userEvent.click(clearBtn);
    expect(mockClearCache).toHaveBeenCalled();
  });

  it("shows clearing state", () => {
    setupHooks({ isClearing: true });
    render(<StatisticsPanel />);

    expect(screen.getByText("Clearing...")).toBeInTheDocument();
    expect(screen.getByRole("button")).toBeDisabled();
  });
});
