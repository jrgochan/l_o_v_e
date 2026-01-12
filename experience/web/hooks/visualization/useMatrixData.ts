/**
 * Matrix Data Hook
 *
 * Processes and manages data for the path matrix visualization:
 * - Emotion/category sorting and grouping
 * - Path retrieval and caching
 * - Statistics calculation
 * - Category-level aggregations
 */

import type { AtlasEmotion, EmotionPath, MatrixStats, CategoryStats } from "@/types/atlas-admin";
import { useMatrixProcessing } from "./matrix/useMatrixProcessing";
import { useMatrixStats } from "./matrix/useMatrixStats";

interface UseMatrixDataOptions {
  allEmotions: AtlasEmotion[];
  computedPaths: Map<string, EmotionPath>;
}

interface UseMatrixDataReturn {
  sortedEmotions: AtlasEmotion[];
  categories: string[];
  getPathForPair: (from: AtlasEmotion, to: AtlasEmotion) => EmotionPath | undefined;
  getCellColor: (from: AtlasEmotion, to: AtlasEmotion) => string;
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
