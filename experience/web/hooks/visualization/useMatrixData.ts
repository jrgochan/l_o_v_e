/**
 * Matrix Data Hook
 *
 * Processes and manages data for the path matrix visualization:
 * - Emotion/category sorting and grouping
 * - Path retrieval and caching
 * - Statistics calculation
 * - Category-level aggregations
 */

import type { Emotion, EmotionPath, MatrixStats, CategoryStats } from "@/types/visualization";
import { useMatrixProcessing } from "./matrix/useMatrixProcessing";
import { useMatrixStats } from "./matrix/useMatrixStats";

interface UseMatrixDataOptions {
  allEmotions: Emotion[];
  computedPaths: Map<string, EmotionPath>;
}

interface UseMatrixDataReturn {
  sortedEmotions: Emotion[];
  categories: string[];
  getPathForPair: (from: Emotion, to: Emotion) => EmotionPath | undefined;
  getCellColor: (from: Emotion, to: Emotion) => string;
  getCategoryAverageDifficulty: (fromCat: string, toCat: string) => CategoryStats | null;
  getCategoryCellColor: (fromCat: string, toCat: string) => string;
  stats: MatrixStats;
}

/**
 * Custom hook for matrix data processing
 */
export function useMatrixData({
  allEmotions,
  computedPaths,
}: UseMatrixDataOptions): UseMatrixDataReturn {
  const {
    sortedEmotions,
    categories,
    getPathForPair,
    getCellColor,
    getCategoryAverageDifficulty,
    getCategoryCellColor,
  } = useMatrixProcessing({ allEmotions, computedPaths });

  const stats = useMatrixStats({ allEmotions, computedPaths });

  return {
    sortedEmotions,
    categories,
    getPathForPair,
    getCellColor,
    getCategoryAverageDifficulty,
    getCategoryCellColor,
    stats,
  };
}
