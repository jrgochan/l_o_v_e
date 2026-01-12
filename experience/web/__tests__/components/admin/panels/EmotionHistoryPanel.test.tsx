import { render, screen, fireEvent } from "@testing-library/react";
import { EmotionHistoryPanel } from "@/components/admin/panels/EmotionHistoryPanel";

// Mock store
const mockStore = {
  entries: [],
  viewMode: "list",
  isCollapsed: false,
  toggleVisibility: jest.fn(),
  removeEntry: jest.fn(),
  toggleViewMode: jest.fn(),
  toggleCollapsed: jest.fn(),
  clearHistory: jest.fn(),
  selectAllForSphere: jest.fn(),
  deselectAllFromSphere: jest.fn(),
  exportHistory: jest.fn(),
};

jest.mock("@/stores/useEmotionHistoryStore", () => ({
  useEmotionHistoryStore: (selector: any) => selector(mockStore),
}));

// Mock child components to avoid deep rendering issues
jest.mock("@/components/admin/state-display/EmotionHistoryCard", () => ({
  EmotionHistoryCard: () => <div data-testid="history-card">Card</div>,
}));
jest.mock("@/components/admin/visualizations/EmotionTimeline", () => ({
  EmotionTimeline: () => <div data-testid="emotion-timeline">Timeline</div>,
}));

describe("EmotionHistoryPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.entries = [] as any;
    mockStore.isCollapsed = false;
    mockStore.viewMode = "list";
  });

  it("should render empty state", () => {
    render(<EmotionHistoryPanel />);
    expect(screen.getByText("No emotions yet")).toBeInTheDocument();
  });

  it("should render collapsed state", () => {
    mockStore.isCollapsed = true;
    mockStore.entries = [{ id: 1, isVisibleInSphere: true }] as any;

    render(<EmotionHistoryPanel />);
    expect(screen.getByTitle("Expand history")).toBeInTheDocument();
    expect(screen.queryByText("History")).not.toBeInTheDocument();
  });

  it("should render list view with entries", () => {
    mockStore.entries = [{ id: 1 }, { id: 2 }] as any;

    render(<EmotionHistoryPanel />);
    expect(screen.getAllByTestId("history-card")).toHaveLength(2);
    expect(screen.queryByTestId("emotion-timeline")).not.toBeInTheDocument();
  });

  it("should render timeline view", () => {
    mockStore.entries = [{ id: 1 }] as any;
    mockStore.viewMode = "timeline";

    render(<EmotionHistoryPanel />);
    expect(screen.getByTestId("emotion-timeline")).toBeInTheDocument();
  });

  it("should handle view mode toggle", () => {
    mockStore.entries = [{ id: 1 }] as any;
    render(<EmotionHistoryPanel />);

    fireEvent.click(screen.getByText("📊 Timeline"));
    expect(mockStore.toggleViewMode).toHaveBeenCalled();
  });

  it("should handle bulk actions", () => {
    mockStore.entries = [{ id: 1 }] as any;
    render(<EmotionHistoryPanel />);

    fireEvent.click(screen.getByTitle("Show all in sphere"));
    expect(mockStore.selectAllForSphere).toHaveBeenCalled();

    fireEvent.click(screen.getByTitle("Clear all history"));
    expect(mockStore.clearHistory).toHaveBeenCalled();
  });
});
