import { renderHook, act } from "@testing-library/react";
import { useHeartbeatProgress } from "@/hooks/chat/useHeartbeatProgress";

jest.mock("@/utils/logger", () => ({
  logger: {
    debug: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

describe("useHeartbeatProgress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize with empty state", () => {
    const { result } = renderHook(() => useHeartbeatProgress("warm", false));

    expect(result.current.progressState.stages).toHaveLength(0);
    expect(result.current.showProgress).toBe(false);
  });

  it("should start progress tracking", () => {
    const { result } = renderHook(() => useHeartbeatProgress("warm", false));

    act(() => {
      result.current.startProgress("semantic");
    });

    expect(result.current.showProgress).toBe(true);
    expect(result.current.progressState.currentStage).toBe("semantic");
    expect(result.current.progressState.stages.length).toBeGreaterThan(0);
  });

  it("should update progress", () => {
    const { result } = renderHook(() => useHeartbeatProgress("warm", false));

    act(() => {
      result.current.startProgress("semantic");
    });

    act(() => {
      const stages = result.current.progressState.stages;
      if (stages.length > 0) {
        result.current.updateProgress(stages[0].id, "in_progress", 50);
      }
    });

    expect(result.current.progressState.overallPercentage).toBe(50);
    const stage = result.current.progressState.stages[0];
    expect(stage?.status).toBe("in_progress");
    expect(stage?.percentage).toBe(50);
  });

  it("should complete progress", () => {
    const { result } = renderHook(() => useHeartbeatProgress("warm", false));

    act(() => {
      result.current.startProgress("semantic");
      result.current.completeProgress();
    });

    expect(result.current.showProgress).toBe(true); // Still true initially

    act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(result.current.showProgress).toBe(false);
  });

  it("should reset progress", () => {
    const { result } = renderHook(() => useHeartbeatProgress("warm", false));

    act(() => {
      result.current.startProgress("semantic");
      result.current.resetProgress();
    });

    expect(result.current.showProgress).toBe(false);
    expect(result.current.progressState.stages).toHaveLength(0);
  });
});
