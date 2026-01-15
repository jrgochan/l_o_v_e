import { renderHook, act } from "@testing-library/react";
import { useProgressSimulation } from "@/hooks/chat/progress/useProgressSimulation";

jest.useFakeTimers();

describe("useProgressSimulation", () => {
  it("should simulate progress updates over time", () => {
    const setProgress = jest.fn();
    const { result } = renderHook(() => useProgressSimulation(setProgress));

    // Start simulation
    act(() => {
      result.current.startProgressSimulation();
    });

    // Fast forward 500ms
    act(() => {
      jest.advanceTimersByTime(500);
    });

    // Should have called setProgress with an updater function
    expect(setProgress).toHaveBeenCalled();

    // Verify the updater logic
    // We can't easily check the internal state of the functional update passed to setProgress
    // But we can check if it was called.
    // To verify logic, we can spy on the updater or mock the state impl.
    // Let's rely on functional behavior: if we pass a state update, it should return new state.

    const updater = setProgress.mock.calls[0][0];
    const prevState = { overallPercentage: 10 };
    const newState = updater(prevState);

    expect(newState.overallPercentage).toBe(10.5);
  });

  it("should stop simulation when stopped", () => {
    const setProgress = jest.fn();
    const { result } = renderHook(() => useProgressSimulation(setProgress));

    act(() => {
      result.current.startProgressSimulation();
    });

    act(() => {
      result.current.stopProgressSimulation();
      jest.advanceTimersByTime(1000);
    });

    // Calls from start (maybe unresolved immediately?)
    // We advanced time AFTER stop.
    // If we advance time BEFORE stop it would call.
    // Let's reset mock to be sure no calls happened AFTER stop.
    setProgress.mockClear();

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(setProgress).not.toHaveBeenCalled();
  });

  it("should handle stop when not running (branch coverage)", () => {
    const setProgress = jest.fn();
    const { result } = renderHook(() => useProgressSimulation(setProgress));

    // Call stop without ever starting (ref.current is null)
    act(() => {
      result.current.stopProgressSimulation();
    });

    // Should not throw or error
    expect(setProgress).not.toHaveBeenCalled();
  });

  it("should clear existing interval if started while running", () => {
    const setProgress = jest.fn();
    const { result } = renderHook(() => useProgressSimulation(setProgress));

    act(() => {
      result.current.startProgressSimulation();
    });

    // Start again immediately
    act(() => {
      result.current.startProgressSimulation();
    });

    // Should still work
    act(() => {
      jest.advanceTimersByTime(500);
    });

    expect(setProgress).toHaveBeenCalled();
  });

  it("should cap progress at 90%", () => {
    const setProgress = jest.fn();
    const { result } = renderHook(() => useProgressSimulation(setProgress));

    act(() => {
      result.current.startProgressSimulation();
      jest.advanceTimersByTime(500);
    });

    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    // Simulate the updater function being called when progress reaches 90%
    const updater = setProgress.mock.calls[0][0];
    const prevState = { overallPercentage: 90 };

    // This manual call simulates what happens inside the interval callback
    updater(prevState);

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("should cleanup interval on unmount", () => {
    const setProgress = jest.fn();
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { result, unmount } = renderHook(() => useProgressSimulation(setProgress));

    act(() => {
      result.current.startProgressSimulation();
    });

    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("should handle unmount when not running (branch coverage)", () => {
    const setProgress = jest.fn();
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { unmount } = renderHook(() => useProgressSimulation(setProgress));

    // Unmount without starting
    unmount();

    // Should not call clearInterval if not running
    expect(clearIntervalSpy).not.toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it("should not clear interval if ref is null when reaching 90% (defensive branch)", () => {
    const setProgress = jest.fn();
    const clearIntervalSpy = jest.spyOn(global, "clearInterval");

    const { result } = renderHook(() => useProgressSimulation(setProgress));

    act(() => {
      result.current.startProgressSimulation();
      jest.advanceTimersByTime(500);
    });

    // Capture the updater
    const updater = setProgress.mock.calls[0][0];

    // Stop simulation to set ref.current = null
    act(() => {
      result.current.stopProgressSimulation();
    });

    // Clear the spy from the stop call
    clearIntervalSpy.mockClear();

    // Now execute updater with 90% state
    // This hits the branch where percentage >= 90 BUT ref is null
    updater({ overallPercentage: 90 });

    // Should NOT call clearInterval again (since ref is null)
    expect(clearIntervalSpy).not.toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
