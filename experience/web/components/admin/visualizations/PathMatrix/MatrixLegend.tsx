/**
 * Matrix Legend Component
 *
 * Displays color-coded legend and statistics:
 * - Difficulty levels with colors and counts
 * - Not computed indicator
 * - Enhanced visual design
 */

"use client";

import { DIFFICULTY_COLORS } from "@/types/visualization";

interface MatrixLegendProps {
  stats: {
    byDifficulty: {
      easy: number;
      moderate: number;
      difficult: number;
    };
  };
}

/**
 * Renders enhanced legend with statistics
 */
export function MatrixLegend({ stats }: MatrixLegendProps) {
  const total =
    stats.byDifficulty.easy + stats.byDifficulty.moderate + stats.byDifficulty.difficult;

  return (
    <div className="p-4 border-b border-gray-700 bg-gray-900/30">
      <div className="flex items-center gap-8">
        {/* Legend Label */}
        <div className="text-sm font-semibold text-gray-300">
          <span className="text-cyan-400">Legend:</span>
        </div>

        {/* Easy Paths */}
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded shadow-md"
            style={{ backgroundColor: DIFFICULTY_COLORS.easy }}
          />
          <div>
            <div className="text-sm text-gray-300 font-medium">Easy</div>
            <div className="text-xs text-gray-500">
              {stats.byDifficulty.easy} paths
              {total > 0 && ` (${((stats.byDifficulty.easy / total) * 100).toFixed(1)}%)`}
            </div>
          </div>
        </div>

        {/* Moderate Paths */}
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded shadow-md"
            style={{ backgroundColor: DIFFICULTY_COLORS.moderate }}
          />
          <div>
            <div className="text-sm text-gray-300 font-medium">Moderate</div>
            <div className="text-xs text-gray-500">
              {stats.byDifficulty.moderate} paths
              {total > 0 && ` (${((stats.byDifficulty.moderate / total) * 100).toFixed(1)}%)`}
            </div>
          </div>
        </div>

        {/* Difficult Paths */}
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded shadow-md"
            style={{ backgroundColor: DIFFICULTY_COLORS.difficult }}
          />
          <div>
            <div className="text-sm text-gray-300 font-medium">Difficult</div>
            <div className="text-xs text-gray-500">
              {stats.byDifficulty.difficult} paths
              {total > 0 && ` (${((stats.byDifficulty.difficult / total) * 100).toFixed(1)}%)`}
            </div>
          </div>
        </div>

        {/* Not Computed */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-gray-700 border border-gray-600 shadow-md" />
          <div>
            <div className="text-sm text-gray-300 font-medium">Not Computed</div>
            <div className="text-xs text-gray-500">
              Click &quot;Load Cached&quot; or &quot;Compute All&quot;
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="mt-3 text-xs text-gray-500 bg-gray-800/50 px-3 py-2 rounded border border-gray-700/50">
        💡 <span className="font-medium">Tip:</span> Click any cell to select those two emotions and
        view the path in 3D. Hover for details.
      </div>
    </div>
  );
}
