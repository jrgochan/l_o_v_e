import { renderHook, act } from "@testing-library/react";
import { useSinglePath } from "../../../hooks/pathfinding/useSinglePath";

// Mock store
const mockAddComputedPath = jest.fn();
jest.mock("@/stores/useAtlasAdminStore", () => ({
    useAtlasAdminStore: () => ({
        addComputedPath: mockAddComputedPath
    })
}));

describe("useSinglePath", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as any) = jest.fn();
    });

    it("should compute and add path", async () => {
        const mockFrom = { id: "e1", name: "Joy", vac: { v: 1, a: 1, c: 1 } };
        const mockTo = { id: "e2", name: "Trust", vac: { v: 0.8, a: 0.8, c: 0.8 } };

        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                path_metrics: {
                    total_distance: 5,
                    total_estimated_time: 10,
                    overall_difficulty: "easy",
                    requires_bridge: false,
                    bridge_emotions: []
                },
                waypoints: []
            })
        });

        const { result } = renderHook(() => useSinglePath());

        await act(async () => {
            await result.current.computePath(mockFrom as any, mockTo as any);
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/observer/transition-path"),
            expect.objectContaining({ method: "POST" })
        );

        expect(mockAddComputedPath).toHaveBeenCalledWith(expect.objectContaining({
            id: "e1-e2",
            from: mockFrom,
            to: mockTo
        }));
    });

    it("should handle error", async () => {
        const mockFrom = { id: "e1", vac: {} };
        const mockTo = { id: "e2", vac: {} };

        (global.fetch as any).mockRejectedValue(new Error("API Error"));

        const { result } = renderHook(() => useSinglePath());

        await expect(
            act(async () => {
                await result.current.computePath(mockFrom as any, mockTo as any);
            })
        ).rejects.toThrow("API Error");
    });
});
