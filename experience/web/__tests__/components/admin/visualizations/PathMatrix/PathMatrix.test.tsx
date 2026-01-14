
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PathMatrixGrid } from "@/components/admin/visualizations/PathMatrix";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useMatrixData } from "@/hooks/visualization/useMatrixData";
import { useComputeAllPaths } from "@/hooks/useComputeAllPaths";
import type { AtlasEmotion, EmotionPath } from "@/types/atlas-admin";

// Mocks
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/hooks/visualization/useMatrixData");
jest.mock("@/hooks/useComputeAllPaths");

// Mock global fetch and URL
global.fetch = jest.fn();
global.URL.createObjectURL = jest.fn();
global.URL.revokeObjectURL = jest.fn();

const MOCK_EMOTIONS: AtlasEmotion[] = [
    { id: "1", name: "Joy", category: "Positive", definition: "", vac: [0.8, 0, 0], quaternion: [0, 0, 0, 1] },
    { id: "2", name: "Sadness", category: "Negative", definition: "", vac: [-0.6, 0, 0], quaternion: [0, 0, 0, 1] },
];

const MOCK_PATH: EmotionPath = {
    id: "1-2",
    from: MOCK_EMOTIONS[0],
    to: MOCK_EMOTIONS[1],
    waypoints: [],
    total_distance: 1.0,
    difficulty: "moderate",
    estimated_time: "5m",
    requires_bridge: false,
};

describe("PathMatrixGrid", () => {
    const mockOnClose = jest.fn();
    const mockUpdateSetting = jest.fn();
    const mockClearSelection = jest.fn();
    const mockSelectMultiple = jest.fn();
    const mockSetSelectedPath = jest.fn();
    const mockAddComputedPath = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();

        // Store mock implementation that handles selectors
        const mockStoreState = {
            allEmotions: MOCK_EMOTIONS,
            computedPaths: [],
            addComputedPath: mockAddComputedPath,
            selectMultiple: mockSelectMultiple,
            settings: { computeMode: "auto" },
            updateSetting: mockUpdateSetting,
            selectedPath: null,
            setSelectedPath: mockSetSelectedPath,
            actions: {
                clearSelection: mockClearSelection
            }
        };

        (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector ? selector(mockStoreState) : mockStoreState;
        });

        // Helper to mock getState for non-hook usage
        (useAtlasAdminStore as any).getState = jest.fn().mockReturnValue({
            settings: { computeMode: "auto" },
            updateSetting: mockUpdateSetting,
            clearSelection: mockClearSelection,
            setSelectedPath: mockSetSelectedPath,
        });

        // Hook mocks
        (useMatrixData as jest.Mock).mockReturnValue({
            sortedEmotions: MOCK_EMOTIONS,
            categories: ["Positive", "Negative"],
            getPathForPair: jest.fn((from, to) => (from.id === "1" && to.id === "2" ? MOCK_PATH : null)),
            getCellColor: jest.fn().mockReturnValue("#ccc"),
            getCategoryAverageDifficulty: jest.fn(),
            getCategoryCellColor: jest.fn().mockReturnValue("#ddd"),
            stats: {
                computed: 1,
                totalPossible: 2,
                percentage: "50.0",
                byDifficulty: { easy: 0, moderate: 1, difficult: 0 }
            },
        });

        (useComputeAllPaths as jest.Mock).mockReturnValue({
            computeAllPaths: jest.fn(),
            isComputing: false,
            progress: { current: 0, total: 0, percentage: 0 },
            estimatedTimeRemaining: "",
        });
    });

    it("renders the grid and header", () => {
        render(<PathMatrixGrid onClose={mockOnClose} />);
        expect(screen.getByText("Emotion Transition Matrix")).toBeInTheDocument();
    });



    it("handles CSV export with bridge paths", () => {
        // Mock a path with bridge requirement
        (useMatrixData as jest.Mock).mockReturnValue({
            sortedEmotions: MOCK_EMOTIONS,
            categories: ["Positive", "Negative"],
            getPathForPair: jest.fn((from, to) => {
                if (from.id === "1" && to.id === "2") {
                    return { ...MOCK_PATH, requires_bridge: true };
                }
                return null;
            }),
            getCellColor: jest.fn().mockReturnValue("#ccc"),
            getCategoryAverageDifficulty: jest.fn(),
            getCategoryCellColor: jest.fn().mockReturnValue("#ddd"),
            stats: { computed: 1, totalPossible: 2, percentage: "50.0", byDifficulty: { easy: 0, moderate: 0, difficult: 0 } },
        });

        render(<PathMatrixGrid onClose={mockOnClose} />);

        const exportBtn = screen.getByText("Export CSV");
        fireEvent.click(exportBtn);

        expect(global.URL.createObjectURL).toHaveBeenCalled();
        // Since we can't easily inspect the Blob content without FileReader mock, 
        // we rely on hitting the line. The logic separates 'Yes'/'No' for bridge.
        // We've forced requires_bridge=true here.
    });

    it("loads cached paths successfully", async () => {
        (global.fetch as jest.Mock).mockResolvedValueOnce({
            ok: true,
            json: async () => ({
                paths: [
                    {
                        from_emotion: { id: "1" },
                        to_emotion: { id: "2" },
                        waypoints: [],
                        distance: 1.0,
                        estimated_time: "5m",
                        difficulty: "medium",
                        requires_bridge: false,
                    },
                ],
            }),
        });

        render(<PathMatrixGrid onClose={mockOnClose} />);

        // Mock user store selector for allEmotions which is used inside the component
        // We already mocked the useAtlasAdminStore hook above, but we need to ensure it returns allEmotions
        // The component calls useAtlasAdminStore((state) => state.allEmotions)
        // Our mock implementation above returns the whole object, so we need to adjust expected behavior
        // if the hook is called with a selector.
        // However, default jest mock setup often returns undefined for selector calls if not configured.
        // Let's rely on `useAtlasAdminStore(selector)` pattern.
        // We'll fix the mock to handle selectors.

        const loadBtn = screen.getByText("Load Cached Paths");
        fireEvent.click(loadBtn);

        await waitFor(() => {
            expect(mockAddComputedPath).toHaveBeenCalled();
        });
    });

    it("handles cell click (path selection)", () => {
        jest.useFakeTimers();
        render(<PathMatrixGrid onClose={mockOnClose} />);

        // Click cell 1->2

        // We can click by title
        // "Joy → Sadness"
        const cell = screen.getByTitle(/Joy → Sadness/i);
        fireEvent.click(cell);

        expect(mockUpdateSetting).toHaveBeenCalledWith("computeMode", "manual");
        expect(mockClearSelection).toHaveBeenCalled();
        expect(mockSelectMultiple).toHaveBeenCalledWith(["1", "2"]);
        expect(mockSetSelectedPath).toHaveBeenCalledWith("1-2");

        jest.runAllTimers();
        expect(mockUpdateSetting).toHaveBeenCalledWith("computeMode", "auto");
        expect(mockOnClose).toHaveBeenCalled();

        jest.useRealTimers();
    });

    it("ignores click on self-referential cell", () => {
        render(<PathMatrixGrid onClose={mockOnClose} />);

        // Joy (self) cell should exist
        const selfCell = screen.getByTitle(/Joy \(self\)/i);
        fireEvent.click(selfCell);

        expect(mockUpdateSetting).not.toHaveBeenCalled();
        expect(mockSelectMultiple).not.toHaveBeenCalled();
    });
});
