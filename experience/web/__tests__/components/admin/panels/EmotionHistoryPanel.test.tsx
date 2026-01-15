import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { EmotionHistoryPanel } from "@/components/admin/panels/EmotionHistoryPanel";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";

// Mock Store
jest.mock("@/stores/useEmotionHistoryStore", () => ({
  useEmotionHistoryStore: jest.fn(),
}));

// Mock Children
jest.mock("@/components/admin/state-display/EmotionHistoryCard", () => ({
  EmotionHistoryCard: ({ entry, onRemove }: any) => (
    <div data-testid="history-card">
      {entry.emotion}
      <button onClick={() => onRemove(entry.id)}>Remove</button>
    </div>
  ),
}));

jest.mock("@/components/admin/visualizations/EmotionTimeline", () => ({
  EmotionTimeline: () => <div data-testid="timeline">Timeline View</div>,
}));

describe("EmotionHistoryPanel", () => {
  const mockToggleCollapsed = jest.fn();
  const mockToggleViewMode = jest.fn();
  const mockRemoveEntry = jest.fn();
  const mockSelectAll = jest.fn();
  const mockDeselectAll = jest.fn();
  const mockClear = jest.fn();
  const mockExport = jest.fn();
  const mockToggleVisibility = jest.fn();

  const defaultState = {
    entries: [
      { id: "1", emotion: "Joy", isVisibleInSphere: true, timestamp: new Date() },
      { id: "2", emotion: "Hope", isVisibleInSphere: false, timestamp: new Date() },
    ],
    viewMode: "list",
    isCollapsed: false,
    toggleCollapsed: mockToggleCollapsed,
    toggleViewMode: mockToggleViewMode,
    removeEntry: mockRemoveEntry,
    toggleVisibility: mockToggleVisibility,
    selectAllForSphere: mockSelectAll,
    deselectAllFromSphere: mockDeselectAll,
    clearHistory: mockClear,
    exportHistory: mockExport,
  };

  const setupStore = (overrides = {}) => {
    (useEmotionHistoryStore as unknown as jest.Mock).mockImplementation((selector) => {
      return selector({ ...defaultState, ...overrides });
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders list view correctly", () => {
    setupStore();
    render(<EmotionHistoryPanel />);

    expect(screen.getByText("Joy")).toBeInTheDocument();
    expect(screen.getByText("Hope")).toBeInTheDocument();
    expect(screen.getAllByTestId("history-card")).toHaveLength(2);
    expect(screen.getByText("1 visible in sphere")).toBeInTheDocument();
  });

  it("renders timeline view correctly", () => {
    setupStore({ viewMode: "timeline" });
    render(<EmotionHistoryPanel />);

    expect(screen.getByTestId("timeline")).toBeInTheDocument();
  });

  it("renders collapsed state", async () => {
    setupStore({ isCollapsed: true });
    render(<EmotionHistoryPanel />);

    const expandBtn = screen.getByTitle("Expand history");
    expect(expandBtn).toBeInTheDocument();
    expect(screen.queryByText("History")).toBeNull();
    expect(screen.getByText("2")).toBeInTheDocument(); // Badge count

    await userEvent.click(expandBtn);
    expect(mockToggleCollapsed).toHaveBeenCalled();
  });

  it("handles collapse action from header", async () => {
    setupStore();
    render(<EmotionHistoryPanel />);

    const collapseBtn = screen.getByTitle("Collapse history");
    await userEvent.click(collapseBtn);
    expect(mockToggleCollapsed).toHaveBeenCalled();
  });

  it("handles view mode toggles", async () => {
    setupStore();
    render(<EmotionHistoryPanel />);

    const timelineBtn = screen.getByText("📊 Timeline");
    await userEvent.click(timelineBtn);
    expect(mockToggleViewMode).toHaveBeenCalled();
  });

  it("handles empty state", () => {
    setupStore({ entries: [] });
    render(<EmotionHistoryPanel />);

    expect(screen.getByText("No emotions yet")).toBeInTheDocument();
  });

  it("handles interactions: Remove Entry", async () => {
    setupStore();
    render(<EmotionHistoryPanel />);

    const removeBtns = screen.getAllByText("Remove");
    await userEvent.click(removeBtns[0]);
    expect(mockRemoveEntry).toHaveBeenCalledWith("2"); // Hope (id 2) is displayed first due to reverse first due to reverse
  });

  it("verify reverse order removal", async () => {
    setupStore(); // [Joy, Hope] -> displayed as [Hope, Joy]
    render(<EmotionHistoryPanel />);

    // Joy is id 1, Hope is id 2.
    // Display order: Hope (top), Joy (bottom).
    // Test first button -> should remove Hope (id 2).

    const cards = screen.getAllByTestId("history-card");
    expect(cards[0]).toHaveTextContent("Hope");

    const removeBtn = within(cards[0]).getByText("Remove");
    await userEvent.click(removeBtn);
    expect(mockRemoveEntry).toHaveBeenCalledWith("2");
  });

  it("handles bulk actions", async () => {
    setupStore();
    render(<EmotionHistoryPanel />);

    await userEvent.click(screen.getByTitle("Show all in sphere"));
    expect(mockSelectAll).toHaveBeenCalled();

    await userEvent.click(screen.getByTitle("Hide all from sphere"));
    expect(mockDeselectAll).toHaveBeenCalled();

    await userEvent.click(screen.getByTitle("Export as JSON"));
    expect(mockExport).toHaveBeenCalled();

    await userEvent.click(screen.getByTitle("Clear all history"));
    expect(mockClear).toHaveBeenCalled();
  });
});

import { within } from "@testing-library/react";
