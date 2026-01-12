import { renderHook } from "@testing-library/react";
import { useLayerActionMap } from "@/hooks/shortcuts/useLayerActionMap";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores/useSettingsStore");

describe("useLayerActionMap", () => {
    const mockUpdateLayer = jest.fn();
    const mockUpdateVisualSetting = jest.fn();
    const mockUpdateBehaviorSetting = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (useSettingsStore as unknown as jest.Mock).mockReturnValue({
            layers: {
                transitionPaths: true,
                emotionLabels: true,
                soulSphere: true,
                legend: false,
                emotionPoints: true
            },
            showAxisLabels: true,
            focusMode: false,
            showMotionIndicators: true,
            dataVisualizationMode: false,
            pathAnimationMode: "subtle",
            updateLayer: mockUpdateLayer,
            updateVisualSetting: mockUpdateVisualSetting,
            updateBehaviorSetting: mockUpdateBehaviorSetting
        });
    });

    it("should return action map", () => {
        const { result } = renderHook(() => useLayerActionMap());
        const event = new KeyboardEvent("keydown", { key: " " });
        const actions = result.current.getActions(event);

        expect(actions[" "]).toBeDefined();
        expect(actions["l"]).toBeDefined();
    });

    it("should toggle layers", () => {
        const { result } = renderHook(() => useLayerActionMap());
        const event = { preventDefault: jest.fn() } as any;
        const actions = result.current.getActions(event);

        actions[" "](); // Path toggle
        expect(event.preventDefault).toHaveBeenCalled();
        expect(mockUpdateLayer).toHaveBeenCalledWith("transitionPaths", false);

        actions["s"](); // Soul Sphere
        expect(mockUpdateLayer).toHaveBeenCalledWith("soulSphere", false);
    });

    it("should toggle visual settings", () => {
        const { result } = renderHook(() => useLayerActionMap());
        const actions = result.current.getActions({} as any);

        // x -> data viz
        actions["x"]();
        expect(mockUpdateVisualSetting).toHaveBeenCalledWith("dataVisualizationMode", true);

        // a -> axis
        actions["a"]();
        expect(mockUpdateVisualSetting).toHaveBeenCalledWith("showAxisLabels", false);

        // o -> motion indicators
        actions["o"]();
        expect(mockUpdateVisualSetting).toHaveBeenCalledWith("showMotionIndicators", false);

        // f -> focus mode
        actions["f"]();
        expect(mockUpdateBehaviorSetting).toHaveBeenCalledWith("focusMode", true);
    });

    it("should toggle all layers", () => {
        const { result } = renderHook(() => useLayerActionMap());
        const event = { preventDefault: jest.fn() } as any;
        const actions = result.current.getActions(event);

        actions[" "](); // Path toggle
        expect(event.preventDefault).toHaveBeenCalled();
        expect(mockUpdateLayer).toHaveBeenCalledWith("transitionPaths", false);

        actions["s"](); // Soul Sphere
        expect(mockUpdateLayer).toHaveBeenCalledWith("soulSphere", false);

        actions["l"](); // Labels
        expect(mockUpdateLayer).toHaveBeenCalledWith("emotionLabels", false);

        actions["g"](); // Legend
        expect(mockUpdateLayer).toHaveBeenCalledWith("legend", true);

        actions["e"](); // Emotion Points
        expect(mockUpdateLayer).toHaveBeenCalledWith("emotionPoints", false);

        actions["p"](); // Paths (duplicate of space)
        expect(mockUpdateLayer).toHaveBeenCalledWith("transitionPaths", false);
    });

    it("should cycle animation modes", () => {
        const { result } = renderHook(() => useLayerActionMap());
        const actions = result.current.getActions({} as any);

        actions["v"]();
        // Current 'subtle', next 'dynamic'
        expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "dynamic");
    });
});
