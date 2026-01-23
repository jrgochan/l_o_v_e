/**
 * PathComparison Component
 *
 * Displays comparison metrics for multiple paths including:
 * - Shortest and longest distances
 * - Easiest path availability
 * - Paths without bridge requirements
 * - Trade-off explanations
 *
 * Uses usePathComparison hook for metrics calculation.
 */

"use client";

import { usePathComparison } from "@/hooks/admin/usePathComparison";
import type { EmotionPath } from "@/types/visualization";

interface PathComparisonProps {
  paths: EmotionPath[];
}

export function PathComparison({ paths }: PathComparisonProps) {
  const { shortestDistance, longestDistance, hasEasyPath, noBridgePaths } =
    usePathComparison(paths);

  if (paths.length <= 1) return null;

  return (
    <section className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4 mb-4">
      <h3 className="text-sm font-bold text-purple-300 mb-3 flex items-center gap-2">
        ⚖️ Path Comparison ({paths.length} paths)
      </h3>
      <div className="space-y-2 text-xs">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-400 mb-1">Shortest</div>
            <div className="text-white font-mono">{shortestDistance.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-400 mb-1">Longest</div>
            <div className="text-white font-mono">{longestDistance.toFixed(2)}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-400 mb-1">Easiest</div>
            <div className="text-white">{hasEasyPath ? "Available" : "None"}</div>
          </div>
          <div className="bg-gray-800/50 rounded p-2">
            <div className="text-gray-400 mb-1">No Bridges</div>
            <div className="text-white">
              {noBridgePaths} {noBridgePaths === 1 ? "path" : "paths"}
            </div>
          </div>
        </div>
        <p className="text-gray-300 mt-3">
          Each path offers different trade-offs. Shorter isn&apos;t always better—consider
          difficulty and bridge requirements.
        </p>
      </div>
    </section>
  );
}
