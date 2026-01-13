import { renderHook, act } from "@testing-library/react";
import { useSphereReceiver } from "@/hooks/sync/useSphereReceiver";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { SphereStateMessage } from "@/hooks/sync/types";

// Mock store
jest.mock("@/stores/useExperienceStore");
jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("useSphereReceiver", () => {
  let setTarget: jest.Mock;
  let setTransitionPath: jest.Mock;
  let setShowPath: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();

    setTarget = jest.fn();
    setTransitionPath = jest.fn();
    setShowPath = jest.fn();

    (useExperienceStore.getState as jest.Mock) = jest.fn().mockReturnValue({
      setTarget,
      setTransitionPath,
      setShowPath,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should update target on sphere_update", () => {
    const { result } = renderHook(() => useSphereReceiver("listener", 0));

    const message: SphereStateMessage = {
      type: "sphere_update",
      vac: [0.1, 0.2, 0.3],
      timestamp: 1000,
    };

    act(() => {
      result.current.handleMessage(message);
    });

    expect(setTarget).toHaveBeenCalledWith([0.1, 0.2, 0.3]);
    expect(result.current.lastUpdate).toBe(1000);
  });

  it("should update path on path_update", () => {
    const { result } = renderHook(() => useSphereReceiver("listener", 0));

    const message: any = {
      type: "path_update",
      path: { id: "p1" },
      timestamp: 2000,
    };

    act(() => {
      result.current.handleMessage(message);
    });

    expect(setTransitionPath).toHaveBeenCalledWith({ id: "p1" });
  });

  it("should trigger stale callback when no updates received", () => {
    const onStale = jest.fn();
    jest.setSystemTime(10000); // Start at t=10000

    // Pass initial lastUpdate > 0 to enable the check
    renderHook(() => useSphereReceiver("listener", 10000, undefined, onStale));

    act(() => {
      jest.advanceTimersByTime(65000); // > 60000 threshold
    });

    expect(onStale).toHaveBeenCalled();
  });

  it("should NOT trigger stale callback in broadcaster mode", () => {
    const onStale = jest.fn();
    renderHook(() => useSphereReceiver("broadcaster", Date.now(), undefined, onStale)); // Broadcast mode

    act(() => {
      jest.advanceTimersByTime(6000);
    });

    expect(onStale).not.toHaveBeenCalled();
  });

  it("should handle optional path visibility update", () => {
    const { result } = renderHook(() => useSphereReceiver("listener", 0));

    // Test with showPath
    act(() => {
      result.current.handleMessage({
        type: "path_update",
        path: { id: "p1" },
        showPath: true,
        timestamp: 123
      } as any);
    });

    expect(setShowPath).toHaveBeenCalledWith(true);
  });

  it("should handle heartbeat", () => {
    const { result } = renderHook(() => useSphereReceiver("listener", 0));

    act(() => {
      result.current.handleMessage({
        type: "heartbeat",
        timestamp: 123
      });
    });
    // Just verify no crash, logger is mocked but not exported for verification easily unless we spy on import.
  });

  it("should clear path when path_update has no path", () => {
    const { result } = renderHook(() => useSphereReceiver("listener", 0));

    act(() => {
      result.current.handleMessage({
        type: "path_update",
        path: undefined, // path cleared
        timestamp: 456
      } as any);
    });

    expect(setTransitionPath).toHaveBeenCalledWith(null);
  });

  it("should handle 0 lastUpdate (fresh start) without stale", () => {
    const onStale = jest.fn();
    // lastUpdate 0 -> fallback to Date.now() -> elapsed 0 -> no stale
    renderHook(() => useSphereReceiver("listener", 0, undefined, onStale));

    act(() => {
      jest.advanceTimersByTime(10000);
    });

    expect(onStale).not.toHaveBeenCalled();
  });
});
