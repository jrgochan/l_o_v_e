import { useRef, useCallback, useEffect } from "react";
import type { ProgressState } from "@/types/chat"; // Adjust import if needed or define locally if shared types are missing

/**
 * Hook for managing the simulation interval
 */
export function useProgressSimulation(
  setProgressState: React.Dispatch<React.SetStateAction<ProgressState>>
) {
  const progressSimulationRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Start simulated incremental progress (fills gaps between backend updates)
   */
  const startProgressSimulation = useCallback(() => {
    if (progressSimulationRef.current) {
      clearInterval(progressSimulationRef.current);
    }

    progressSimulationRef.current = setInterval(() => {
      setProgressState((prev) => {
        // Don't simulate past 90% - wait for real completion
        if (prev.overallPercentage >= 90) {
          if (progressSimulationRef.current) {
            clearInterval(progressSimulationRef.current);
            progressSimulationRef.current = null;
          }
          return prev;
        }

        // Slowly increment percentage (0.5% per 500ms = 1% per second)
        const newPercentage = Math.min(90, prev.overallPercentage + 0.5);

        return {
          ...prev,
          overallPercentage: newPercentage,
        };
      });
    }, 500); // Update every 500ms
  }, [setProgressState]);

  const stopProgressSimulation = useCallback(() => {
    if (progressSimulationRef.current) {
      clearInterval(progressSimulationRef.current);
      progressSimulationRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressSimulationRef.current) {
        clearInterval(progressSimulationRef.current);
      }
    };
  }, []);

  return { startProgressSimulation, stopProgressSimulation };
}
