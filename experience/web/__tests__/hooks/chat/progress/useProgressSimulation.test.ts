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

  it("should cap progress at 90%", () => {
    const setProgress = jest.fn();
    const { result } = renderHook(() => useProgressSimulation(setProgress));

    act(() => {
      result.current.startProgressSimulation();
      jest.advanceTimersByTime(500);
    });

    const updater = setProgress.mock.calls[0][0];
    const prevState = { overallPercentage: 90 };
    const newState = updater(prevState);

    // If >= 90, it should return same state (and maybe clear interval internally)
    expect(newState).toBe(prevState);
  });
});
