import { useMemo, useCallback } from "react";
import type { AtlasEmotion, EmotionPath } from "@/types/atlas-admin";
import { DIFFICULTY_COLORS, type CategoryStats } from "@/types/atlas-admin";

interface UseMatrixProcessingOptions {
  allEmotions: AtlasEmotion[];
  computedPaths: Map<string, EmotionPath>;
}

export function useMatrixProcessing({ allEmotions, computedPaths }: UseMatrixProcessingOptions) {
  // Sort emotions alphabetically for consistent ordering
  const sortedEmotions = useMemo(() => {
    return [...allEmotions].sort((a, b) => a.name.localeCompare(b.name));
  }, [allEmotions]);

  // Get unique categories sorted alphabetically
  const categories = useMemo(() => {
    const cats = Array.from(new Set(allEmotions.map((e) => e.category))).sort((a, b) =>
      a.localeCompare(b)
    );

    return cats;
  }, [allEmotions]);

  // Get path for a specific pair (checks both directions)
  const getPathForPair = useCallback(
    (fromEmotion: AtlasEmotion, toEmotion: AtlasEmotion) => {
      const key1 = `${fromEmotion.id}-${toEmotion.id}`;
      const key2 = `${toEmotion.id}-${fromEmotion.id}`;
      return computedPaths.get(key1) || computedPaths.get(key2);
    },
    [computedPaths]
  );

  // Get cell color based on path difficulty
  const getCellColor = useCallback(
    (fromEmotion: AtlasEmotion, toEmotion: AtlasEmotion): string => {
      // Same emotion = no transition needed
      if (fromEmotion.id === toEmotion.id) {
        return "#1a1a1a"; // Dark gray
      }

      const path = getPathForPair(fromEmotion, toEmotion);
      if (!path) {
        return "#2a2a2a"; // Slightly lighter gray (not computed)
      }

      return DIFFICULTY_COLORS[path.difficulty];
    },
    [getPathForPair]
  );

  // Calculate average difficulty for category pairs
  const getCategoryAverageDifficulty = useCallback(
    (fromCategory: string, toCategory: string): CategoryStats | null => {
      if (fromCategory === toCategory) return null;

      const fromEmotions = allEmotions.filter((e) => e.category === fromCategory);
      const toEmotions = allEmotions.filter((e) => e.category === toCategory);

      let totalDistance = 0;
      let count = 0;

      fromEmotions.forEach((fromEmo) => {
        toEmotions.forEach((toEmo) => {
          const path = getPathForPair(fromEmo, toEmo);
          if (path) {
            totalDistance += path.total_distance;
            count++;
          }
        });
      });

      if (count === 0) return null;

      const avgDistance = totalDistance / count;
      const difficulty: "easy" | "moderate" | "difficult" =
        avgDistance < 1.0 ? "easy" : avgDistance < 2.0 ? "moderate" : "difficult";

      return { avgDistance, difficulty, pathCount: count };
    },
    [allEmotions, getPathForPair]
  );

  // Get color for category cell
  const getCategoryCellColor = useCallback(
    (fromCategory: string, toCategory: string): string => {
      if (fromCategory === toCategory) return "#1a1a1a";

      const stats = getCategoryAverageDifficulty(fromCategory, toCategory);
      if (!stats) return "#2a2a2a";

      return DIFFICULTY_COLORS[stats.difficulty];
    },
    [getCategoryAverageDifficulty]
  );

  return {
    sortedEmotions,
    categories,
    getPathForPair,
    getCellColor,
    getCategoryAverageDifficulty,
    getCategoryCellColor,
  };
}
