/**
 * usePathCalculator Hook
 *
 * Computes transition paths between selected emotions using Observer's path planning API.
 * Refactored to compose Single and Batch strategies.
 */

import { useEffect, useCallback } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useSinglePath } from "./pathfinding/useSinglePath";
import { useBatchPaths } from "./pathfinding/useBatchPaths";

export function usePathCalculator() {
  const {
    selectedEmotionIds,
    computedPaths,
    isComputingPaths,
    allEmotions,
    settings,
    clearComputedPaths,
  } = useAtlasAdminStore();

  // 1. Single Path Logic
  const { computePath } = useSinglePath();

  // 2. Batch Path Logic
  const { computeAllPaths } = useBatchPaths({ computePath });

  // 3. Effects & Triggers
  useEffect(() => {
    if (settings.computeMode !== "manual" && selectedEmotionIds.size >= 2) {
      computeAllPaths();
    } else if (selectedEmotionIds.size < 2) {
      if (computedPaths.size > 0) {
        clearComputedPaths();
      }
    }
  }, [
    selectedEmotionIds,
    settings.computeMode,
    computeAllPaths,
    clearComputedPaths,
    computedPaths.size,
  ]);

  const computeSpecificPath = useCallback(
    async (fromId: string, toId: string): Promise<void> => {
      const from = allEmotions.find((e) => e.id === fromId);
      const to = allEmotions.find((e) => e.id === toId);

      if (!from || !to) {
        throw new Error("Emotion not found");
      }

      return computePath(from, to);
    },
    [allEmotions, computePath]
  );

  const triggerComputation = useCallback(() => {
    computeAllPaths();
  }, [computeAllPaths]);

  return {
    computeAllPaths,
    computePath,
    computeSpecificPath,
    triggerComputation,
    paths: Array.from(computedPaths.values()),
    isComputing: isComputingPaths,
  };
}
