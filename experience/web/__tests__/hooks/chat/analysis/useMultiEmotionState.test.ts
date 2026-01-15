import { renderHook, act } from "@testing-library/react";
import { useMultiEmotionState } from "@/hooks/chat/analysis/useMultiEmotionState";

describe("useMultiEmotionState", () => {
  const sessionId = "session-123";

  it("should initialize with null states", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    expect(result.current.multiEmotionAnalysis).toBeNull();
    expect(result.current.threeWayAnalysis).toBeNull();
  });

  it("should add multi-emotion analysis", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    act(() => {
      result.current.addMultiEmotion(
        "joy",
        "happiness",
        { valence: 0.8, arousal: 0.5, connection: 0.5 },
        0.9,
        "primary"
      );
    });

    expect(result.current.multiEmotionAnalysis).not.toBeNull();
    expect(result.current.multiEmotionAnalysis?.emotions).toHaveLength(1);
    expect(result.current.multiEmotionAnalysis?.emotions[0].emotion_name).toBe("joy");
    expect(result.current.multiEmotionAnalysis?.session_id).toBe(sessionId);
  });

  it("should add multiple emotions", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    act(() => {
      result.current.addMultiEmotion(
        "joy",
        "happiness",
        { valence: 0.8, arousal: 0.5, connection: 0.5 },
        0.9,
        "primary"
      );
    });

    act(() => {
      result.current.addMultiEmotion(
        "surprise",
        "surprise",
        { valence: 0.5, arousal: 0.8, connection: 0.5 },
        0.8,
        "secondary"
      );
    });

    expect(result.current.multiEmotionAnalysis?.emotions).toHaveLength(2);
  });

  it("should add relationships", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    act(() => {
      result.current.addMultiEmotion(
        "joy",
        "happiness",
        { valence: 0.8, arousal: 0.5, connection: 0.5 },
        0.9,
        "primary"
      );
      result.current.addRelationship(
        "joy",
        "surprise",
        "sequential",
        0.8,
        " Joy leads to surprise"
      );
    });

    expect(result.current.multiEmotionAnalysis?.relationships).toHaveLength(1);
    expect(result.current.multiEmotionAnalysis?.relationships[0].emotion_a).toBe("joy");
  });

  it("should update aggregate state", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    act(() => {
      // Must init first
      result.current.addMultiEmotion(
        "joy",
        "happiness",
        { valence: 0.8, arousal: 0.5, connection: 0.5 },
        0.9,
        "primary"
      );
    });

    act(() => {
      result.current.updateAggregateState({
        complexity_score: 0.8,
        emotional_clarity: 0.9,
      });
    });

    expect(result.current.multiEmotionAnalysis?.aggregate.complexity_score).toBe(0.8);
  });

  it("should update three way analysis", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    const mockAnalysis: any = { id: "123" };

    act(() => {
      result.current.updateThreeWayAnalysis(mockAnalysis);
    });

    expect(result.current.threeWayAnalysis).toEqual(mockAnalysis);
  });

  it("should clear state", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    act(() => {
      result.current.addMultiEmotion(
        "joy",
        "happiness",
        { valence: 0.8, arousal: 0.5, connection: 0.5 },
        0.9,
        "primary"
      );
      result.current.clearMultiEmotionState();
    });

    expect(result.current.multiEmotionAnalysis).toBeNull();
    expect(result.current.threeWayAnalysis).toBeNull();
  });

  it("should ignore relationship addition if state is null", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));
    act(() => {
      result.current.addRelationship("a", "b", "sequential", 0.5, "desc");
    });
    expect(result.current.multiEmotionAnalysis).toBeNull();
  });

  it("should ignore aggregate update if state is null", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));
    act(() => {
      result.current.updateAggregateState({ complexity_score: 1 });
    });
    expect(result.current.multiEmotionAnalysis).toBeNull();
  });

  it("should preserve VAC in aggregate update if not provided", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));
    const initialVAC = { valence: 0.1, arousal: 0.2, connection: 0.3 };

    act(() => {
      result.current.addMultiEmotion("joy", "cat", initialVAC, 1, "primary");
    });

    act(() => {
      result.current.updateAggregateState({ complexity_score: 0.9 });
    });

    expect(result.current.multiEmotionAnalysis?.aggregate.vac).toEqual(initialVAC);
    expect(result.current.multiEmotionAnalysis?.aggregate.complexity_score).toBe(0.9);
  });
  it("should fallback to default values in aggregate update", () => {
    const { result } = renderHook(() => useMultiEmotionState(sessionId));

    act(() => {
      result.current.addMultiEmotion(
        "joy",
        "cat",
        { valence: 1, arousal: 1, connection: 1 },
        1,
        "primary"
      );
    });

    // First update to set non-zero values
    act(() => {
      result.current.updateAggregateState({ complexity_score: 0.9, emotional_clarity: 0.9 });
    });

    // Second update with empty partial to check defaults (0)?
    // Wait, the logic is `state.complexity_score || 0`. If I pass undefined, it becomes 0.
    // If I don't pass it, it becomes 0.
    act(() => {
      result.current.updateAggregateState({});
    });

    expect(result.current.multiEmotionAnalysis?.aggregate.complexity_score).toBe(0);
    expect(result.current.multiEmotionAnalysis?.aggregate.emotional_clarity).toBe(0);
    expect(result.current.multiEmotionAnalysis?.aggregate.temporal_pattern).toBe("concurrent");
  });
});
