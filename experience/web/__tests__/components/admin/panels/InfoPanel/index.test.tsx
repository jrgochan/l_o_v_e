import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InfoPanel } from "@/components/admin/panels/InfoPanel";
import { useInfoPanelState } from "@/hooks/admin/useInfoPanelState";

// Mocks
jest.mock("@/hooks/admin/useInfoPanelState", () => ({
  useInfoPanelState: jest.fn(),
}));

jest.mock("@/components/admin/panels/StatisticsPanel", () => ({
  StatisticsPanel: () => <div data-testid="stats-panel">Statistics Panel</div>,
}));

jest.mock("@/components/admin/shared/WaypointDetailModal", () => ({
  WaypointDetailModal: ({ onClose, onNavigate, waypointIndex }: any) => (
    <div data-testid="waypoint-modal">
      <button onClick={onClose}>Close Modal</button>
      <button onClick={() => onNavigate(waypointIndex + 1)}>Next Step</button>
      <button onClick={() => onNavigate(0)}>Start Step</button>
    </div>
  ),
}));

jest.mock("@/components/admin/panels/InfoPanel/EmotionDetails", () => ({
  EmotionDetails: () => <div data-testid="emotion-details">Emotion Details</div>,
}));

jest.mock("@/components/admin/panels/InfoPanel/EmotionList", () => ({
  EmotionList: () => <div data-testid="emotion-list">Emotion List</div>,
}));

jest.mock("@/components/admin/panels/InfoPanel/PathDetails", () => ({
  PathDetails: ({ onWaypointClick, onShowDetails }: any) => (
    <div data-testid="path-details">
      <button onClick={() => onWaypointClick({ id: "wp1" }, 2)}>Click Waypoint</button>
      <button onClick={onShowDetails}>Show Details</button>
    </div>
  ),
}));

jest.mock("@/components/admin/panels/InfoPanel/PathComparison", () => ({
  PathComparison: () => <div data-testid="path-comparison">Path Comparison</div>,
}));

jest.mock("@/components/admin/panels/InfoPanel/PathSummaryList", () => ({
  PathSummaryList: ({ onWaypointClick }: any) => (
    <div data-testid="path-summary-list">
      <button onClick={() => onWaypointClick({ id: "path1" }, { id: "wp1" }, 0)}>Select WP</button>
    </div>
  ),
}));

jest.mock("@/components/admin/panels/InfoPanel/ActionSuggestions", () => ({
  ActionSuggestions: () => <div data-testid="action-suggestions">Action Suggestions</div>,
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
    pathAnimationMode: "idle",
  };

  const setup = (overrides = {}) => {
    (useInfoPanelState as jest.Mock).mockReturnValue({ ...defaultState, ...overrides });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders info tab by default", () => {
    setup();
    render(<InfoPanel />);
    expect(screen.getByTestId("action-suggestions")).toBeInTheDocument();
  });

  it("switches to stats tab", async () => {
    setup({ activeTab: "stats" });
    render(<InfoPanel />);

    // Check orchestration (activeTab prop is driven by hook, we Mock hook)
    // Component calls setActiveTab, hook updates activeTab.
    // Here we simulate checking if render follows hook state.
    expect(screen.getByTestId("stats-panel")).toBeInTheDocument();
  });

  it("handles info tab interaction", async () => {
    setup({ activeTab: "stats" });
    render(<InfoPanel />);

    const infoBtn = screen.getByText("📋 Info & Paths");
    await userEvent.click(infoBtn);
    expect(mockSetActiveTab).toHaveBeenCalledWith("info");
  });

  it("handles tab switching interaction", async () => {
    setup();
    render(<InfoPanel />);

    const statsBtn = screen.getByText("📊 Statistics");
    await userEvent.click(statsBtn);
    expect(mockSetActiveTab).toHaveBeenCalledWith("stats");
  });

  it("renders emotion details when displayEmotion is present", () => {
    setup({ displayEmotion: { name: "Joy" } });
    render(<InfoPanel />);
    expect(screen.getByTestId("emotion-details")).toBeInTheDocument();
  });

  it("renders emotion list when selectedEmotions has items", () => {
    setup({ displayEmotion: null, selectedEmotions: [{ name: "Joy" }] });
    render(<InfoPanel />);
    expect(screen.getByTestId("emotion-list")).toBeInTheDocument();
  });

  it("renders path details when displayPath is present", async () => {
    setup({ displayPath: { id: "path1" } });
    render(<InfoPanel />);

    expect(screen.getByTestId("path-details")).toBeInTheDocument();

    // Test waypoint click
    const wpBtn = screen.getByText("Click Waypoint");
    await userEvent.click(wpBtn);
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith({ waypoint: { id: "wp1" }, index: 2 });

    // Modal should open? State logic is inside InfoPanel (modalStepIndex).
    // We need to check if WaypointDetailModal is rendered.
    expect(screen.getByTestId("waypoint-modal")).toBeInTheDocument();
  });

  it("renders path comparison when multiple paths selected", () => {
    setup({ selectedPaths: [{}, {}] });
    render(<InfoPanel />);
    expect(screen.getByTestId("path-comparison")).toBeInTheDocument();
  });

  it("renders empty state", () => {
    setup({ selectedEmotions: [], selectedPaths: [] });
    render(<InfoPanel />);
    expect(screen.getByText("Getting Started")).toBeInTheDocument();
  });

  it("handles PathDetails onShowDetails", async () => {
    setup({ displayPath: { id: "path1", waypoints: [] } });
    render(<InfoPanel />);

    const btn = screen.getByText("Show Details");
    await userEvent.click(btn);

    // Should set selected waypoint to null (mock function call check)
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith(null);
    // And open modal at step 0 (implicit check if modal opens)
    expect(screen.getByTestId("waypoint-modal")).toBeInTheDocument();
  });

  it("handles PathSummaryList interaction", async () => {
    setup({ selectedPaths: [{}] });
    render(<InfoPanel />);

    const btn = screen.getByText("Select WP");
    await userEvent.click(btn);

    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith({ waypoint: { id: "wp1" }, index: 0 });
  });

  it("handles Modal navigation: Next Step (Valid WP)", async () => {
    setup({
      displayPath: { id: "path1", waypoints: [{ id: "wp0" }, { id: "wp1" }, { id: "wp2" }] },
    });
    render(<InfoPanel />);

    // Open modal first via Waypoint click (index 2 -> modal step 3)
    await userEvent.click(screen.getByText("Click Waypoint"));

    // Current modal step should be 3.
    // Mock Next button: calls onNavigate(index + 1). Modal doesn't track local index in mock?
    // Mock receives `waypointIndex`.

    const nextBtn = screen.getByText("Next Step");
    await userEvent.click(nextBtn);

    // Initial click: onWaypointClick(..., 2) -> setModalStepIndex(3)
    // Re-render occurs.
    // Modal rendered with waypointIndex=3.
    // Click Next -> onNavigate(4).
    // In onNavigate:
    // newIndex = 4.
    // wpIndex = 4 - 1 = 3.
    // displayPath.waypoints[3] ? No, length is 3 (indices 0,1,2).
    // So wpIndex 3 is out of bounds (End node).
    // Should call setSelectedWaypoint(null).

    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith(null);
  });

  it("handles Modal navigation: Valid Intermediate WP", async () => {
    setup({
      displayPath: { id: "path1", waypoints: [{ id: "wp0" }, { id: "wp1" }, { id: "wp2" }] },
    });
    render(<InfoPanel />);

    // Force modal open at Start (step 0).
    // We can use the Show Details button which sets step 0.
    await userEvent.click(screen.getByText("Show Details"));

    // Step 0. Next -> 1.
    // wpIndex = 0. waypoints[0] exists.

    const nextBtn = screen.getByText("Next Step");
    await userEvent.click(nextBtn);

    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith({ waypoint: { id: "wp0" }, index: 0 });
  });

  it("handles Modal close", async () => {
    setup({ displayPath: { id: "path1" } });
    render(<InfoPanel />);
    await userEvent.click(screen.getByText("Click Waypoint"));

    await userEvent.click(screen.getByText("Close Modal"));
    expect(screen.queryByTestId("waypoint-modal")).toBeNull();
    expect(mockSetSelectedWaypoint).toHaveBeenCalledWith(null);
  });

  it("renders path summary list when paths selected but not displaying one", () => {
    setup({ selectedPaths: [{}] }); // 1 path
    render(<InfoPanel />);
    expect(screen.getByTestId("path-summary-list")).toBeInTheDocument();
  });
});
