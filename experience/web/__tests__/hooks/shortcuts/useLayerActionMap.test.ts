import { renderHook } from "@testing-library/react";
import { useLayerActionMap } from "@/hooks/shortcuts/useLayerActionMap";
import { useSettingsStore } from "@/stores/useSettingsStore";

import { logger } from "@/utils/logger";

jest.mock("@/stores/useSettingsStore");
jest.mock("@/utils/logger");

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
      // Important: Mock update functions to simulated state change for the *next* call if needed,
      // but here we just want to verify the logic inside the hook, which uses the *current* state.
      // To test the "ON" branch, we need to re-render or mock the return value to be false.
      updateLayer: mockUpdateLayer,
      updateVisualSetting: mockUpdateVisualSetting,
      updateBehaviorSetting: mockUpdateBehaviorSetting,
    });
  });

  // ... existing tests ...

  it("should toggle all actions in both states to cover log branches", () => {
    // KEYS: l, s, g, e, p (Layers) | a, f, o, x (Visuals)
    const layerKeys = ["l", "s", "e", "p"]; // Initial: true
    const visualKeys = ["a", "o"]; // Initial: true (axis, motion)
    const invertedKeys = ["g", "f", "x"]; // Initial: false (legend, focus, data)

    // 1. Initial State
    // Layers: True, Legend: False
    // Visual: Axis/Motion: True, Focus/Data: False

    const { result, rerender } = renderHook(() => useLayerActionMap());
    let actions = result.current.getActions();

    // Group 1: True -> False (Log "OFF")
    [...layerKeys, ...visualKeys].forEach(key => {
      findAction(actions, key)();
      expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("OFF"));
      (logger.info as jest.Mock).mockClear();
    });

    // Group 2: False -> True (Log "ON")
    invertedKeys.forEach(key => {
      findAction(actions, key)();
      expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("ON"));
      (logger.info as jest.Mock).mockClear();
    });

    // 2. FLIP STATE
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      layers: {
        transitionPaths: false,
        emotionLabels: false,
        soulSphere: false,
        emotionPoints: false,
        legend: true, // Flipped
      },
      showAxisLabels: false, // Flipped
      focusMode: true, // Flipped
      showMotionIndicators: false, // Flipped
      dataVisualizationMode: true, // Flipped
      pathAnimationMode: "subtle",
      updateLayer: mockUpdateLayer,
      updateVisualSetting: mockUpdateVisualSetting,
      updateBehaviorSetting: mockUpdateBehaviorSetting,
    });
    rerender();
    actions = result.current.getActions();

    // Group 1: False -> True (Log "ON")
    [...layerKeys, ...visualKeys].forEach(key => {
      findAction(actions, key)();
      expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("ON"));
      (logger.info as jest.Mock).mockClear();
    });

    // Group 2: True -> False (Log "OFF")
    invertedKeys.forEach(key => {
      findAction(actions, key)();
      expect(logger.info).toHaveBeenCalledWith("user-interaction", expect.stringContaining("OFF"));
      (logger.info as jest.Mock).mockClear();
    });
  });

  it("should cycle animation modes through full loop", () => {
    // 1. Subtle -> Dynamic
    let { result, rerender } = renderHook(() => useLayerActionMap());
    findAction(result.current.getActions(), "v")();
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "dynamic");

    // 2. Dynamic -> Mystical
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...useSettingsStore(),
      pathAnimationMode: "dynamic",
    });
    rerender();
    findAction(result.current.getActions(), "v")();
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "mystical");

    // 3. Mystical -> Subtle
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...useSettingsStore(),
      pathAnimationMode: "mystical",
    });
    rerender();
    findAction(result.current.getActions(), "v")();
    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "subtle");
  });

  it("should default to subtle if mode is unknown", () => {
    (useSettingsStore as unknown as jest.Mock).mockReturnValue({
      ...useSettingsStore(),
      pathAnimationMode: "invalid-mode",
    });
    const { result } = renderHook(() => useLayerActionMap());

    // indexOf returns -1, +1 = 0 => defaults to mode[0] 'subtle'
    findAction(result.current.getActions(), "v")();

    expect(mockUpdateVisualSetting).toHaveBeenCalledWith("pathAnimationMode", "subtle");
  });
});
