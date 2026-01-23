"use client";

import { useEffect } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { type TransitionPathResponse } from "@love/experience-shared";

export function usePathSync() {
  const selectedPathId = useVisualizationStore((state) => state.selectedPathId);
  const computedPaths = useVisualizationStore((state) => state.computedPaths);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);

  const setTransitionPath = useExperienceStore((state) => state.setTransitionPath);
  const setShowPath = useExperienceStore((state) => state.setShowPath);

  useEffect(() => {
    if (!selectedPathId) {
      setTransitionPath(null);
      setShowPath(false);
      return;
    }

    const path = computedPaths.get(selectedPathId);
    if (path) {
      // Helper to enrich state
      const enrichState = (e: typeof path.from) => ({
        emotion: e.name,
        category: e.category,
        vac: e.vac,
        quaternion: e.quaternion,
      });

      // Enrich waypoints by looking up emotion data
      const enrichedWaypoints = path.waypoints.map((wp, i) => {
        const emotionData = allEmotions.find((e) => e.name === wp.emotion);
        const prevWp = i > 0 ? path.waypoints[i - 1] : null;
        const prevVac = prevWp ? prevWp.vac : path.from.vac;
        // Simple distance calc
        const dist = Math.sqrt(
          Math.pow(wp.vac[0] - prevVac[0], 2) +
            Math.pow(wp.vac[1] - prevVac[1], 2) +
            Math.pow(wp.vac[2] - prevVac[2], 2)
        );

        return {
          order: i + 1,
          emotion: wp.emotion,
          category: emotionData?.category || "Unknown",
          vac: wp.vac,
          quaternion: emotionData?.quaternion || ([0, 0, 0, 1] as [number, number, number, number]),
          reasoning: wp.reasoning,
          distance_from_previous: dist,
          transition_metrics: {
            valence_shift: wp.vac[0] - prevVac[0],
            arousal_shift: wp.vac[1] - prevVac[1],
            connection_shift: wp.vac[2] - prevVac[2],
          },
          estimated_time: "5m", // Placeholder
          difficulty: "moderate", // Placeholder
          strategies: [],
        };
      });

      // Map EmotionPath (frontend) to TransitionPathResponse (backend/shared)
      const mappedPath: TransitionPathResponse = {
        path_id: path.id,
        created_at: new Date().toISOString(),
        current_state: enrichState(path.from),
        goal_state: enrichState(path.to),
        waypoints: enrichedWaypoints,
        path_metrics: {
          total_distance: path.total_distance,
          total_estimated_time: path.estimated_time,
          overall_difficulty: path.difficulty,
          success_probability: 0.9,
          requires_external_support: false,
        },
        visualization_data: {},
        alternatives: [],
        personalization_notes: [],
      };

      setTransitionPath(mappedPath);
      setShowPath(true);
    } else {
      // Fallback: If selectedPathId exists but path is missing
      setTransitionPath(null);
      setShowPath(false);
    }
  }, [selectedPathId, computedPaths, setTransitionPath, setShowPath, allEmotions]);
}
