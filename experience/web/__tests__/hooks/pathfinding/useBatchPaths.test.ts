import { renderHook, act } from "@testing-library/react";
import { useBatchPaths } from "../../../hooks/pathfinding/useBatchPaths";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock store state
const mockStore = {
  selectedEmotionIds: new Set(),
  allEmotions: [] as any[],
  computedPaths: new Map(),
  settings: { computeMode: "always" },
  setComputingPaths: jest.fn(),
  setError: jest.fn(),
  fetchPathFromBackend: jest.fn(),
};

jest.mock("@/stores/useAtlasAdminStore", () => ({
  useAtlasAdminStore: {
    getState: () => mockStore,
  },
}));

describe("useBatchPaths", () => {
  const mockComputePath = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockStore.selectedEmotionIds = new Set(["e1", "e2"]);
    mockStore.allEmotions = [
      { id: "e1", name: "E1" },
      { id: "e2", name: "E2" },
      { id: "e3", name: "E3" },
    ] as any[];
    mockStore.computedPaths = new Map();
    mockStore.settings = { computeMode: "always" };
  });

  it("should compute all paths in 'always' mode", async () => {
    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    // 2 emotions selected = 2 permutations (e1->e2, e2->e1)
    expect(mockStore.setComputingPaths).toHaveBeenCalledWith(true);
    expect(mockComputePath).toHaveBeenCalledTimes(2);
    expect(mockStore.setComputingPaths).toHaveBeenCalledWith(false);
  });

  it("should skip computation in 'manual' mode", async () => {
    mockStore.settings.computeMode = "manual";
    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    expect(mockStore.setComputingPaths).not.toHaveBeenCalled();
    expect(mockComputePath).not.toHaveBeenCalled();
  });

  it("should respect cache in 'cache-first' mode", async () => {
    mockStore.settings.computeMode = "cache-first";
    mockStore.computedPaths.set("e1-e2", {}); // Cache hit

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    // e1->e2 is cached
    // e2->e1 is not cached, tries backend => returns null (default) => computes fresh
    expect(mockStore.fetchPathFromBackend).toHaveBeenCalledWith("e2", "e1");
    expect(mockComputePath).toHaveBeenCalledTimes(1);
  });

  it("should use backend result in 'cache-first' mode", async () => {
    mockStore.settings.computeMode = "cache-first";
    mockStore.fetchPathFromBackend.mockResolvedValue({ id: "e2-e1" }); // Backend hit

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    // Both should check backend (no cache set), both return backend result
    expect(mockStore.fetchPathFromBackend).toHaveBeenCalledTimes(2);
    expect(mockComputePath).not.toHaveBeenCalled();
  });

  it("should do nothing if < 2 emotions selected", async () => {
    mockStore.selectedEmotionIds = new Set(["e1"]);

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    expect(mockStore.setComputingPaths).not.toHaveBeenCalled();
  });

  it("should handle error during computation", async () => {
    mockStore.settings.computeMode = "always";
    mockComputePath.mockRejectedValue(new Error("Compute Failed"));

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    expect(mockStore.setError).toHaveBeenCalledWith("Compute Failed");
    expect(mockStore.setComputingPaths).toHaveBeenCalledWith(false); // finally block
  });

  it("should skip existing paths in 'always' mode", async () => {
    mockStore.settings.computeMode = "always";
    mockStore.computedPaths.set("e1-e2", {}); // Already exists

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    // e1->e2 exists, skip
    // e2->e1 missing, compute
    expect(mockComputePath).toHaveBeenCalledTimes(1);
    expect(mockComputePath).toHaveBeenCalledWith(
      expect.objectContaining({ id: "e2" }),
      expect.objectContaining({ id: "e1" })
    );
  });

  it("should handle non-Error throws", async () => {
    mockStore.settings.computeMode = "always";
    mockComputePath.mockRejectedValue("String Error"); // Not an Error object

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    expect(mockStore.setError).toHaveBeenCalledWith("Error computing paths");
  });

  it("should do nothing for unknown modes", async () => {
    mockStore.settings.computeMode = "unknown" as any;

    const { result } = renderHook(() => useBatchPaths({ computePath: mockComputePath }));

    await act(async () => {
      await result.current.computeAllPaths();
    });

    expect(mockComputePath).not.toHaveBeenCalled();
    expect(mockStore.fetchPathFromBackend).not.toHaveBeenCalled();
  });
});
