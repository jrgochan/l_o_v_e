import { useMemo } from "react";
import type { Emotion, EmotionPath, MatrixStats } from "@/types/visualization";

interface UseMatrixStatsOptions {
  allEmotions: Emotion[];
  computedPaths: Map<string, EmotionPath>;
}

export function useMatrixStats({ allEmotions, computedPaths }: UseMatrixStatsOptions): MatrixStats {
  const stats = useMemo(() => {
    const totalPossible = allEmotions.length * (allEmotions.length - 1);
    const computed = computedPaths.size;
    const percentage = totalPossible > 0 ? ((computed / totalPossible) * 100).toFixed(1) : "0.0";

    const byDifficulty = {
      easy: 0,
      moderate: 0,
      difficult: 0,
    };

    Array.from(computedPaths.values()).forEach((path) => {
      byDifficulty[path.difficulty]++;
    });

    return {
      totalPossible,
      computed,
      percentage,
      byDifficulty,
    };
  }, [allEmotions, computedPaths]);

  return stats;
}
