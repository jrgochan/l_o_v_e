import { renderHook, act } from "@testing-library/react";
import { useInfoPanelState } from "@/hooks/admin/useInfoPanelState";
import { useVisualizationStore } from "@/stores/useVisualizationStore";

jest.mock("@/stores/useVisualizationStore");

describe("useInfoPanelState", () => {
  const mockAllEmotions = [
    { id: "e1", name: "Joy" },
    { id: "e2", name: "Sadness" },
  ];
  const mockComputedPaths = new Map([
    ["e1-e2", { id: "e1-e2", from: { id: "e1" }, to: { id: "e2" } }],
  ]);

  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default store mock
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        hoveredPathId: null,
        selectedPathId: null,
        computedPaths: mockComputedPaths,
        isComputingPaths: false,
        settings: { pathAnimationMode: "default" },
      };
      return selector(state);
    });
  });

  it("should initialize default state", () => {
    const { result } = renderHook(() => useInfoPanelState());
    expect(result.current.activeTab).toBe("info");
    expect(result.current.selectedWaypoint).toBeNull();
    expect(result.current.displayPath).toBeNull();
    expect(result.current.displayEmotion).toBeNull();
  });

  it("should manage active tab", () => {
    const { result } = renderHook(() => useInfoPanelState());
    act(() => {
      result.current.setActiveTab("stats");
    });
    expect(result.current.activeTab).toBe("stats");
  });

  it("should prioritize selected path over hovered path", () => {
    // Redefine mock for this test
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        hoveredPathId: "e2-e1", // Different
        selectedPathId: "e1-e2",
        computedPaths: new Map([
          ["e1-e2", { id: "selected" }],
          ["e2-e1", { id: "hovered" }],
          // fix map access in hook
          ["e1-e2", { id: "selected", from: { id: "e1" }, to: { id: "e2" } }],
          ["e2-e1", { id: "hovered", from: { id: "e2" }, to: { id: "e1" } }],
        ]),
        settings: {},
      };
      // Map get fix
      state.computedPaths.get = (key) => {
        if (key === "e1-e2") return { id: "selected", from: { id: "e1" }, to: { id: "e2" } };
        if (key === "e2-e1") return { id: "hovered", from: { id: "e2" }, to: { id: "e1" } };
        return undefined;
      };
      return selector(state);
    });

    const { result } = renderHook(() => useInfoPanelState());
    // @ts-ignore
    expect(result.current.displayPath.id).toBe("selected");
  });

  it("should display passed emotion if no path selected", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(["e1"]), // 1 selected
        hoveredEmotionId: null,
        hoveredPathId: null,
        selectedPathId: null,
        computedPaths: mockComputedPaths,
        settings: {},
      };
      return selector(state);
    });

    const { result } = renderHook(() => useInfoPanelState());
    expect(result.current.displayEmotion).toEqual({ id: "e1", name: "Joy" });
  });

  it("should filter selected paths", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(["e1", "e2"]),
        hoveredEmotionId: null,
        hoveredPathId: null,
        selectedPathId: null,
        computedPaths: mockComputedPaths, // has e1-e2
        settings: {},
      };
      return selector(state);
    });

    const { result } = renderHook(() => useInfoPanelState());
    expect(result.current.selectedPaths).toHaveLength(1);
    expect(result.current.selectedPaths[0].id).toBe("e1-e2");
  });

  it("should return null for displayPath when path missing from map", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        hoveredPathId: "unknown-path",
        selectedPathId: null,
        computedPaths: mockComputedPaths,
        settings: {},
      };
      return selector(state);
    });

    const { result } = renderHook(() => useInfoPanelState());
    expect(result.current.displayPath).toBeNull();
  });

  it("should return null for displayPath when selected path missing from map", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: null,
        hoveredPathId: null,
        selectedPathId: "unknown-selected-path",
        computedPaths: mockComputedPaths,
        settings: {},
      };
      return selector(state);
    });

    const { result } = renderHook(() => useInfoPanelState());
    expect(result.current.displayPath).toBeNull();
  });

  it("should return null for displayEmotion when emotion missing from list", () => {
    (useVisualizationStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        allEmotions: mockAllEmotions,
        selectedEmotionIds: new Set(),
        hoveredEmotionId: "unknown-emotion",
        hoveredPathId: null,
        selectedPathId: null,
        computedPaths: mockComputedPaths,
        settings: {},
      };
      return selector(state);
    });

    const { result } = renderHook(() => useInfoPanelState());
    expect(result.current.displayEmotion).toBeNull();
  });
});
