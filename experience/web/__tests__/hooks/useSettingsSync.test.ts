import { renderHook } from "@testing-library/react";
import { useSettingsSync } from "@/hooks/useSettingsSync";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

jest.mock("@/stores/useSettingsStore");
jest.mock("@/stores/useAtlasAdminStore");

describe("useSettingsSync", () => {
  const mockSetState = jest.fn();
  const mockSubscribe = jest.fn(() => jest.fn()); // returns unsubscribe
  const mockGetState = jest.fn(() => ({
    pathAnimationMode: "test",
    layers: {},
  }));

  beforeEach(() => {
    jest.clearAllMocks();
    useAtlasAdminStore.setState = mockSetState;

    // Mock zustand store methods directly on the import
    (useSettingsStore as unknown as any).getState = mockGetState;
    (useSettingsStore as unknown as any).subscribe = mockSubscribe;
  });

  it("should sync settings on mount", () => {
    renderHook(() => useSettingsSync());

    expect(mockGetState).toHaveBeenCalled();
    expect(mockSetState).toHaveBeenCalledWith(expect.any(Function));
  });

  it("should subscribe to settings changes", () => {
    renderHook(() => useSettingsSync());

    expect(mockSubscribe).toHaveBeenCalled();

    // Simulate change
    const subCallback = (mockSubscribe.mock.calls[0] as any[])[0];
    subCallback();

    expect(mockSetState).toHaveBeenCalledTimes(2); // Mount + Change
  });

  it("should map settings correctly", () => {
    mockGetState.mockReturnValue({
      pathAnimationMode: "test-mode",
      showMotionIndicators: true,
      colorScheme: "dark",
      pathOpacity: 0.5,
      emotionSize: 10,
      enableAnimations: false,
      dataVisualizationMode: "vis-mode",
      computeMode: "compute-mode",
      showAllPaths: true,
      focusMode: "focus-mode",
      layers: { layer1: true },
    } as any);

    renderHook(() => useSettingsSync());

    const updater = mockSetState.mock.calls[0][0];
    const prevState = { settings: { existing: "val" }, layers: {} };
    const newState = updater(prevState);

    expect(newState).toEqual({
      settings: expect.objectContaining({
        pathAnimationMode: "test-mode",
        showMotionIndicators: true,
        colorScheme: "dark",
        pathOpacity: 0.5,
        emotionSize: 10,
        enableAnimations: false,
        dataVisualizationMode: "vis-mode",
        computeMode: "compute-mode",
        showAllPaths: true,
        focusMode: "focus-mode",
        existing: "val", // Preserves existing state spread
      }),
      layers: { layer1: true },
    });
  });

  it("should unsubscribe on unmount", () => {
    const mockUnsubscribe = jest.fn();
    mockSubscribe.mockReturnValue(mockUnsubscribe);

    const { unmount } = renderHook(() => useSettingsSync());
    unmount();

    expect(mockUnsubscribe).toHaveBeenCalled();
  });
});
