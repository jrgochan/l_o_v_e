import { useCallback, useRef } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import type { EmotionPath, PathComputationResult, Emotion } from "@/types/visualization";
import { logger } from "@/utils/logger";

const OBSERVER_API_URL = process.env.NEXT_PUBLIC_OBSERVER_URL || "http://localhost:8000";

export function useSinglePath() {
  const { addComputedPath } = useVisualizationStore();
  const abortControllerRef = useRef<AbortController | null>(null);

  const computePath = useCallback(
    async (from: Emotion, to: Emotion): Promise<void> => {
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        logger.debug("hooks", `Computing path: ${from.name} → ${to.name}`);

        const response = await fetch(`${OBSERVER_API_URL}/observer/transition-path`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            user_id: "00000000-0000-0000-0000-000000000000",
            current_vac: from.vac,
            goal_vac: to.vac,
            max_waypoints: 3,
          }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to compute path: ${response.statusText}`);
        }

        const data: PathComputationResult = await response.json();

        const path: EmotionPath = {
          id: `${from.id}-${to.id}`,
          from,
          to,
          waypoints: data.waypoints || [],
          total_distance: data.path_metrics.total_distance,
          estimated_time: data.path_metrics.total_estimated_time,
          difficulty: data.path_metrics.overall_difficulty as "easy" | "moderate" | "difficult",
          requires_bridge: data.path_metrics.requires_bridge,
          bridge_emotions: data.path_metrics.bridge_emotions,
        };

        addComputedPath(path);
      } catch (err: any) {
        if (err.name === "AbortError") {
          logger.info("hooks", `Path computation aborted: ${from.name} → ${to.name}`);
          return;
        }
        logger.error("hooks", `Error computing path ${from.name} → ${to.name}`, err);
        throw err;
      }
    },
    [addComputedPath]
  );

  return { computePath };
}
