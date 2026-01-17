import { render, screen, fireEvent, act } from "@testing-library/react";
import { InfoPanel } from "@/components/admin/panels/InfoPanel/index";
import { useInfoPanelState } from "@/hooks/admin/useInfoPanelState";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

// Mock hooks
jest.mock("@/hooks/admin/useInfoPanelState");
jest.mock("@/hooks/admin/useAdminTheme");

// Mock sub-components
jest.mock("@/components/admin/panels/StatisticsPanel", () => ({
  StatisticsPanel: () => <div data-testid="stats-panel">Statistics Panel</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/EmotionDetails", () => ({
  EmotionDetails: ({ emotion }: { emotion: any }) => (
    <div data-testid="emotion-details">{emotion.name}</div>
  ),
}));
jest.mock("@/components/admin/panels/InfoPanel/EmotionList", () => ({
  EmotionList: ({ emotions }: { emotions: any[] }) => (
    <div data-testid="emotion-list">
      {emotions.map((e: any) => (
        <div key={e.id}>{e.name}</div>
      ))}
    </div>
  ),
}));
jest.mock("@/components/admin/panels/InfoPanel/PathDetails", () => ({
  PathDetails: ({
    path,
    onWaypointClick,
    onShowDetails,
  }: {
    path: any;
    onWaypointClick: any;
    onShowDetails: any;
  }) => (
    <div data-testid="path-details">
      Path Details
      <button onClick={() => onWaypointClick({ id: "wp1" }, 1)}>Click Waypoint</button>
      <button onClick={onShowDetails}>Show Details</button>
    </div>
  ),
}));
jest.mock("@/components/admin/panels/InfoPanel/PathComparison", () => ({
  PathComparison: () => <div data-testid="path-comparison">Path Comparison</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/PathSummaryList", () => ({
  PathSummaryList: ({ onWaypointClick }: { onWaypointClick: any }) => (
    <div data-testid="path-summary-list">
      Path Summary List
      <button onClick={() => onWaypointClick({ id: "p1" }, { id: "wp1" }, 1)}>
        Click Summary Waypoint
      </button>
    </div>
  ),
}));
jest.mock("@/components/admin/panels/InfoPanel/ActionSuggestions", () => ({
  ActionSuggestions: () => <div data-testid="action-suggestions">Suggestions</div>,
}));

// Mock WaypointDetailModal
jest.mock("@/components/admin/shared/WaypointDetailModal", () => ({
  WaypointDetailModal: ({ onClose, onNavigate }: { onClose: any; onNavigate: any }) => (
    <div data-testid="waypoint-modal">
      Waypoint Modal
      <button onClick={onClose}>Close</button>
      <button onClick={() => onNavigate(2)}>Next Step</button>
      <button onClick={() => onNavigate(0)}>Start Step</button>
    </div>
  ),
}));

describe("InfoPanel", () => {
  const mockSetActiveTab = jest.fn();
  const mockSetSelectedWaypoint = jest.fn();

  const defaultState = {
    activeTab: "info",
    setActiveTab: mockSetActiveTab,
    setSelectedWaypoint: mockSetSelectedWaypoint,
    displayPath: null,
    displayEmotion: null,
    selectedEmotions: [],
    selectedPaths: [],
    isComputingPaths: false,
    pathAnimationMode: "default",
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (useInfoPanelState as jest.Mock).mockReturnValue(defaultState);
    (useAdminTheme as jest.Mock).mockReturnValue({
      colors: {
        background: "bg-black",
        border: "border-gray-800",
        primary: "bg-blue-600",
        text: {
          secondary: "text-gray-400",
          primary: "text-white",
          muted: "text-gray-500",
        },
      },
      layout: { borderRadius: "rounded-lg" },
      effects: { backdropBlur: "backdrop-blur" },
      typography: { fontFamily: "font-sans" },
    });
  });

  it("renders Info tab by default with empty state", () => {
    render(<InfoPanel />);
    expect(screen.getByText("📋 Info & Paths")).toHaveClass("bg-white/10");
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
    expect(screen.getByText("Select emotions")).toBeInTheDocument();
    expect(screen.getByText("Bridge Emotions")).toBeInTheDocument(); // Verify deep render
  });

  it("renders Statistics tab", () => {
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      activeTab: "stats",
    });
    render(<InfoPanel />);
    expect(screen.getByTestId("stats-panel")).toBeInTheDocument();
  });

  it("switches tabs", () => {
    render(<InfoPanel />);
    fireEvent.click(screen.getByText("📊 Statistics"));
    expect(mockSetActiveTab).toHaveBeenCalledWith("stats");

    // Click back to Info
    fireEvent.click(screen.getByText("📋 Info & Paths"));
    expect(mockSetActiveTab).toHaveBeenCalledWith("info");
  });

  it("renders EmotionDetails when displayEmotion is present", () => {
    const mockEmotion = { id: "1", name: "Joy" };
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      displayEmotion: mockEmotion,
    });
    render(<InfoPanel />);
    expect(screen.getByTestId("emotion-details")).toBeInTheDocument();
  });

  it("renders PathDetails and handles modal interaction", () => {
    const mockPath = { id: "p1", waypoints: [{ id: "wp1" }, { id: "wp2" }] };
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      displayPath: mockPath,
    });

    render(<InfoPanel />);
    expect(screen.getByTestId("path-details")).toBeInTheDocument();

    // Open modal via Waypoint Click (index 1 -> Step 2)
    fireEvent.click(screen.getByText("Click Waypoint"));
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith({ waypoint: { id: "wp1" }, index: 1 });

    // Verify Modal appears (requires re-render with state change usually, but here relies on internal state)
    expect(screen.getByTestId("waypoint-modal")).toBeInTheDocument();

    // Navigate Modal (Next Step -> Step 2 -> Index 1)
    fireEvent.click(screen.getByText("Next Step"));
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith({ waypoint: { id: "wp2" }, index: 1 }); // Logic: step 2 maps to wp index 1? Warning: Check logic

    // Close Modal
    fireEvent.click(screen.getByText("Close"));
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith(null);
  });

  it("handles PathSummaryList waypoint click", () => {
    const mockPaths = [{ id: "p1" }];
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      selectedPaths: mockPaths,
    });
    render(<InfoPanel />);
    fireEvent.click(screen.getByText("Click Summary Waypoint"));
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith({ waypoint: { id: "wp1" }, index: 1 });
  });

  it("renders EmotionList when selectedEmotions > 0 and no displayEmotion", () => {
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      displayEmotion: null,
      selectedEmotions: [{ id: "e1", name: "Joy" }],
    });
    render(<InfoPanel />);
    expect(screen.getByTestId("emotion-list")).toBeInTheDocument();
  });

  it("renders PathComparison when selectedPaths > 1 and no displayPath", () => {
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      displayPath: null,
      selectedPaths: [{ id: "p1" }, { id: "p2" }],
    });
    render(<InfoPanel />);
    expect(screen.getByTestId("path-comparison")).toBeInTheDocument();
    // PathSummaryList should also be present since length > 0
    expect(screen.getByTestId("path-summary-list")).toBeInTheDocument();
  });

  it("opens modal at start when Show Details clicked", () => {
    const mockPath = { id: "p1", waypoints: [] };
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      displayPath: mockPath,
    });
    render(<InfoPanel />);
    fireEvent.click(screen.getByText("Show Details"));
    expect(screen.getByTestId("waypoint-modal")).toBeInTheDocument();
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith(null); // Clear WP for start step
  });
  it("clears selection when navigating to Start/End steps", () => {
    const mockPath = {
      id: "p1",
      waypoints: [{ id: "wp1" }],
    };
    (useInfoPanelState as jest.Mock).mockReturnValue({
      ...defaultState,
      displayPath: mockPath,
    });
    render(<InfoPanel />);
    fireEvent.click(screen.getByText("Show Details")); // Open Modal at start

    // Simulate navigating to Start (Step 0) - handled by default opening logic?
    // Let's rely on the mock's onNavigate call which we can trigger manually in the mock if we expose it,
    // or add a button in the mock that calls onNavigate(0) specifically.
    fireEvent.click(screen.getByText("Start Step"));
    // 0 - 1 = -1 -> < 0 -> else branch
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith(null);
  });

  it("applies monospace font when theme is font-mono", () => {
    (useAdminTheme as jest.Mock).mockReturnValue({
      colors: {
        text: {
          muted: "text-gray-500",
          secondary: "text-gray-400",
          primary: "text-white",
        },
        border: "border-gray-700",
        secondary: "bg-gray-700",
        primary: "bg-blue-600",
      },
      layout: { borderRadius: "rounded-lg" },
      effects: { backdropBlur: "backdrop-blur-md" },
      typography: { fontFamily: "font-mono" },
    });

    render(<InfoPanel />);
    const infoTab = screen.getByText("📋 Info & Paths");
    const statsTab = screen.getByText("📊 Statistics");
    expect(infoTab).toHaveStyle({ fontFamily: "monospace" });
    expect(statsTab).toHaveStyle({ fontFamily: "monospace" });
  });
});
