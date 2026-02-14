/**
 * PathComparison Component
 *
 * Displays comparison metrics for multiple paths including:
 * - Shortest and longest distances
 * - Easiest path availability
 * - Paths without bridge requirements
 * - Trade-off explanations
 *
 * Mode-reactive via useAdminTheme.
 */

"use client";

import { usePathComparison } from "@/hooks/admin/usePathComparison";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import type { EmotionPath } from "@/types/visualization";

interface PathComparisonProps {
  paths: EmotionPath[];
}

export function PathComparison({ paths }: PathComparisonProps) {
  const { shortestDistance, longestDistance, hasEasyPath, noBridgePaths } =
    usePathComparison(paths);
  const theme = useAdminTheme();

  if (paths.length <= 1) return null;

  return (
    <section className={`${theme.effects.glass} ${theme.layout.borderRadius} p-4 mb-4 transition-colors duration-500`}>
      <h3 className={`text-sm font-bold mb-3 flex items-center gap-2 ${theme.colors.primary}`}>
        ⚖️ Path Comparison ({paths.length} paths)
      </h3>
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}>
            <div className={`mb-1 ${theme.colors.text.muted}`}>Shortest</div>
            <div className={`font-mono ${theme.colors.text.primary}`}>{shortestDistance.toFixed(2)}</div>
          </div>
          <div className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}>
            <div className={`mb-1 ${theme.colors.text.muted}`}>Longest</div>
            <div className={`font-mono ${theme.colors.text.primary}`}>{longestDistance.toFixed(2)}</div>
          </div>
          <div className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}>
            <div className={`mb-1 ${theme.colors.text.muted}`}>Easiest</div>
            <div className={theme.colors.text.primary}>{hasEasyPath ? "Available" : "None"}</div>
          </div>
          <div className={`bg-black/30 ${theme.layout.borderRadius} p-2 border ${theme.colors.border}`}>
            <div className={`mb-1 ${theme.colors.text.muted}`}>No Bridges</div>
            <div className={theme.colors.text.primary}>
              {noBridgePaths} {noBridgePaths === 1 ? "path" : "paths"}
            </div>
          </div>
        </div>
        <p className={`mt-3 ${theme.colors.text.secondary}`}>
          Each path offers different trade-offs. Shorter isn&apos;t always better—consider
          difficulty and bridge requirements.
        </p>
      </div>
    </section>
  );
}
