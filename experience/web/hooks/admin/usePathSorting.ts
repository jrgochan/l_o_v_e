/**
 * usePathSorting Hook
 *
 * Sorts paths by distance and calculates special badges for each path:
 * - Shortest path
 * - Easiest difficulty
 * - No bridge required
 * - Fewest steps (waypoints)
 *
 * @example
 * ```tsx
 * const sortedPaths = usePathSorting(paths);
 *
 * sortedPaths.forEach(({ path, badges }) => {
 *   console.log(path.id, badges);
 * });
 * ```
 */

import { useMemo } from "react";
import type { EmotionPath } from "@/types/atlas-admin";

export interface PathBadges {
  isShort: boolean;
  isEasy: boolean;
  noBridge: boolean;
  fewestSteps: boolean;
}

export interface SortedPath {
  path: EmotionPath;
  badges: PathBadges;
}

/**
 * Sorts paths by distance and calculates special badges
 */
export function usePathSorting(paths: EmotionPath[]): SortedPath[] {
  return useMemo(() => {
    if (paths.length === 0) return [];

    // Sort by distance (ascending)
    const sorted = [...paths].sort((a, b) => a.total_distance - b.total_distance);

    // Calculate min waypoint count
    const minWaypoints = Math.min(...paths.map((p) => p.waypoints.length));

    // Check if any path requires bridge
    const anyBridge = paths.some((p) => p.requires_bridge);

    // Calculate badges for each path
    return sorted.map((path, index) => ({
      path,
      badges: {
        isShort: index === 0, // First in sorted list = shortest
        isEasy: path.difficulty === "easy",
        noBridge: !path.requires_bridge && anyBridge, // Only badge if others need bridge
        fewestSteps: path.waypoints.length === minWaypoints && path.waypoints.length > 0,
      },
    }));
  }, [paths]);
}
