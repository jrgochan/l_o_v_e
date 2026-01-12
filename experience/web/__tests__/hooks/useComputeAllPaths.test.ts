import { renderHook, waitFor } from "@testing-library/react";
import { useComputeAllPaths } from "@/hooks/useComputeAllPaths";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { atlasService } from "@/services/atlasService";
import { useBatchJob } from "@/hooks/pathfinding/useBatchJob";

jest.mock("@/stores/useAtlasAdminStore");
jest.mock("@/services/atlasService");
jest.mock("@/hooks/pathfinding/useBatchJob");

describe("useComputeAllPaths", () => {
    const mockAddComputedPath = jest.fn();
    const mockStartJob = jest.fn();
    const mockSetProgress = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        window.confirm = jest.fn();
        window.alert = jest.fn();

        (useAtlasAdminStore as unknown as jest.Mock).mockReturnValue([{ id: "e1" }, { id: "e2" }]); // selector
        (useAtlasAdminStore.getState as jest.Mock).mockReturnValue({
            allEmotions: [{ id: "e1" }, { id: "e2" }]
        });

        // mock selector behavior in component
        (useAtlasAdminStore as unknown as jest.Mock).mockImplementation((selector) => {
            // If selector is picking allEmotions
            const state = {
                allEmotions: [{ id: "e1" }, { id: "e2" }],
                addComputedPath: mockAddComputedPath,
            };
            return selector(state);
        });

        (useBatchJob as jest.Mock).mockReturnValue({
            startJob: mockStartJob,
            isComputing: false,
            progress: {},
            estimatedTimeRemaining: 0,
            setProgress: mockSetProgress
        });
    });

    it("should start batch job on confirmation", async () => {
        window.confirm = jest.fn(() => true);
        (atlasService.computeAllPaths as jest.Mock).mockResolvedValue({ job_id: "job-123" });

        const { result } = renderHook(() => useComputeAllPaths());
        await result.current.computeAllPaths();

        expect(atlasService.computeAllPaths).toHaveBeenCalled();
        expect(mockStartJob).toHaveBeenCalledWith("job-123", expect.any(Number));
    });

    it("should abort if not confirmed", async () => {
        window.confirm = jest.fn(() => false);
        const { result } = renderHook(() => useComputeAllPaths());
        await result.current.computeAllPaths();

        expect(atlasService.computeAllPaths).not.toHaveBeenCalled();
    });

    it("should handle service error", async () => {
        window.confirm = jest.fn(() => true);
        (atlasService.computeAllPaths as jest.Mock).mockRejectedValue(new Error("Fail"));

        const { result } = renderHook(() => useComputeAllPaths());
        await result.current.computeAllPaths();

        expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Error"));
        expect(mockSetProgress).toHaveBeenCalledWith(expect.objectContaining({ total: 0 }));
    });
});
