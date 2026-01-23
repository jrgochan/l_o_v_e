/**
 * usePathComparison Hook
 *
 * Calculates path comparison metrics for analyzing multiple paths between emotions:
 * - Shortest distance
 * - Longest distance
 * - Easiest difficulty availability
 * - Paths without bridge requirements
 *
 * @example
 * ```tsx
 * const {
 *   shortestDistance,
 *   longestDistance,
 *   hasEasyPath,
 *   noBridgePaths
 * } = usePathComparison(selectedPaths);
 * ```
 */

import { useMemo } from "react";
import type { EmotionPath } from "@/types/visualization";

export interface PathComparisonMetrics {
  shortestDistance: number;
  longestDistance: number;
  hasEasyPath: boolean;
  noBridgePaths: number;
}

/**
 * Calculates comparison metrics for multiple paths
 */
export function usePathComparison(paths: EmotionPath[]): PathComparisonMetrics {
  return useMemo(() => {
    if (paths.length === 0) {
      return {
        shortestDistance: 0,
        longestDistance: 0,
        hasEasyPath: false,
        noBridgePaths: 0,
      };
    }

    const distances = paths.map((p) => p.total_distance);
    const shortestDistance = Math.min(...distances);
    const longestDistance = Math.max(...distances);

    const hasEasyPath = paths.some((p) => p.difficulty === "easy");
    const noBridgePaths = paths.filter((p) => !p.requires_bridge).length;

    return {
      shortestDistance,
      longestDistance,
      hasEasyPath,
      noBridgePaths,
    };
  }, [paths]);
}
