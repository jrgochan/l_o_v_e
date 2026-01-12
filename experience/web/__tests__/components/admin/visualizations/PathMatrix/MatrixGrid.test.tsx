import { render, screen, fireEvent } from "@testing-library/react";
import { MatrixGrid } from "@/components/admin/visualizations/PathMatrix/MatrixGrid";
import type { AtlasEmotion, EmotionPath } from "@/types/atlas-admin";

const MOCK_EMOTIONS: AtlasEmotion[] = [
    { id: "1", name: "Joy", category: "Positive", description: "", vac: [0.8, 0.8, 0] },
    { id: "2", name: "Sadness", category: "Negative", description: "", vac: [-0.6, -0.4, -0.2] },
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
        allEmotions: MOCK_EMOTIONS
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
                from_emotion_id: "1",
                to_emotion_id: "2",
                waypoints: [],
                total_distance: 1.5,
                difficulty: "Hard",
                description: "Test path"
            };
            (defaultProps.getPathForPair as jest.Mock).mockReturnValue(mockPath);

            render(<MatrixGrid {...defaultProps} />);
            const cells = screen.getAllByTitle(/Distance: 1.50/i);
            expect(cells.length).toBeGreaterThan(0);
            expect(cells[0]).toBeInTheDocument();
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
                difficulty: "Hard",
                pathCount: 5
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
                difficulty: "Hard",
                pathCount: 5
            });

            render(<MatrixGrid {...catProps} />);
            const cells = screen.getAllByTitle(/Avg Distance/i);
            const cell = cells[0];

            fireEvent.mouseEnter(cell);
            expect(defaultProps.onHoverCell).toHaveBeenCalled();
        });
    });
});
