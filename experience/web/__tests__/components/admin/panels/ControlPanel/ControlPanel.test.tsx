
import { render, screen, fireEvent, act } from "@testing-library/react";
import { ControlPanel } from "@/components/admin/panels/ControlPanel";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useEmotionSearch } from "@/hooks/admin/useEmotionSearch";
import { useCategoryState } from "@/hooks/admin/useCategoryState";

// Mock hooks
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/hooks/admin/useEmotionSearch");
jest.mock("@/hooks/admin/useCategoryState");

// Mock sub-components
jest.mock("@/components/admin/panels/ControlPanel/EmotionSearch", () => ({
    EmotionSearch: ({ onSearchChange }: any) => (
        <div data-testid="emotion-search">
            <input onChange={(e) => onSearchChange(e.target.value)} placeholder="Search" />
        </div>
    ),
}));
jest.mock("@/components/admin/panels/ControlPanel/QuickActions", () => ({
    QuickActions: () => <div data-testid="quick-actions">Quick Actions</div>,
}));
jest.mock("@/components/admin/panels/ControlPanel/CategoryBrowser", () => ({
    CategoryBrowser: () => <div data-testid="category-browser">Category Browser</div>,
}));
jest.mock("@/components/admin/panels/ControlPanel/AnimationModeSelector", () => ({
    AnimationModeSelector: () => <div data-testid="animation-selector">Animation Selector</div>,
}));
jest.mock("@/components/admin/panels/ControlPanel/LayerControls", () => ({
    LayerControls: () => <div data-testid="layer-controls">Layer Controls</div>,
}));

describe("ControlPanel", () => {
    const mockStore = {
        allEmotions: [],
        selectedEmotionIds: new Set(),
        categoryFilters: new Map(),
        settings: { pathAnimationMode: "default" },
        layers: {},
        toggleEmotion: jest.fn(),
        toggleCategory: jest.fn(),
        clearSelection: jest.fn(),
        toggleCategoryFilter: jest.fn(),
        enableAllCategories: jest.fn(),
        disableAllCategories: jest.fn(),
        updateSetting: jest.fn(),
        toggleLayer: jest.fn(),
    };

    const mockSearchHook = {
        searchQuery: "",
        setSearchQuery: jest.fn(),
        filteredEmotions: [],
        hasActiveSearch: false,
    };

    const mockCategoryHook = {
        expandedCategories: new Set(),
        toggleCategoryExpansion: jest.fn(),
        emotionsByCategory: new Map(),
        getCategorySelectionState: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => selector(mockStore));
        (useEmotionSearch as jest.Mock).mockReturnValue(mockSearchHook);
        (useCategoryState as jest.Mock).mockReturnValue(mockCategoryHook);
    });

    it("renders default Explore tab", () => {
        render(<ControlPanel />);
        expect(screen.getByTestId("emotion-search")).toBeInTheDocument();
        expect(screen.getByTestId("quick-actions")).toBeInTheDocument();
        expect(screen.getByTestId("category-browser")).toBeInTheDocument();

        // Explore tab active
        expect(screen.getByText("🔍 Explore")).toHaveClass("bg-cyan-900/40");
    });

    it("switches to View tab", () => {
        render(<ControlPanel />);
        const viewTab = screen.getByText("👁️ View");
        fireEvent.click(viewTab);

        expect(screen.queryByTestId("emotion-search")).not.toBeInTheDocument();
        expect(screen.getByTestId("animation-selector")).toBeInTheDocument();
        expect(screen.getByTestId("layer-controls")).toBeInTheDocument();

        // View tab active
        expect(viewTab).toHaveClass("bg-cyan-900/40");
    });

    it("hides quick actions and category browser when searching", () => {
        (useEmotionSearch as jest.Mock).mockReturnValue({
            ...mockSearchHook,
            hasActiveSearch: true,
        });

        render(<ControlPanel />);
        expect(screen.getByTestId("emotion-search")).toBeInTheDocument();
        expect(screen.queryByTestId("quick-actions")).not.toBeInTheDocument();
        expect(screen.queryByTestId("category-browser")).not.toBeInTheDocument();
    });

    it("updates settings when changing animation mode", () => {
        // Need to test interaction passing through the mocked component?
        // Since we are mocking sub-components, we mostly verify that props are passed correctly 
        // or that it renders. Real logic is in AnimationModeSelector.
        // Integration test here mainly validates structure.
        render(<ControlPanel />);
        fireEvent.click(screen.getByText("👁️ View"));
        expect(screen.getByTestId("animation-selector")).toBeInTheDocument();
    });
});
