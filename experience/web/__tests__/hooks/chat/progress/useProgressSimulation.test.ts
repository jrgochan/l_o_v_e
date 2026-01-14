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

    const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

    act(() => {
      // Advance to trigger the update where it should stop
      jest.advanceTimersByTime(500);
    });

    const updater = setProgress.mock.calls[0][0];
    const prevState = { overallPercentage: 90 };
    // Executing the updater manually inside the test won't trigger the side effect of clearing interval 
    // because the hook logic (lines 105-108 in useChatProgress or lines 24-27 in useProgressSimulation) 
    // is inside the setState *callback* which runs during the interval tick.
    // Wait, the interval *body* calls setProgress(prev => ...).
    // The *logic* to clear interval is INSIDE the updater function in the hook:
    /*
        setProgressState((prev) => {
          if (prev.overallPercentage >= 90) {
             if (progressSimulationRef.current) clearInterval(...)
             return prev;
          }
          ...
        })
    */
    // So if I execute the updater manually with state >= 90, it SHOULD call clearInterval.

    updater(prevState);

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
