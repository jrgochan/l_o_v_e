/**
 * useComputeAllPaths Hook
 *
 * Computes paths for all emotion pairs.
 * Uses new backend batch API for massive performance improvement.
 * Refactored to compose useBatchJob logic and visualizationService.
 */

import { useCallback } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import type { EmotionPath } from "@/types/visualization";
import { logger } from "@/utils/logger";
import { useBatchJob } from "./pathfinding/useBatchJob";
import { visualizationService } from "@/services/visualizationService";

export function useComputeAllPaths() {
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const addComputedPath = useVisualizationStore((state) => state.addComputedPath);

  const loadCachedPaths = useCallback(async () => {
    try {
      const data = await visualizationService.getCachedPaths();

      data.paths.forEach((pathData) => {
        const fromEmotion = allEmotions.find((e) => e.id === pathData.from_emotion.id);
        const toEmotion = allEmotions.find((e) => e.id === pathData.to_emotion.id);

        if (fromEmotion && toEmotion) {
          const path: EmotionPath = {
            id: `${fromEmotion.id}-${toEmotion.id}`,
            from: fromEmotion,
            to: toEmotion,
            waypoints: pathData.waypoints.map((wp) => ({
              emotion: wp.emotion,
              vac: wp.vac,
              reasoning: "",
              strategies: [],
            })),
            total_distance: pathData.distance,
            estimated_time: pathData.estimated_time,
            difficulty: pathData.difficulty as "easy" | "moderate" | "difficult",
            requires_bridge: pathData.requires_bridge,
          };
          addComputedPath(path);
        }
      });
      logger.info("api", `Loaded ${data.paths.length} cached paths`);
    } catch {
      // Error logged in service
    }
  }, [allEmotions, addComputedPath]);

  const onJobComplete = useCallback(async () => {
    await loadCachedPaths();
    alert(`Path computation complete!`);
  }, [loadCachedPaths]);

  const onJobFail = useCallback((msg: string) => {
    alert(`Computation failed: ${msg}`);
  }, []);

  const { startJob, isComputing, progress, estimatedTimeRemaining, setProgress } = useBatchJob(
    onJobComplete,
    onJobFail
  );

  const computeAllPaths = useCallback(async () => {
    if (allEmotions.length === 0) {
      alert("No emotions loaded yet");
      return;
    }

    // Use allEmotions from hook scope
    const totalCount = allEmotions.length;
    const totalPaths = totalCount * (totalCount - 1);
    const confirmed = confirm(
      `This will compute all ${totalPaths} paths using the backend batch API.\n\n` +
        `This will take ~8-10 minutes running in the background.\n\n` +
        `Continue?`
    );

    if (!confirmed) return;

    setProgress({ current: 0, total: totalPaths, percentage: 0 });

    try {
      logger.info("hooks", "Starting batch computation via backend API");
      const result = await visualizationService.computeAllPaths();
      logger.info("api", `Batch job started: ${result.job_id}`);
      startJob(result.job_id, totalPaths);
    } catch {
      alert("Error starting batch computation. Check console for details.");
      setProgress({ current: 0, total: 0, percentage: 0 });
    }
  }, [allEmotions, setProgress, startJob]);

  return {
    computeAllPaths,
    isComputing,
    progress,
    estimatedTimeRemaining,
  };
}
