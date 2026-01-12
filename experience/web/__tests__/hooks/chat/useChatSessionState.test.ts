import { renderHook, act } from "@testing-library/react";
import { useChatSessionState } from "@/hooks/chat/useChatSessionState";

describe("useChatSessionState", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2024-01-01T12:00:00Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should initialize metrics with start time", () => {
    const { result } = renderHook(() => useChatSessionState());

    expect(result.current.sessionMetrics.startTime).toEqual(new Date("2024-01-01T12:00:00Z"));
    expect(result.current.sessionMetrics.elapsedSeconds).toBe(0);
  });

  it("should update elapsed time", () => {
    const { result } = renderHook(() => useChatSessionState());

    act(() => {
      jest.advanceTimersByTime(5000);
    });

    expect(result.current.sessionMetrics.elapsedSeconds).toBe(5);
  });

  it("should allow manual metric updates", () => {
    const { result } = renderHook(() => useChatSessionState());

    act(() => {
      result.current.setSessionMetrics((prev) => ({
        ...prev,
        emotionCount: 5,
      }));
    });

    expect(result.current.sessionMetrics.emotionCount).toBe(5);
  });

  it("should manage VAC history", () => {
    const { result } = renderHook(() => useChatSessionState());

    const timestamp = Date.now();
    const fullPoint = {
      timestamp,
      valence: 0.5,
      arousal: 0.5,
      vac: { valence: 1, arousal: 0, connection: 0 },
      emotion: "Joy",
      confidence: 0.9,
    };

    act(() => {
      // @ts-ignore - explicitly testing with data that might need casting or is valid within the app context
      result.current.setVacHistory([fullPoint]);
    });

    expect(result.current.vacHistory).toHaveLength(1);
    expect(result.current.vacHistory[0]).toEqual(fullPoint);
  });
});
