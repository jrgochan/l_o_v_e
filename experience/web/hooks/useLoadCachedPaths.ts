/**
 * useLoadCachedPaths Hook
 *
 * Automatically loads previously computed paths from backend cache on page mount.
 * Provides instant Path Matrix on repeat visits.
 */

import { useEffect, useState } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import type { EmotionPath } from "@/types/visualization";
import type { CachedPathData } from "@/types/api-responses";
import { logger } from "@/utils/logger";
import { OBSERVER_URL } from "@/config/environment";

export function useLoadCachedPaths() {
  const [isLoading, setIsLoading] = useState(false);
  const [loadedCount, setLoadedCount] = useState(0);
  const [loadTime, setLoadTime] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const addComputedPath = useVisualizationStore((state) => state.addComputedPath);

  useEffect(() => {
    // Only load once emotions are available
    if (allEmotions.length === 0) return;

    const loadCachedPaths = async () => {
      const startTime = performance.now();
      setIsLoading(true);
      setError(null);

      try {
        logger.info("api", "Loading cached paths from backend...");

        const response = await fetch(`${OBSERVER_URL}/observer/atlas/paths/all?limit=10000`);

        if (!response.ok) {
          logger.warn("api", "No cached paths available yet");
          return;
        }

        const data = await response.json();

        if (!data.paths || data.paths.length === 0) {
          logger.debug("api", "No cached paths found");
          return;
        }

        // Transform and load paths into store
        let loaded = 0;
        data.paths.forEach((pathData: CachedPathData) => {
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
              bridge_emotions: [],
            };

            addComputedPath(path);
            loaded++;
          }
        });

        setLoadedCount(loaded);

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        setLoadTime(duration);

        // Update cache status in store
        useVisualizationStore.getState().updateCacheStatus({
          loaded: true,
          count: loaded,
          lastLoadTime: Date.now(),
        });

        logger.info("api", `✅ Loaded ${loaded} cached paths from backend in ${duration}ms`);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        setError(errorMsg);
        logger.error("api", "Error loading cached paths", err);
      } finally {
        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);
        setLoadTime(duration);
        setIsLoading(false);
      }
    };

    loadCachedPaths();
  }, [allEmotions, addComputedPath]);

  return {
    isLoading,
    loadedCount,
    loadTime,
    error,
  };
}
