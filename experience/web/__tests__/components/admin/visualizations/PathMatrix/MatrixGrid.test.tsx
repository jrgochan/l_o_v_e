import { render, screen, fireEvent } from "@testing-library/react";
import { MatrixGrid } from "@/components/admin/visualizations/PathMatrix/MatrixGrid";
import type { Emotion, EmotionPath } from "@/types/visualization";

const MOCK_EMOTIONS: Emotion[] = [
  {
    id: "1",
    name: "Joy",
    category: "Positive",
    definition: "",
    vac: [0.8, 0.8, 0],
    quaternion: [0, 0, 0, 1],
  },
  {
    id: "2",
    name: "Sadness",
    category: "Negative",
    definition: "",
    vac: [-0.6, -0.4, -0.2],
    quaternion: [0, 0, 0, 1],
  },
];

const MOCK_CATEGORIES = ["Positive", "Negative"];

describe("MatrixGrid", () => {
  const defaultProps = {
    viewMode: "emotions" as const,
    sortedEmotions: MOCK_EMOTIONS,
    categories: MOCK_CATEGORIES,
    getCellColor: jest.fn().mockReturnValue("#cccccc"),
    getCategoryCellColor: jest.fn().mockReturnValue("#dddddd"),
    getCategoryAverageDifficulty: jest.fn(),
    getPathForPair: jest.fn(),
    hoveredCell: null,
    onHoverCell: jest.fn(),
    onLeaveCell: jest.fn(),
    onCellClick: jest.fn(),
    allEmotions: MOCK_EMOTIONS,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Emotion View", () => {
    it("should render grid headers and cells", () => {
      render(<MatrixGrid {...defaultProps} />);

      // Check headers
      // Check headers (appear in both axes)
      expect(screen.getAllByText("Joy")).toHaveLength(2);
      expect(screen.getAllByText("Sadness")).toHaveLength(2);

      // Check cells (2x2 grid = 4 cells)
      // We can query by role or just generic div counts, but titles are more specific
      // Self-cells have "(self)" in title
      const selfCells = screen.getAllByTitle(/self/i);
      expect(selfCells).toHaveLength(2);
    });

    it("should call onHoverCell/onLeaveCell", () => {
      render(<MatrixGrid {...defaultProps} />);

      // Find a cell that isn't self (Joy -> Sadness)
      // Title logic: "Joy -> Sadness\n(Not computed)"
      const cell = screen.getByTitle(/Joy → Sadness/i);

      fireEvent.mouseEnter(cell);
      expect(defaultProps.onHoverCell).toHaveBeenCalledWith("1", "2");

      fireEvent.mouseLeave(cell);
      expect(defaultProps.onLeaveCell).toHaveBeenCalled();
    });

    it("should call onCellClick for non-self cells", () => {
      render(<MatrixGrid {...defaultProps} />);
      const cell = screen.getByTitle(/Joy → Sadness/i);

      fireEvent.click(cell);
      expect(defaultProps.onCellClick).toHaveBeenCalledWith(MOCK_EMOTIONS[0], MOCK_EMOTIONS[1]);
    });

    it("should NOT call onCellClick for self cells", () => {
      render(<MatrixGrid {...defaultProps} />);
      const selfCell = screen.getByTitle(/Joy \(self\)/i);

      fireEvent.click(selfCell);
      expect(defaultProps.onCellClick).not.toHaveBeenCalled();
    });

    it("should display path details in tooltip if path exists", () => {
      const mockPath: EmotionPath = {
        id: "p1",
        from: {
          id: "1",
          name: "Joy",
          category: "Positive",
          definition: "",
          vac: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
        },
        to: {
          id: "2",
          name: "Sadness",
          category: "Negative",
          definition: "",
          vac: [0, 0, 0],
          quaternion: [0, 0, 0, 1],
        },
        waypoints: [],
        total_distance: 1.5,
        difficulty: "difficult",
        estimated_time: "5m",
      };
      (defaultProps.getPathForPair as jest.Mock).mockReturnValue(mockPath);

      render(<MatrixGrid {...defaultProps} />);
      const cells = screen.getAllByTitle(/Distance: 1.50/i);
      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0]).toBeInTheDocument();
    });

    it("should apply hover styles to hovered cell", () => {
      // Re-render with hoveredCell set
      render(<MatrixGrid {...defaultProps} hoveredCell={{ from: "1", to: "2" }} />);

      const cell = screen.getByTitle(/Joy → Sadness/i);
      expect(cell).toHaveClass("ring-2");
      expect(cell).toHaveClass("ring-cyan-400");
      expect(cell).toHaveClass("z-30");
      expect(cell).toHaveClass("scale-125");
    });
  });

  describe("Category View", () => {
    const catProps = {
      ...defaultProps,
      viewMode: "categories" as const,
    };

    it("should render category headers", () => {
      render(<MatrixGrid {...catProps} />);
      // Headers appear in both Top (column) and Left (row) sticky areas
      expect(screen.getAllByText("Positive")).toHaveLength(2);
      expect(screen.getAllByText("Negative")).toHaveLength(2);
    });

    it("should display category stats in tooltip", () => {
      (defaultProps.getCategoryAverageDifficulty as jest.Mock).mockReturnValue({
        avgDistance: 2.5,
        difficulty: "difficult",
        pathCount: 5,
      });

      render(<MatrixGrid {...catProps} />);
      // Stats appear in symmetric cells (Pos->Neg and Neg->Pos)
      const cells = screen.getAllByTitle(/Avg Distance: 2.50/i);
      expect(cells.length).toBeGreaterThan(0);
      expect(cells[0]).toBeInTheDocument();
    });

    it("should handle hover interactions in category mode", () => {
      // Mock return value is needed for title query to work if we rely on it,
      // but we can query by style or generic means too.
      // Let's rely on the mock return from previous test setup if state persists,
      // but better to set it explicitly for this test.
      (defaultProps.getCategoryAverageDifficulty as jest.Mock).mockReturnValue({
        avgDistance: 2.5,
        difficulty: "difficult",
        pathCount: 5,
      });

      render(<MatrixGrid {...catProps} />);
      const cells = screen.getAllByTitle(/Avg Distance/i);
      const cell = cells[0];

      fireEvent.mouseEnter(cell);
      expect(defaultProps.onHoverCell).toHaveBeenCalled();
    });
    it("should apply hover styles in category mode", () => {
      render(<MatrixGrid {...catProps} hoveredCell={{ from: "Positive", to: "Negative" }} />);

      // Find the cell at intersection of Positive row and Negative col
      // The cell title will contain the stats mock return
      // We need to ensure getCategoryAverageDifficulty returns something for this pair
      (defaultProps.getCategoryAverageDifficulty as jest.Mock).mockReturnValue({
        avgDistance: 2.5,
        difficulty: "difficult",
        pathCount: 5,
      });

      // Re-render to pick up mock change
      render(<MatrixGrid {...catProps} hoveredCell={{ from: "Positive", to: "Negative" }} />);

      const cell = screen.getAllByTitle(/Avg Distance: 2.50/i)[0];
      expect(cell).toHaveClass("ring-2");
      expect(cell).toHaveClass("ring-cyan-400");
    });
  });

  it("should show 'Not computed' tooltip for missing paths", () => {
    (defaultProps.getPathForPair as jest.Mock).mockReturnValue(null);
    render(<MatrixGrid {...defaultProps} />);

    // Check for "Not computed" in titles
    // Since we have multiple cells, find all titles containing "Not computed"
    const cells = screen.getAllByTitle(/Not computed/i);
    expect(cells.length).toBeGreaterThan(0);
  });

  it("renders computed path details in tooltip", () => {
    // Ensure we have a computed path
    (defaultProps.getPathForPair as jest.Mock).mockReturnValue({
      id: "1-2",
      from: { name: "Joy" },
      to: { name: "Sadness" },
      total_distance: 1.234,
      difficulty: "moderate",
      waypoints: [{}, {}],
    });

    render(<MatrixGrid {...defaultProps} />);

    // Check for the detailed title
    // "Joy → Sadness\nDistance: 1.23\nDifficulty: moderate\nWaypoints: 2"
    // Check for the detailed title
    // "Joy → Sadness\nDistance: 1.23\nDifficulty: moderate\nWaypoints: 2"
    const cells = screen.getAllByTitle(/Distance: 1.23/i);
    expect(cells.length).toBeGreaterThan(0);
    expect(cells[0]).toBeInTheDocument();
    expect(cells[0]).toHaveAttribute("title", expect.stringContaining("Difficulty: moderate"));
  });

  it("renders path details with undefined waypoints", () => {
    (defaultProps.getPathForPair as jest.Mock).mockReturnValue({
      id: "p-no-waypoints",
      from: { name: "A" },
      to: { name: "B" },
      total_distance: 1,
      difficulty: "easy",
      waypoints: undefined,
    });
    render(<MatrixGrid {...defaultProps} />);
    // Check title contains "Waypoints: 0"
    const cells = screen.getAllByTitle(/Waypoints: 0/i);
    expect(cells.length).toBeGreaterThan(0);
  });
});
