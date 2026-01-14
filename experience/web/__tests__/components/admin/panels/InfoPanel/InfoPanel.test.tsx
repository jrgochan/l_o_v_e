
import { render, screen, fireEvent } from "@testing-library/react";
import { InfoPanel } from "@/components/admin/panels/InfoPanel";
import { useInfoPanelState } from "@/hooks/admin/useInfoPanelState";

// Mock hooks
jest.mock("@/hooks/admin/useInfoPanelState");

// Mock sub-components
jest.mock("@/components/admin/panels/StatisticsPanel", () => ({
    StatisticsPanel: () => <div data-testid="stats-panel">Statistics Panel</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/EmotionDetails", () => ({
    EmotionDetails: ({ emotion }) => <div data-testid="emotion-details">{emotion.name}</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/EmotionList", () => ({
    EmotionList: ({ emotions }) => (
        <div data-testid="emotion-list">
            {emotions.map((e: any) => <div key={e.id}>{e.name}</div>)}
        </div>
    ),
}));
jest.mock("@/components/admin/panels/InfoPanel/PathDetails", () => ({
    PathDetails: ({ path }) => <div data-testid="path-details">Path Details</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/PathComparison", () => ({
    PathComparison: () => <div data-testid="path-comparison">Path Comparison</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/PathSummaryList", () => ({
    PathSummaryList: () => <div data-testid="path-summary-list">Path Summary List</div>,
}));
jest.mock("@/components/admin/panels/InfoPanel/ActionSuggestions", () => ({
    ActionSuggestions: () => <div data-testid="action-suggestions">Suggestions</div>,
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
    });

    it("renders Info tab by default", () => {
        render(<InfoPanel />);
        expect(screen.getByText("📋 Info & Paths")).toHaveClass("bg-cyan-900/40");
        expect(screen.getByTestId("action-suggestions")).toBeInTheDocument();
        // Should show empty state
        expect(screen.getByText("Getting Started")).toBeInTheDocument();
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
    });

    it("renders EmotionDetails when displayEmotion is present", () => {
        const mockEmotion = { id: "1", name: "Joy" };
        (useInfoPanelState as jest.Mock).mockReturnValue({
            ...defaultState,
            displayEmotion: mockEmotion,
        });
        render(<InfoPanel />);
        expect(screen.getByTestId("emotion-details")).toHaveTextContent("Joy");
    });

    it("renders EmotionList when multiple emotions selected", () => {
        const mockEmotions = [{ id: "1", name: "Joy" }, { id: "2", name: "Sadness" }];
        (useInfoPanelState as jest.Mock).mockReturnValue({
            ...defaultState,
            selectedEmotions: mockEmotions,
        });
        render(<InfoPanel />);
        expect(screen.getByTestId("emotion-list")).toBeInTheDocument();
        expect(screen.getByText("Joy")).toBeInTheDocument();
        expect(screen.getByText("Sadness")).toBeInTheDocument();
    });

    it("renders PathDetails when displayPath is set", () => {
        const mockPath = { id: "p1", waypoints: [] };
        (useInfoPanelState as jest.Mock).mockReturnValue({
            ...defaultState,
            displayPath: mockPath,
        });
        render(<InfoPanel />);
        expect(screen.getByTestId("path-details")).toBeInTheDocument();
    });

    it("renders PathComparison and List when multiple paths selected", () => {
        const mockPaths = [{ id: "p1" }, { id: "p2" }];
        (useInfoPanelState as jest.Mock).mockReturnValue({
            ...defaultState,
            selectedPaths: mockPaths,
        });
        render(<InfoPanel />);
        expect(screen.getByTestId("path-comparison")).toBeInTheDocument();
        expect(screen.getByTestId("path-summary-list")).toBeInTheDocument();
    });
});
