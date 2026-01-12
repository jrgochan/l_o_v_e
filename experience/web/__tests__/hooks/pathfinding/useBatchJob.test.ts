import { renderHook, act } from "@testing-library/react";
import { useBatchJob } from "../../../hooks/pathfinding/useBatchJob";

describe("useBatchJob", () => {
    const mockOnComplete = jest.fn();
    const mockOnFail = jest.fn();

    // Mock fetch globally
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        (global.fetch as any) = jest.fn();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should start a job", () => {
        const { result } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));

        act(() => {
            result.current.startJob("job-123", 100);
        });

        expect(result.current.isComputing).toBe(true);
        expect(result.current.progress.total).toBe(100);
    });

    it("should poll progress", async () => {
        const { result } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));

        // Mock poll response
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "processing",
                completed_paths: 50,
                total_paths: 100,
                percentage: 50,
                estimated_time_remaining: "10s"
            })
        });

        act(() => {
            result.current.startJob("job-123", 100);
        });

        // Fast-forward timer to trigger poll
        await act(async () => {
            jest.advanceTimersByTime(2000); // POLL_INTERVAL
        });

        expect(global.fetch).toHaveBeenCalledWith(
            expect.stringContaining("/observer/atlas/computation-status/job-123")
        );
        expect(result.current.progress.current).toBe(50);
        expect(result.current.estimatedTimeRemaining).toBe("10s");
    });

    it("should complete job", async () => {
        const { result } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "completed",
                completed_paths: 100,
                total_paths: 100,
                percentage: 100
            })
        });

        act(() => {
            result.current.startJob("job-123", 100);
        });

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        expect(result.current.isComputing).toBe(false);
        expect(mockOnComplete).toHaveBeenCalled();
    });

    it("should fail job", async () => {
        const { result } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));
        (global.fetch as any).mockResolvedValue({
            ok: true,
            json: async () => ({
                status: "failed",
                error_message: "Server Error"
            })
        });

        act(() => {
            result.current.startJob("job-123", 100);
        });

        await act(async () => {
            jest.advanceTimersByTime(2000);
        });

        expect(result.current.isComputing).toBe(false);
        expect(mockOnFail).toHaveBeenCalledWith("Server Error");
    });
});
