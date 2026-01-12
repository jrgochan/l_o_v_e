import { renderHook } from "@testing-library/react";
import { usePathCalculator } from "@/hooks/usePathCalculator";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useSinglePath } from "@/hooks/pathfinding/useSinglePath";
import { useBatchPaths } from "@/hooks/pathfinding/useBatchPaths";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/hooks/pathfinding/useSinglePath");
jest.mock("@/hooks/pathfinding/useBatchPaths");

describe("usePathCalculator", () => {
  const mockComputePath = jest.fn();
  const mockComputeAllPaths = jest.fn();
  const mockClearComputedPaths = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (useSinglePath as jest.Mock).mockReturnValue({ computePath: mockComputePath });
    (useBatchPaths as jest.Mock).mockReturnValue({ computeAllPaths: mockComputeAllPaths });

    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEmotionIds: new Set(),
        computedPaths: new Map(),
        isComputingPaths: false,
        allEmotions: [{ id: "e1" }, { id: "e2" }],
        settings: { computeMode: "auto" },
        clearComputedPaths: mockClearComputedPaths,
      };
      return selector ? selector(state) : state;
    });
  });

  it("should auto-compute paths when 2+ emotions selected", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEmotionIds: new Set(["e1", "e2"]),
        computedPaths: new Map(),
        isComputingPaths: false,
        allEmotions: [],
        settings: { computeMode: "auto" },
        clearComputedPaths: mockClearComputedPaths,
      };
      return selector ? selector(state) : state;
    });

    renderHook(() => usePathCalculator());
    expect(mockComputeAllPaths).toHaveBeenCalled();
  });

  it("should clear paths when selection drops below 2", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEmotionIds: new Set(["e1"]), // Only 1
        computedPaths: new Map([["p1", {} as any]]), // Has existing
        isComputingPaths: false,
        allEmotions: [],
        settings: { computeMode: "auto" },
        clearComputedPaths: mockClearComputedPaths,
      };
      return selector ? selector(state) : state;
    });

    renderHook(() => usePathCalculator());
    expect(mockClearComputedPaths).toHaveBeenCalled();
  });

  it("should skip auto-compute in manual mode", () => {
    (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
      const state = {
        selectedEmotionIds: new Set(["e1", "e2"]),
        computedPaths: new Map(),
        isComputingPaths: false,
        allEmotions: [],
        settings: { computeMode: "manual" }, // Manual
        clearComputedPaths: mockClearComputedPaths,
      };
      return selector ? selector(state) : state;
    });

    renderHook(() => usePathCalculator());
    expect(mockComputeAllPaths).not.toHaveBeenCalled();
  });

  it("should compute specific path manually", async () => {
    const { result } = renderHook(() => usePathCalculator());

    await result.current.computeSpecificPath("e1", "e2");
    expect(mockComputePath).toHaveBeenCalledWith({ id: "e1" }, { id: "e2" });
  });

  it("should throw if emotion not found for manual computation", async () => {
    const { result } = renderHook(() => usePathCalculator());

    await expect(result.current.computeSpecificPath("e1", "invalid")).rejects.toThrow(
      "Emotion not found"
    );
  });
});
