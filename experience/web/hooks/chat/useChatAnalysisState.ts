import { useState } from "react";
import type { MultiEmotionAnalysis, ThreeWayAnalysis, CurrentAnalysis } from "@/types/chat";

const INITIAL_ANALYSIS: CurrentAnalysis = {
  transcription: null,
  prosody: null,
  emotion: null,
  category: null,
  vac: null,
  confidence: null,
  insights: null,
  audioBlob: null,
};

export function useChatAnalysisState() {
  const [currentAnalysis, setCurrentAnalysis] = useState<CurrentAnalysis>(INITIAL_ANALYSIS);

  // Multi-emotion analysis state
  const [multiEmotionAnalysis, setMultiEmotionAnalysis] = useState<MultiEmotionAnalysis | null>(
    null
  );
  const [threeWayAnalysis, setThreeWayAnalysis] = useState<ThreeWayAnalysis | null>(null);

  // Helper to clear analysis for new input
  const clearAnalysis = (audioBlob: Blob | null = null) => {
    setCurrentAnalysis({ ...INITIAL_ANALYSIS, audioBlob });
    setMultiEmotionAnalysis(null);
  };

  return {
    currentAnalysis,
    setCurrentAnalysis,
    multiEmotionAnalysis,
    setMultiEmotionAnalysis,
    threeWayAnalysis,
    setThreeWayAnalysis,
    clearAnalysis,
  };
}
