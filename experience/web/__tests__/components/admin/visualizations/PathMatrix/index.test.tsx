
import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { PathMatrixGrid } from "@/components/admin/visualizations/PathMatrix";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mocks
const mockOnClose = jest.fn();

// Mock store
const mockState = {
  allEmotions: [{ id: "e1", name: "Joy" }, { id: "e2", name: "Trust" }],
  computedPaths: new Map(),
  addComputedPath: jest.fn(),
  selectMultiple: jest.fn(),
  settings: { computeMode: "auto" },
  updateSetting: jest.fn(),
  clearSelection: jest.fn(),
  setSelectedPath: jest.fn(),
};

jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: jest.fn((selector) => selector(mockState)),
}));
// We also need getState for line 169
useAtlasAdminStore.getState = jest.fn(() => mockState);


// Mock Hooks
jest.mock("@/hooks/useComputeAllPaths", () => ({
  useComputeAllPaths: jest.fn().mockReturnValue({
    computeAllPaths: jest.fn(),
    isComputing: false,
    progress: 0,
    estimatedTimeRemaining: "",
  }),
}));

jest.mock("@/hooks/visualization/useMatrixData", () => ({
  useMatrixData: jest.fn().mockReturnValue({
    sortedEmotions: [{ id: "e1", name: "Joy" }, { id: "e2", name: "Trust" }],
    categories: [],
    getPathForPair: jest.fn(),
    getCellColor: jest.fn(),
    getCategoryAverageDifficulty: jest.fn(),
    getCategoryCellColor: jest.fn(),
    stats: { total: 0, computed: 0, coverage: 0 },
  }),
}));

const mockMatrixData = require("@/hooks/visualization/useMatrixData").useMatrixData(); // Access via require to manipulate later? Use mockReturnValue again in tests.

// Mock Components
jest.mock("@/components/admin/visualizations/PathMatrix/MatrixHeader", () => ({
  MatrixHeader: ({ onComputeAll, onLoadCache, onExport, onClose }: any) => (
    <div data-testid="header">
      <button onClick={onComputeAll}>Compute</button>
      <button onClick={onLoadCache}>Load Cache</button>
      <button onClick={onExport}>Export</button>
      <button onClick={onClose}>Close</button>
    </div>
  )
}));

jest.mock("@/components/admin/visualizations/PathMatrix/MatrixGrid", () => ({
  MatrixGrid: ({ onCellClick, onHoverCell, onLeaveCell }: any) => (
    <div data-testid="grid">
      <button onClick={() => onCellClick({ id: "e1", name: "Joy" }, { id: "e2", name: "Trust" })}>Click Cell</button>
      <button onMouseOver={() => onHoverCell("e1", "e2")} onMouseOut={onLeaveCell}>Hover Cell</button>
    </div>
  )
}));

jest.mock("@/components/admin/visualizations/PathMatrix/MatrixLegend", () => ({
  MatrixLegend: () => <div data-testid="legend" />
}));

jest.mock("@/components/admin/visualizations/PathMatrix/MatrixTooltip", () => ({
  MatrixTooltip: () => <div data-testid="tooltip">Tooltip</div>
}));


// Mock Global fetch and URL
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn();
global.alert = jest.fn();

describe("PathMatrixGrid", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset fetch mock
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ paths: [] })
    });
  });

  it("renders components", () => {
    render(<PathMatrixGrid onClose={mockOnClose} />);
    expect(screen.getByTestId("header")).toBeInTheDocument();
    expect(screen.getByTestId("grid")).toBeInTheDocument();
    expect(screen.getByTestId("legend")).toBeInTheDocument();
  });

  it("handles load cached paths success", async () => {
    const pathsData = [
      {
        from_emotion: { id: "e1" },
        to_emotion: { id: "e2" },
        waypoints: [{ emotion: "Peace", vac: [1, 1, 1] }],
        distance: 10,
        difficulty: "easy",
        estimated_time: "5m",
        requires_bridge: false
      }
    ];

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ paths: pathsData })
    });

    render(<PathMatrixGrid onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Load Cache"));

    await waitFor(() => {
      expect(mockState.addComputedPath).toHaveBeenCalled();
    });
  });

  it("handles load cached paths failure (network error)", async () => {
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network error"));
    render(<PathMatrixGrid onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Load Cache"));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("Error loading cached paths. Check console.");
    });
  });

  it("handles load cached paths non-200", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false
    });
    render(<PathMatrixGrid onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Load Cache"));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith(expect.stringContaining("No cached paths available"));
    });
  });

  it("handles load cached paths empty data", async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ paths: [] })
    });
    render(<PathMatrixGrid onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Load Cache"));
    await waitFor(() => {
      expect(global.alert).toHaveBeenCalledWith("No cached paths found.");
    });
  });

  it("handles export CSV", () => {
    mockMatrixData.sortedEmotions = [{ id: "e1", name: "Joy" }, { id: "e2", name: "Trust" }] as any;

    // Return null for one pair to test skipping logic
    mockMatrixData.getPathForPair.mockImplementation((from, to) => {
      if (from.id === "e1" && to.id === "e2") return {
        total_distance: 10,
        difficulty: "easy",
        waypoints: [],
        requires_bridge: false,
        estimated_time: "5m"
      };
      return null;
    });

    render(<PathMatrixGrid onClose={mockOnClose} />);
    fireEvent.click(screen.getByText("Export"));

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it("handles cell click interaction", () => {
    jest.useFakeTimers();
    render(<PathMatrixGrid onClose={mockOnClose} />);

    fireEvent.click(screen.getByText("Click Cell"));

    expect(mockState.updateSetting).toHaveBeenCalledWith("computeMode", "manual");
    expect(mockState.selectMultiple).toHaveBeenCalledWith(["e1", "e2"]);
    expect(mockOnClose).toHaveBeenCalled();

    act(() => {
      jest.runAllTimers();
    });

    expect(mockState.updateSetting).toHaveBeenCalledWith("computeMode", "auto");
    jest.useRealTimers();
  });

  it("handles cell hover interaction", () => {
    render(<PathMatrixGrid onClose={mockOnClose} />);

    const btn = screen.getByText("Hover Cell");

    // Enter
    fireEvent.mouseOver(btn);
    expect(screen.getByTestId("tooltip")).toBeInTheDocument();

    // Leave
    fireEvent.mouseOut(btn);
    expect(screen.queryByTestId("tooltip")).not.toBeInTheDocument();
  });
});
