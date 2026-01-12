import { renderHook } from "@testing-library/react";
import { useLocalQuickActions } from "@/hooks/command-palette/actions/useLocalQuickActions";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

// Mock stores
jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/stores/useExperienceStore");

describe("useLocalQuickActions", () => {
    const mockClose = jest.fn();
    const mockSetCurrentPage = jest.fn();
    const mockSetSearch = jest.fn();
    const mockClearSelection = jest.fn();
    const mockSelectMultiple = jest.fn();
    const mockUpdateSetting = jest.fn();
    const mockToggleLayer = jest.fn();
    const mockResetHelper = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
            return selector({
                clearSelection: mockClearSelection,
                selectMultiple: mockSelectMultiple,
                updateSetting: mockUpdateSetting,
                toggleLayer: mockToggleLayer,
                allEmotions: [{ id: "v1", name: "Vulnerability" }, { id: "a1", name: "Awe" }],
                settings: { dataVisualizationMode: false, enableAnimations: true }
            });
        });
        // Mock getState for non-selector usage
        (useAtlasAdminStore.getState as jest.Mock).mockReturnValue({
            allEmotions: [{ id: "v1", name: "Vulnerability" }, { id: "a1", name: "Awe" }]
        });

        (useExperienceStore.getState as jest.Mock).mockReturnValue({
            reset: mockResetHelper
        });
    });

    const getHook = () => renderHook(() => useLocalQuickActions({
        close: mockClose,
        setCurrentPage: mockSetCurrentPage,
        setSearch: mockSetSearch
    }));

    it("should handle /clear", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/clear")).toBe(true);
        expect(mockClearSelection).toHaveBeenCalled();
        expect(mockClose).toHaveBeenCalled();
    });

    it("should handle /bridge", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/bridge")).toBe(true);
        // Should select "Vulnerability" and "Awe" based on mock data match
        expect(mockSelectMultiple).toHaveBeenCalledWith(["v1", "a1"]);
        expect(mockClose).toHaveBeenCalled();
    });

    it("should handle /reset", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/reset")).toBe(true);
        expect(mockClearSelection).toHaveBeenCalled();
        expect(mockResetHelper).toHaveBeenCalled();
        expect(mockClose).toHaveBeenCalled();
    });

    it("should handle /help", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/help")).toBe(true);
        expect(mockSetCurrentPage).toHaveBeenCalledWith("help");
        expect(mockSetSearch).toHaveBeenCalledWith("");
    });

    it("should handle /debug (toggle setting)", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/debug")).toBe(true);
        // Initial dataVisualizationMode was false, so should toggle to true
        expect(mockUpdateSetting).toHaveBeenCalledWith("dataVisualizationMode", true);
        expect(mockClose).toHaveBeenCalled();
    });

    it("should handle /performance (toggle setting)", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/performance")).toBe(true);
        // Initial enableAnimations was true, so should toggle to false
        expect(mockUpdateSetting).toHaveBeenCalledWith("enableAnimations", false);
        expect(mockClose).toHaveBeenCalled();
    });

    it("should handle layer toggles", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/toggle legend")).toBe(true);
        expect(mockToggleLayer).toHaveBeenCalledWith("legend");

        expect(result.current.executeLocalAction("/toggle labels")).toBe(true);
        expect(mockToggleLayer).toHaveBeenCalledWith("emotionLabels");

        expect(result.current.executeLocalAction("/toggle paths")).toBe(true);
        expect(mockToggleLayer).toHaveBeenCalledWith("transitionPaths");

        expect(result.current.executeLocalAction("/toggle sphere")).toBe(true);
        expect(mockToggleLayer).toHaveBeenCalledWith("soulSphere");

        expect(result.current.executeLocalAction("/toggle waypoints")).toBe(true);
        expect(mockToggleLayer).toHaveBeenCalledWith("waypoints");
    });

    it("should return false for unknown actions", () => {
        const { result } = getHook();
        expect(result.current.executeLocalAction("/unknown")).toBe(false);
    });
});
