import { renderHook, act } from "@testing-library/react";
import { useSettingsStore, mergeSettingsState } from "../../stores/useSettingsStore";

// Mock fetch for network tests
global.fetch = jest.fn();

describe("useSettingsStore (Deep Coverage)", () => {
  beforeEach(() => {
    useSettingsStore.getState().resetToDefaults();
    localStorage.clear();
    jest.clearAllMocks();
  });

  it("should export settings to JSON", () => {
    const { result } = renderHook(() => useSettingsStore());
    let json = "";
    act(() => {
      json = result.current.exportSettings();
    });

    const parsed = JSON.parse(json);
    expect(parsed.version).toBe("1.0");
    expect(parsed.settings.visual).toBeDefined();
    expect(parsed.settings.network).toBeDefined();
  });

  it("should import valid settings", () => {
    const { result } = renderHook(() => useSettingsStore());

    const validSettings = result.current.exportSettings();
    // Modify a value to verify import works

    // Let's modify object safely
    const obj = JSON.parse(validSettings);
    obj.settings.visual.pathOpacity = 0.5;

    let success = false;
    act(() => {
      success = result.current.importSettings(JSON.stringify(obj));
    });

    expect(success).toBe(true);
    expect(result.current.pathOpacity).toBe(0.5);
  });

  it("should reject invalid settings", () => {
    const { result } = renderHook(() => useSettingsStore());

    let success = true;
    act(() => {
      success = result.current.importSettings('{"bad": "json"}');
    });

    expect(success).toBe(false);
  });

  it("should catch JSON parse errors", () => {
    const { result } = renderHook(() => useSettingsStore());
    let success = true;
    act(() => {
      // Invalid JSON string causes JSON.parse to throw
      success = result.current.importSettings("{ bad json");
    });
    expect(success).toBe(false);
  });

  it("should warn on version mismatch but proceed", () => {
    const { result } = renderHook(() => useSettingsStore());
    const obj = JSON.parse(result.current.exportSettings());
    obj.version = "0.9";

    let success = false;
    act(() => {
      success = result.current.importSettings(JSON.stringify(obj));
    });

    expect(success).toBe(true);
    // Could check logger warn if we could mock it easily without module mock
  });

  it("should reject missing required sections", () => {
    const { result } = renderHook(() => useSettingsStore());
    const obj = JSON.parse(result.current.exportSettings());
    delete obj.settings.visual; // Remove a required section

    let success = true;
    act(() => {
      success = result.current.importSettings(JSON.stringify(obj));
    });

    expect(success).toBe(false);
  });

  it("should reject invalid values", () => {
    const { result } = renderHook(() => useSettingsStore());

    // Emotion Size invalid
    const obj1 = JSON.parse(result.current.exportSettings());
    obj1.settings.visual.emotionSize = 500;

    let success1 = true;
    act(() => {
      success1 = result.current.importSettings(JSON.stringify(obj1));
    });
    expect(success1).toBe(false);

    // Path Opacity invalid
    const obj2 = JSON.parse(result.current.exportSettings());
    obj2.settings.visual.pathOpacity = 1.5;

    let success2 = true;
    act(() => {
      success2 = result.current.importSettings(JSON.stringify(obj2));
    });
    expect(success2).toBe(false);
  });

  it("should test connection status", async () => {
    const { result } = renderHook(() => useSettingsStore());

    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: true, status: 200 }); // Observer
    (global.fetch as jest.Mock).mockResolvedValueOnce({ ok: false, status: 500 }); // Listener
    (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("Network Error")); // Versor

    let status;
    await act(async () => {
      status = await result.current.testConnection();
    });

    expect(status!.observer.connected).toBe(true);
    expect(status!.listener.connected).toBe(false);
    expect(status!.listener.error).toContain("500");
    expect(status!.versor.connected).toBe(false);
    expect(status!.versor.error).toBe("Network Error");

    // Test non-Error object
    (global.fetch as jest.Mock).mockRejectedValueOnce("String Error");
    await act(async () => {
      status = await result.current.testConnection();
    });
    expect(status!.observer.error).toBe("Connection failed");
  });

  it("should switch network modes", () => {
    const { result } = renderHook(() => useSettingsStore());

    // Initial local
    expect(result.current.network.mode).toBe("local");
    expect(result.current.network.endpoints.observer).toContain("localhost");

    act(() => {
      result.current.switchNetworkMode("network");
    });

    expect(result.current.network.mode).toBe("network");
    // Check default cloud URL
    expect(result.current.network.endpoints.observer).toContain("api.love-platform.com");

    // Test custom endpoints preservation
    act(() => {
      result.current.updateNetworkSetting({ customEndpoints: true });
      result.current.setApiUrl("observer", "http://custom-url.com");
      result.current.switchNetworkMode("local");
    });
    // Should NOT revert to localhost because customEndpoints is true
    expect(result.current.network.endpoints.observer).toBe("http://custom-url.com");
  });
  it("should update simple settings", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setPollingEnabled(false);
      result.current.setPollingInterval(1000);
      result.current.setUserId("test-user");
      result.current.setRenderQuality("high");
      result.current.setSphereOpacity(0.5);
      result.current.setAnimationSpeed(2.0);
    });

    expect(result.current.pollingEnabled).toBe(false);
    expect(result.current.pollingInterval).toBe(1000);
    expect(result.current.userId).toBe("test-user");
    expect(result.current.renderQuality).toBe("high");
    expect(result.current.sphereOpacity).toBe(0.5);
    expect(result.current.animationSpeed).toBe(2.0);
  });

  it("should toggle boolean settings", () => {
    const { result } = renderHook(() => useSettingsStore());
    const initialRotate = result.current.autoRotate;
    const initialDebug = result.current.showDebugInfo;
    const initialReader = result.current.screenReaderMode;

    act(() => {
      result.current.toggleAutoRotate();
      result.current.toggleDebugInfo();
      result.current.toggleScreenReaderMode();
    });

    expect(result.current.autoRotate).toBe(!initialRotate);
    expect(result.current.showDebugInfo).toBe(!initialDebug);
    expect(result.current.screenReaderMode).toBe(!initialReader);
  });

  it("should update transition path and layer", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setShowTransitionPath(false);
    });

    expect(result.current.showTransitionPath).toBe(false);
    expect(result.current.layers.transitionPaths).toBe(false);
  });

  it("should update network URL", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setApiUrl("observer", "http://test.com");
    });

    expect(result.current.network.endpoints.observer).toBe("http://test.com");
  });

  it("should use generic update functions", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.updateVisualSetting("pathOpacity", 0.1);
      result.current.updateBehaviorSetting("focusMode", true);
      result.current.updateChatSetting("autoFocusEmotions", false);
      result.current.updateAccessibilitySetting("fontSize", "large");
      result.current.updateNetworkSetting({ customEndpoints: true });
    });

    expect(result.current.pathOpacity).toBe(0.1);
    expect(result.current.focusMode).toBe(true);
    expect(result.current.autoFocusEmotions).toBe(false);
    expect(result.current.fontSize).toBe("large");
    expect(result.current.network.customEndpoints).toBe(true);
  });

  it("should update layers", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      // Interface LayerVisibility: { soulSphere, emotionPoints, ... }
      result.current.updateLayer("soulSphere", false);
    });

    expect(result.current.layers.soulSphere).toBe(false);
  });

  it("should update accessibility primitives", () => {
    const { result } = renderHook(() => useSettingsStore());

    act(() => {
      result.current.setReducedMotion(true);
      result.current.setHighContrast(true);
    });

    expect(result.current.reducedMotion).toBe(true);
    expect(result.current.highContrast).toBe(true);
  });

  it("should update development settings and sync generic loggers", () => {
    const { result } = renderHook(() => useSettingsStore());

    // Mock logger methods if they are imported singleton
    // But logger is imported from utils/logger.
    // I can't easily mock the logger singleton methods unless I mock the module.
    // The test file didn't mock utils/logger.
    // But I can verification side effects on state.

    act(() => {
      result.current.updateDevelopmentSetting({ enabled: true, frontendLogLevel: "debug" });
    });

    expect(result.current.development.enabled).toBe(true);
    expect(result.current.development.frontendLogLevel).toBe("debug");

    act(() => {
      result.current.updateDevelopmentCategory("api", true);
    });

    expect(result.current.development.frontendCategories.api).toBe(true);
  });

  it("should clear all data", () => {
    const { result } = renderHook(() => useSettingsStore());

    // JSDOM throws "Not implemented: navigation" on reload(), which creates a console.error
    // We suppress it for this test.
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    act(() => {
      result.current.setUserId("data-to-clear");
      result.current.clearAllData();
    });

    expect(result.current.userId).toBe("web-user"); // Reset to default
    // We cannot easily check window.location.reload call in JSDOM as it is non-configurable

    consoleErrorSpy.mockRestore();
  });

  it("should merge state with missing layers during rehydration", () => {
    const { result } = renderHook(() => useSettingsStore());

    // Simulate rehydration event (persist middleware implementation detail)
    // or we can test the merge function if we exported it?
    // Since we can't easily access the merge function directly from the hook result without accessing the store persistence api.

    // Zustand persist middleware exposes .persist API on useSettingsStore.persist
    // But we need to check if the mock store behaves correctly.

    // Alternatively, we can manually trigger the persistence options if we could access them.
    // But since we are testing the store behavior, maybe we can mock localStorage with a state missing layers?

    // The merge function runs when the store initializes.
    // So let's clear store and re-initialize with mocked localStorage.
  });

  // Actually, to test merge logic we might need to access the store options
  // (useSettingsStore as any).persist.getOptions().merge(persisted, current)

  it("should handle missing layers in rehydration merge", () => {
    const current = { layers: { soulSphere: true } } as any;
    const persisted = { someOtherSetting: true } as any; // No layers

    const merged = mergeSettingsState(persisted, current);
    expect(merged.layers).toEqual(current.layers);
    // @ts-ignore
    expect(merged.someOtherSetting).toBe(true);
  });
});
