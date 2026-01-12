import { useState, useCallback } from "react";
import type {
  VAC,
  MultiEmotionAnalysis,
  ThreeWayAnalysis,
  EmotionProminence,
  RelationshipType,
  AggregateState,
} from "@/types/chat";

export function useMultiEmotionState(sessionId: string) {
  const [multiEmotionAnalysis, setMultiEmotionAnalysis] = useState<MultiEmotionAnalysis | null>(
    null
  );
  const [threeWayAnalysis, setThreeWayAnalysis] = useState<ThreeWayAnalysis | null>(null);

  /**
   * Clear all multi-emotion analysis state
   */
  const clearMultiEmotionState = useCallback(() => {
    setMultiEmotionAnalysis(null);
    setThreeWayAnalysis(null);
  }, []);

  /**
   * Add a detected emotion to multi-emotion analysis
   */
  const addMultiEmotion = useCallback(
    (
      emotion: string,
      category: string,
      vac: VAC,
      confidence: number,
      prominence: EmotionProminence
    ) => {
      const detectedEmotion = {
        id: `${Date.now()}-${emotion}`,
        emotion_name: emotion,
        category: category,
        vac: vac,
        confidence: confidence,
        prominence: prominence,
      };

      setMultiEmotionAnalysis((prev) => {
        if (!prev) {
          // Create new analysis with first emotion
          return {
            id: Date.now().toString(),
            message_id: "",
            session_id: sessionId,
            emotions: [detectedEmotion],
            relationships: [],
            aggregate: {
              vac: vac,
              complexity_score: 0,
              emotional_clarity: 0,
              temporal_pattern: "concurrent" as const,
            },
            reasoning: "",
            timestamp: new Date(),
          };
        } else {
          // Add emotion to existing analysis
          return {
            ...prev,
            emotions: [...prev.emotions, detectedEmotion],
          };
        }
      });
    },
    [sessionId]
  );

  /**
   * Add a relationship to multi-emotion analysis
   */
  const addRelationship = useCallback(
    (
      emotionA: string,
      emotionB: string,
      type: RelationshipType,
      strength: number,
      description: string
    ) => {
      const relationship = {
        id: `${Date.now()}-${emotionA}-${emotionB}`,
        emotion_a: emotionA,
        emotion_b: emotionB,
        type: type,
        strength: strength,
        description: description,
      };

      setMultiEmotionAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          relationships: [...prev.relationships, relationship],
        };
      });
    },
    []
  );

  /**
   * Update aggregate state in multi-emotion analysis
   */
  const updateAggregateState = useCallback(
    (state: Partial<AggregateState> & { aggregate_vac?: VAC }) => {
      setMultiEmotionAnalysis((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          aggregate: {
            vac: state.vac || state.aggregate_vac || prev.aggregate.vac,
            complexity_score: state.complexity_score || 0,
            emotional_clarity: state.emotional_clarity || 0,
            temporal_pattern: state.temporal_pattern || "concurrent",
          },
        };
      });
    },
    []
  );

  /**
   * Update three-way analysis
   */
  const updateThreeWayAnalysis = useCallback((data: ThreeWayAnalysis) => {
    setThreeWayAnalysis(data);
  }, []);

  return {
    multiEmotionAnalysis,
    threeWayAnalysis,
    setMultiEmotionAnalysis,
    clearMultiEmotionState,
    addMultiEmotion,
    addRelationship,
    updateAggregateState,
    updateThreeWayAnalysis,
  };
}
