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
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

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
  const theme = useAdminTheme();
  const total =
    stats.byDifficulty.easy + stats.byDifficulty.moderate + stats.byDifficulty.difficult;

  return (
    <div className={`p-4 border-b ${theme.colors.border} bg-black/20`}>
      <div className="flex items-center gap-8">
        {/* Legend Label */}
        <div className={`text-sm font-semibold ${theme.colors.text.secondary}`}>
          <span className={theme.colors.primary}>Legend:</span>
        </div>

        {/* Easy Paths */}
        <div className="flex items-center gap-3">
          <div
            className="w-5 h-5 rounded shadow-md"
            style={{ backgroundColor: DIFFICULTY_COLORS.easy }}
          />
          <div>
            <div className={`text-sm ${theme.colors.text.primary} font-medium`}>Easy</div>
            <div className={`text-xs ${theme.colors.text.muted}`}>
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
            <div className={`text-sm ${theme.colors.text.primary} font-medium`}>Moderate</div>
            <div className={`text-xs ${theme.colors.text.muted}`}>
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
            <div className={`text-sm ${theme.colors.text.primary} font-medium`}>Difficult</div>
            <div className={`text-xs ${theme.colors.text.muted}`}>
              {stats.byDifficulty.difficult} paths
              {total > 0 && ` (${((stats.byDifficulty.difficult / total) * 100).toFixed(1)}%)`}
            </div>
          </div>
        </div>

        {/* Not Computed */}
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 rounded bg-black/40 border border-black/50 shadow-md" />
          <div>
            <div className={`text-sm ${theme.colors.text.primary} font-medium`}>Not Computed</div>
            <div className={`text-xs ${theme.colors.text.muted}`}>
              Click &quot;Load Cached&quot; or &quot;Compute All&quot;
            </div>
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div
        className={`mt-3 text-xs ${theme.colors.text.muted} bg-black/20 px-3 py-2 rounded border ${theme.colors.border}`}
      >
        💡 <span className="font-medium">Tip:</span> Click any cell to select those two emotions and
        view the path in 3D. Hover for details.
      </div>
    </div>
  );
}
