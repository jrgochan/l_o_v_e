import { renderHook } from "@testing-library/react";
import { useLayerActionMap } from "@/hooks/shortcuts/useLayerActionMap";
import { useSettingsStore } from "@/stores/useSettingsStore";

jest.mock("@/stores/useSettingsStore");

// Helper to find action by key
const findAction = (actions: Record<string, () => void>, key: string) => {
  return actions[key];
};

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
        emotionPoints: true,
      },
      showAxisLabels: true,
      focusMode: false,
      showMotionIndicators: true,
      dataVisualizationMode: false,
      pathAnimationMode: "subtle",
      updateLayer: mockUpdateLayer,
      updateVisualSetting: mockUpdateVisualSetting,
      updateBehaviorSetting: mockUpdateBehaviorSetting,
    });
  });

  it("should return action list", () => {
    const { result } = renderHook(() => useLayerActionMap());
    const actions = result.current.getActions();

    expect(typeof actions).toBe("object");
    expect(findAction(actions, "p")).toBeDefined();
    expect(findAction(actions, "l")).toBeDefined();
  });

  it("should toggle layers", () => {
    const { result } = renderHook(() => useLayerActionMap());
    const actions = result.current.getActions();
    const event = { preventDefault: jest.fn() } as any;

    const togglePath = findAction(actions, "p");
    togglePath();
    expect(mockUpdateLayer).toHaveBeenCalledWith("transitionPaths", false);

    const toggleSphere = findAction(actions, "s");
    toggleSphere();
    expect(mockUpdateLayer).toHaveBeenCalledWith("soulSphere", false);
  });

  it("should toggle visual settings", () => {
    const { result } = renderHook(() => useLayerActionMap());
    const actions = result.current.getActions();

    // x -> data viz
    const toggleData = findAction(actions, "x");
    toggleData();
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("dataVisualizationMode", true);

    // a -> axis
    const toggleAxis = findAction(actions, "a");
    toggleAxis();
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("showAxisLabels", false);

    // o -> motion indicators
    const toggleMotion = findAction(actions, "o");
    toggleMotion();
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("showMotionIndicators", false);

    // f -> focus mode
    const toggleFocus = findAction(actions, "f");
    toggleFocus();
    expect(mockUpdateBehaviorSetting).toHaveBeenCalledWith("focusMode", true);
  });

  it("should toggle all layers", () => {
    const { result } = renderHook(() => useLayerActionMap());
    const actions = result.current.getActions();
    const event = { preventDefault: jest.fn() } as any;

    const togglePath = findAction(actions, "p");
    togglePath();
    expect(mockUpdateLayer).toHaveBeenCalledWith("transitionPaths", false);

    const toggleSphere = findAction(actions, "s");
    toggleSphere();
    expect(mockUpdateLayer).toHaveBeenCalledWith("soulSphere", false);

    const toggleLabels = findAction(actions, "l");
    toggleLabels();
    expect(mockUpdateLayer).toHaveBeenCalledWith("emotionLabels", false);

    const toggleLegend = findAction(actions, "g");
    toggleLegend();
    expect(mockUpdateLayer).toHaveBeenCalledWith("legend", true);

    const togglePoints = findAction(actions, "e");
    togglePoints();
    expect(mockUpdateLayer).toHaveBeenCalledWith("emotionPoints", false);

    const togglePathAlt = findAction(actions, "p");
    togglePathAlt();
    expect(mockUpdateLayer).toHaveBeenCalledWith("transitionPaths", false);
  });

  it("should cycle animation modes", () => {
    const { result } = renderHook(() => useLayerActionMap());
    const actions = result.current.getActions();

    const cycleAnim = findAction(actions, "v");
    cycleAnim();
    // Current 'subtle', next 'dynamic'
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "dynamic");
  });
});
