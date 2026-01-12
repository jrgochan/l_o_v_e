/**
 * Custom hook for managing analysis state
 *
 * Handles current analysis state, multi-emotion analysis, and three-way analysis.
 * Extracted from ChatPanel.tsx to reduce complexity.
 *
 * @example
 * ```tsx
 * const {
 *   currentAnalysis,
 *   multiEmotionAnalysis,
 *   threeWayAnalysis,
 *   updateAnalysis,
 *   clearAnalysis
 * } = useAnalysisState(sessionId);
 *
 * // Update current analysis
 * updateAnalysis({ emotion: 'Joy', vac: {...} });
 *
 * // Clear analysis
 * clearAnalysis();
 * ```
 *
 * @returns Object containing analysis state and update functions
 */

import { useCallback } from "react";
import { useCurrentAnalysisState } from "./analysis/useCurrentAnalysisState";
import { useMultiEmotionState } from "./analysis/useMultiEmotionState";

export function useAnalysisState(sessionId: string) {
  const { currentAnalysis, updateAnalysis, clearCurrentAnalysis } = useCurrentAnalysisState();

  const {
    multiEmotionAnalysis,
    threeWayAnalysis,
    setMultiEmotionAnalysis,
    clearMultiEmotionState,
    addMultiEmotion,
    addRelationship,
    updateAggregateState,
    updateThreeWayAnalysis,
  } = useMultiEmotionState(sessionId);

  /**
   * Clear all analysis state
   */
  const clearAnalysis = useCallback(() => {
    clearCurrentAnalysis();
    clearMultiEmotionState();
  }, [clearCurrentAnalysis, clearMultiEmotionState]);

  return {
    currentAnalysis,
    multiEmotionAnalysis,
    threeWayAnalysis,
    updateAnalysis,
    clearAnalysis,
    addMultiEmotion,
    addRelationship,
    updateAggregateState,
    updateThreeWayAnalysis,
    setMultiEmotionAnalysis,
  };
}
