import { renderHook, act } from "@testing-library/react";
import { useSessionMetrics } from "../../../hooks/chat/useSessionMetrics";
import { VAC } from "@/types/chat";

// Mock helpers
jest.mock("../../../hooks/chat/metrics/metricsUtils", () => ({
  calculateUpdatedMetrics: (prev: any) => ({ ...prev, emotionCount: prev.emotionCount + 1 }),
  calculateIncrementedAlert: (prev: any, type: string) => ({
    ...prev,
    alertCount: { ...prev.alertCount, [type]: prev.alertCount[type] + 1 },
  }),
  createInitialMetrics: (startTime = new Date()) => ({
    startTime,
    elapsedSeconds: 0,
    emotionCount: 0,
    alertCount: { critical: 0, warning: 0, attention: 0 },
  }),
}));

describe("useSessionMetrics", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize metrics", () => {
    const { result } = renderHook(() => useSessionMetrics());
    expect(result.current.sessionMetrics.elapsedSeconds).toBe(0);
    expect(result.current.sessionMetrics.emotionCount).toBe(0);
  });

  it("should increment elapsed time", () => {
    const { result } = renderHook(() => useSessionMetrics());

    act(() => {
      jest.advanceTimersByTime(2000);
    });

    // The hook uses Date.now() diff, so we need to mock Date.now() or approximate
    // But since we use fake timers effectively...
    // Wait, the hook uses: Math.floor((Date.now() - sessionStartTimeRef.current.getTime()) / 1000)
    // jest.useFakeTimers() mocks Date if 'modern' is used or legacy?
    // Let's rely on standard jest behavior. If it fails, I'll mock Date.
    expect(result.current.sessionMetrics.elapsedSeconds).toBeGreaterThanOrEqual(2);
  });

  it("should update metrics after emotion", () => {
    const { result } = renderHook(() => useSessionMetrics());

    act(() => {
      result.current.updateMetricsAfterEmotion(
        "Joy",
        "Positive",
        { valence: 0, arousal: 0, connection: 0 },
        0.9
      );
    });

    expect(result.current.sessionMetrics.emotionCount).toBe(1);
  });

  it("should increment alerts", () => {
    const { result } = renderHook(() => useSessionMetrics());
    act(() => {
      result.current.incrementAlert("critical");
    });
    expect(result.current.sessionMetrics.alertCount.critical).toBe(1);
  });

  it("should reset metrics", () => {
    const { result } = renderHook(() => useSessionMetrics());

    act(() => {
      result.current.incrementAlert("critical");
    });
    expect(result.current.sessionMetrics.alertCount.critical).toBe(1);

    act(() => {
      result.current.resetMetrics();
    });
    expect(result.current.sessionMetrics.alertCount.critical).toBe(0);
    expect(result.current.sessionMetrics.elapsedSeconds).toBe(0);
  });

  it("should update arbitrary metrics", () => {
    const { result } = renderHook(() => useSessionMetrics());

    act(() => {
      result.current.updateMetrics({ emotionCount: 5 });
    });

    expect(result.current.sessionMetrics.emotionCount).toBe(5);
  });
});
