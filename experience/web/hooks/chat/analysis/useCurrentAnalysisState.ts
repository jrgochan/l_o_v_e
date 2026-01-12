import { useState, useCallback } from "react";
import type { CurrentAnalysis } from "@/types/chat";

export function useCurrentAnalysisState() {
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis>({
    transcription: null,
    prosody: null,
    emotion: null,
    category: null,
    vac: null,
    confidence: null,
    insights: null,
    audioBlob: null,
  });

  /**
   * Update current analysis (partial update)
   */
  const updateAnalysis = useCallback((updates: Partial<CurrentAnalysis>) => {
    setCurrentAnalysis((prev) => ({
      ...prev,
      ...updates,
    }));
  }, []);

  /**
   * Clear current analysis state
   */
  const clearCurrentAnalysis = useCallback(() => {
    setCurrentAnalysis({
      transcription: null,
      prosody: null,
      emotion: null,
      category: null,
      vac: null,
      confidence: null,
      insights: null,
      audioBlob: null,
    });
  }, []);

  return {
    currentAnalysis,
    updateAnalysis,
    clearCurrentAnalysis,
  };
}
