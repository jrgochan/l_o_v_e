/**
 * Custom hook for managing Heartbeat Analyzer progress tracking
 *
 * Handles progress state, stage management, progress simulation, and adaptive messaging.
 * Extracted from ChatPanel.tsx to reduce complexity.
 * Refactored to compose simulation logic and constants.
 */

import { useState } from "react";
import type { ToneMode, ProgressStage } from "@/types/chat";
import { initializeProgressStages, getAdaptiveMessage } from "./progress/constants";
import { useProgressSimulation } from "./progress/useProgressSimulation";
import type { ProgressState } from "@/types/chat";

export function useHeartbeatProgress(toneMode: ToneMode, deepFeelingMode: boolean) {
  const [progressState, setProgressState] = useState<ProgressState>({
    stages: [],
    currentStage: "",
    overallPercentage: 0,
    currentMessage: "",
  });
  const [showProgress, setShowProgress] = useState(false);

  const { startProgressSimulation, stopProgressSimulation } =
    useProgressSimulation(setProgressState);

  /**
   * Start progress tracking
   */
  const startProgress = (initialStage: string) => {
    setShowProgress(true);
    setProgressState({
      stages: initializeProgressStages(deepFeelingMode),
      currentStage: initialStage,
      overallPercentage: 0,
      currentMessage: getAdaptiveMessage(initialStage, "started", toneMode, deepFeelingMode),
    });

    startProgressSimulation();
  };

  /**
   * Update progress for a specific stage
   */
  const updateProgress = (
    stage: string,
    status: string,
    percentage: number,
    elapsed_ms?: number
  ) => {
    // Clear any existing simulation when real update arrives
    stopProgressSimulation();

    setProgressState((prev) => {
      const updatedStages = prev.stages.map((s) => {
        if (s.id === stage) {
          return { ...s, status: status as ProgressStage["status"], percentage, elapsed_ms };
        }
        return s;
      });

      return {
        ...prev,
        stages: updatedStages,
        currentStage: stage,
        overallPercentage: percentage,
        currentMessage: getAdaptiveMessage(stage, status, toneMode, deepFeelingMode),
      };
    });

    // If we're making progress, restart simulation to fill gaps
    if (status === "in_progress" && percentage < 90) {
      startProgressSimulation();
    }
  };

  /**
   * Complete progress tracking
   */
  const completeProgress = () => {
    stopProgressSimulation();
    setTimeout(() => setShowProgress(false), 1500);
  };

  /**
   * Reset progress
   */
  const resetProgress = () => {
    stopProgressSimulation();
    setShowProgress(false);
    setProgressState({
      stages: [],
      currentStage: "",
      overallPercentage: 0,
      currentMessage: "",
    });
  };

  return {
    progressState,
    showProgress,
    startProgress,
    updateProgress,
    completeProgress,
    resetProgress,
  };
}
