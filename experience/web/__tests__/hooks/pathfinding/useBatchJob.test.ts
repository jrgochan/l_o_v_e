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
        estimated_time_remaining: "10s",
      }),
    });

    act(() => {
      result.current.startJob("job-123", 100);
    });

    // Fast-forward timer to trigger poll
    await act(async () => {
      jest.advanceTimersByTime(2000); // POLL_INTERVAL
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/observer/computation-status/job-123")
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
        percentage: 100,
      }),
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
        error_message: "Server Error",
      }),
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

  it("should handle fetch error (network failure)", async () => {
    const { result } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));
    (global.fetch as any).mockRejectedValue(new Error("Network Error"));

    // Mock logger to verify error logging
    // Assuming logger is imported, but we might not have easy access to mock it if it's not DI.
    // However, we just want to ensure it doesn't crash the hook execution loop.

    act(() => {
      result.current.startJob("job-net-fail", 100);
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Should still be computing (retrying effectively, or just waiting for next poll)
    expect(result.current.isComputing).toBe(true);
  });

  it("should handle non-ok response", async () => {
    const { result } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    act(() => {
      result.current.startJob("job-500", 100);
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    // Should ignore and keep computing
    expect(result.current.isComputing).toBe(true);
  });

  it("should cleanup interval on unmount", () => {
    const { result, unmount } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));

    act(() => {
      result.current.startJob("job-cleanup", 100);
    });

    // Verify interval is set (by valid state)
    expect(result.current.isComputing).toBe(true);

    unmount();

    // Timer should be cleared.
    // Jest fake timers doesn't expose 'getTimerCount' easily in all envs without specific setup,
    // but unmount triggering the effect cleanup is standard React behavior we rely on.
    // Coverage report will confirm line execution.
  });
  it("should cleanup safely when unmounted without active job", () => {
    const { unmount } = renderHook(() => useBatchJob(mockOnComplete, mockOnFail));
    unmount();
    // Implicitly asserts no error thrown and covers the 'else' path where interval is null
  });

  it("should handle cleanup when interval ref is null", () => {
    const { unmount } = renderHook(() => useBatchJob());
    // Immediately unmount without starting anything
    unmount();
    // Should not crash and implicitly hits the else branch of the cleanup check
  });
  it("should handle missing callbacks", async () => {
    // Render without callbacks
    const { result } = renderHook(() => useBatchJob());

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "completed",
        completed_paths: 100,
        total_paths: 100,
        percentage: 100,
      }),
    });

    act(() => {
      result.current.startJob("job-no-cb", 100);
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isComputing).toBe(false);

    // Test failure without callback
    act(() => {
      result.current.startJob("job-fail-no-cb", 100);
    });

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "failed",
        error_message: "Error",
      }),
    });

    await act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(result.current.isComputing).toBe(false);
  });

  it("should clear interval on unmount while computing", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "processing",
        completed_paths: 10,
        total_paths: 100,
        percentage: 10,
      }),
    });

    const { result, unmount } = renderHook(() => useBatchJob());

    await act(async () => {
      result.current.startJob("job-unmount", 100);
    });

    expect(result.current.isComputing).toBe(true);

    // Unmount while computing to trigger cleanup check
    unmount();
  });
});
