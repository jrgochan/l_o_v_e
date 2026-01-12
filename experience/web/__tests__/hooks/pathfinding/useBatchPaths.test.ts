import { renderHook, act } from "@testing-library/react";
import { useBatchPaths } from "../../../hooks/pathfinding/useBatchPaths";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

// Mock store state
const mockStore = {
    selectedEmotionIds: new Set(),
    allEmotions: [],
    computedPaths: new Map(),
    settings: { computeMode: "always" },
    setComputingPaths: jest.fn(),
    setError: jest.fn(),
    fetchPathFromBackend: jest.fn()
};

jest.mock("@/stores/useAtlasAdminStore", () => ({
    useAtlasAdminStore: {
        getState: () => mockStore
    }
}));

describe("useBatchPaths", () => {
    const mockComputePath = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        mockStore.selectedEmotionIds = new Set(["e1", "e2"]);
        mockStore.allEmotions = [
            { id: "e1", name: "E1" },
            { id: "e2", name: "E2" },
            { id: "e3", name: "E3" }
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

        // e1->e2 is cached, e2->e1 is not
        // Should fetch backend for e2->e1
        expect(mockStore.fetchPathFromBackend).toHaveBeenCalledWith("e2", "e1");

        // If backend returns null (default mock), should compute fresh
        expect(mockComputePath).toHaveBeenCalledTimes(1);
    });
});
