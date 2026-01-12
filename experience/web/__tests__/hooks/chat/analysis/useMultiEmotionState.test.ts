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
                { valence: 0.8, arousal: 0.5, dominance: 0.5 },
                0.9,
                "dominant"
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
            result.current.addMultiEmotion("joy", "happiness", { valence: 0.8, arousal: 0.5, dominance: 0.5 }, 0.9, "dominant");
        });

        act(() => {
            result.current.addMultiEmotion("surprise", "surprise", { valence: 0.5, arousal: 0.8, dominance: 0.5 }, 0.8, "secondary");
        });

        expect(result.current.multiEmotionAnalysis?.emotions).toHaveLength(2);
    });

    it("should add relationships", () => {
        const { result } = renderHook(() => useMultiEmotionState(sessionId));

        act(() => {
            result.current.addMultiEmotion("joy", "happiness", { valence: 0.8, arousal: 0.5, dominance: 0.5 }, 0.9, "dominant");
            result.current.addRelationship("joy", "surprise", "triggers", 0.8, " Joy leads to surprise");
        });

        expect(result.current.multiEmotionAnalysis?.relationships).toHaveLength(1);
        expect(result.current.multiEmotionAnalysis?.relationships[0].emotion_a).toBe("joy");
    });

    it("should update aggregate state", () => {
        const { result } = renderHook(() => useMultiEmotionState(sessionId));

        act(() => {
            // Must init first
            result.current.addMultiEmotion("joy", "happiness", { valence: 0.8, arousal: 0.5, dominance: 0.5 }, 0.9, "dominant");
        });

        act(() => {
            result.current.updateAggregateState({
                complexity_score: 0.8,
                emotional_clarity: 0.9
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
            result.current.addMultiEmotion("joy", "happiness", { valence: 0.8, arousal: 0.5, dominance: 0.5 }, 0.9, "dominant");
            result.current.clearMultiEmotionState();
        });

        expect(result.current.multiEmotionAnalysis).toBeNull();
        expect(result.current.threeWayAnalysis).toBeNull();
    });
});
