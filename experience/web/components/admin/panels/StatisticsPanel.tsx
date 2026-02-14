/**
 * Statistics Panel Component
 *
 * Displays aggregate analytics about computed paths and emotional transitions.
 * Refactored to use useStatistics hook for better testability and maintainability.
 * Mode-reactive via useAdminTheme.
 */

"use client";

import { DIFFICULTY_COLORS } from "@/types/visualization";
import { useLoadCachedPaths } from "@/hooks/useLoadCachedPaths";
import { useStatistics } from "@/hooks/admin/useStatistics";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function StatisticsPanel() {
  const { stats, loading, error, isClearing, clearCache } = useStatistics();
  const theme = useAdminTheme();

  // Get performance metrics from cache loading
  const { loadTime, error: loadError } = useLoadCachedPaths();

  if (loading && !stats) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className={theme.colors.text.secondary}>Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className={`bg-red-900/20 border border-red-500/30 ${theme.layout.borderRadius} p-4`}>
          <p className="text-red-400">Error: {error}</p>
          <p className={`text-sm mt-2 ${theme.colors.text.secondary}`}>
            Make sure Observer is running and paths have been computed.
          </p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_cached === 0) {
    return (
      <div className="p-4">
        <div className={`${theme.layout.borderRadius} p-4 bg-black/20 border ${theme.colors.border}`}>
          <p className={theme.colors.text.secondary}>
            No paths computed yet. Use &quot;Compute All Paths&quot; in the Path Matrix or select
            emotions to begin.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div>
        <h2 className={`text-lg font-bold mb-1 ${theme.colors.text.primary}`}>Path Statistics</h2>
        <p className={`text-sm ${theme.colors.text.secondary}`}>Real-time metrics from backend cache</p>
      </div>

      {/* Overall Progress */}
      <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Computation Progress</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className={theme.colors.text.secondary}>Paths Computed:</span>
            <span className={`font-mono ${theme.colors.text.primary}`}>
              {stats.total_cached} / {stats.total_possible}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className={theme.colors.text.secondary}>Completion:</span>
            <span className={`font-bold ${theme.colors.primary}`}>{stats.completion_percentage}%</span>
          </div>
          <div className={`w-full bg-black/30 rounded-full h-2 mt-2 border ${theme.colors.border}`}>
            <div
              className={`h-2 rounded-full transition-all duration-500 ${theme.colors.primary.replace("text-", "bg-")}`}
              style={{ width: `${stats.completion_percentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      {loadTime > 0 && (
        <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
          <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Cache Performance</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className={theme.colors.text.secondary}>Cache Load Time:</span>
              <span className="text-green-400 font-mono">{loadTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span className={theme.colors.text.secondary}>Status:</span>
              <span className="text-green-400">✓ Cached</span>
            </div>
          </div>
          {loadError && <div className="mt-2 text-xs text-red-400">Warning: {loadError}</div>}
        </section>
      )}

      {/* Difficulty Distribution */}
      <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Difficulty Distribution</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: DIFFICULTY_COLORS.easy }}
              />
              <span className={`text-sm ${theme.colors.text.secondary}`}>Easy</span>
            </div>
            <span className={`font-mono ${theme.colors.text.primary}`}>{stats.difficulty_distribution?.easy || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: DIFFICULTY_COLORS.moderate }}
              />
              <span className={`text-sm ${theme.colors.text.secondary}`}>Moderate</span>
            </div>
            <span className={`font-mono ${theme.colors.text.primary}`}>
              {stats.difficulty_distribution?.moderate || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: DIFFICULTY_COLORS.difficult }}
              />
              <span className={`text-sm ${theme.colors.text.secondary}`}>Difficult</span>
            </div>
            <span className={`font-mono ${theme.colors.text.primary}`}>
              {stats.difficulty_distribution?.difficult || 0}
            </span>
          </div>
        </div>
      </section>

      {/* Distance Metrics */}
      <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Distance Metrics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={theme.colors.text.secondary}>Average:</span>
            <span className={`font-mono ${theme.colors.text.primary}`}>{stats.distance_stats?.avg || "0"}</span>
          </div>
          <div className="flex justify-between">
            <span className={theme.colors.text.secondary}>Minimum:</span>
            <span className="text-green-400 font-mono">{stats.distance_stats?.min || "0"}</span>
          </div>
          <div className="flex justify-between">
            <span className={theme.colors.text.secondary}>Maximum:</span>
            <span className="text-red-400 font-mono">{stats.distance_stats?.max || "0"}</span>
          </div>
        </div>
      </section>

      {/* Bridge Paths */}
      <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Bridge Requirements</h3>
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className={theme.colors.text.secondary}>Paths Requiring Bridges:</span>
            <span className="text-yellow-400 font-bold">{stats.bridge_paths || 0}</span>
          </div>
        </div>
      </section>

      {/* Waypoint Statistics */}
      <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Waypoint Statistics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className={theme.colors.text.secondary}>Average Waypoints:</span>
            <span className={`font-mono ${theme.colors.text.primary}`}>{stats.avg_waypoints || "0"}</span>
          </div>
        </div>
      </section>

      {/* Cache Management */}
      <section className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-4 transition-colors duration-500`}>
        <h3 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Cache Management</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className={theme.colors.text.secondary}>Cache Age:</span>
            <span className={theme.colors.text.primary}>
              {stats.last_computed ? new Date(stats.last_computed).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <button
            onClick={clearCache}
            disabled={isClearing}
            className={`w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-black/30 disabled:${theme.colors.text.muted} text-white text-sm ${theme.layout.borderRadius} transition flex items-center justify-center gap-2`}
          >
            {isClearing ? (
              <>
                <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                Clearing...
              </>
            ) : (
              <>🗑️ Clear Cache</>
            )}
          </button>
          <p className={`text-xs ${theme.colors.text.muted}`}>
            Clears all cached paths. Use this if VAC coordinates have been updated.
          </p>
        </div>
      </section>

      {stats.last_computed && (
        <div className={`text-xs text-center ${theme.colors.text.muted}`}>
          Last updated: {new Date(stats.last_computed).toLocaleString()}
        </div>
      )}
    </div>
  );
}
