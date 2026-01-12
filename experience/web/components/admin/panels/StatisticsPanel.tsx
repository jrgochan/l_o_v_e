/**
 * Statistics Panel Component
 *
 * Displays aggregate analytics about computed paths and emotional transitions.
 * Refactored to use useStatistics hook for better testability and maintainability.
 */

"use client";

import { DIFFICULTY_COLORS } from "@/types/atlas-admin";
import { useLoadCachedPaths } from "@/hooks/useLoadCachedPaths";
import { useStatistics } from "@/hooks/admin/useStatistics";

export function StatisticsPanel() {
  const { stats, loading, error, isClearing, clearCache } = useStatistics();

  // Get performance metrics from cache loading
  const { loadTime, error: loadError } = useLoadCachedPaths();

  if (loading && !stats) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div className="text-gray-400">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-4">
          <p className="text-red-400">Error: {error}</p>
          <p className="text-gray-400 text-sm mt-2">
            Make sure Observer is running and paths have been computed.
          </p>
        </div>
      </div>
    );
  }

  if (!stats || stats.total_cached === 0) {
    return (
      <div className="p-4">
        <div className="bg-gray-800 rounded p-4">
          <p className="text-gray-400">
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
        <h2 className="text-lg font-bold text-white mb-1">Path Statistics</h2>
        <p className="text-sm text-gray-400">Real-time metrics from backend cache</p>
      </div>

      {/* Overall Progress */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Computation Progress</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Paths Computed:</span>
            <span className="text-white font-mono">
              {stats.total_cached} / {stats.total_possible}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Completion:</span>
            <span className="text-cyan-400 font-bold">{stats.completion_percentage}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div
              className="bg-cyan-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${stats.completion_percentage}%` }}
            />
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      {loadTime > 0 && (
        <section className="bg-gray-800 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">Cache Performance</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-300">Cache Load Time:</span>
              <span className="text-green-400 font-mono">{loadTime}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Status:</span>
              <span className="text-green-400">✓ Cached</span>
            </div>
          </div>
          {loadError && <div className="mt-2 text-xs text-red-400">Warning: {loadError}</div>}
        </section>
      )}

      {/* Difficulty Distribution */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Difficulty Distribution</h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: DIFFICULTY_COLORS.easy }}
              />
              <span className="text-sm text-gray-300">Easy</span>
            </div>
            <span className="text-white font-mono">{stats.difficulty_distribution?.easy || 0}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: DIFFICULTY_COLORS.moderate }}
              />
              <span className="text-sm text-gray-300">Moderate</span>
            </div>
            <span className="text-white font-mono">
              {stats.difficulty_distribution?.moderate || 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded"
                style={{ backgroundColor: DIFFICULTY_COLORS.difficult }}
              />
              <span className="text-sm text-gray-300">Difficult</span>
            </div>
            <span className="text-white font-mono">
              {stats.difficulty_distribution?.difficult || 0}
            </span>
          </div>
        </div>
      </section>

      {/* Distance Metrics */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Distance Metrics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Average:</span>
            <span className="text-white font-mono">{stats.distance_stats?.avg || "0"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Minimum:</span>
            <span className="text-green-400 font-mono">{stats.distance_stats?.min || "0"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-300">Maximum:</span>
            <span className="text-red-400 font-mono">{stats.distance_stats?.max || "0"}</span>
          </div>
        </div>
      </section>

      {/* Bridge Paths */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Bridge Requirements</h3>
        <div className="space-y-2 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Paths Requiring Bridges:</span>
            <span className="text-yellow-400 font-bold">{stats.bridge_paths || 0}</span>
          </div>
        </div>
      </section>

      {/* Waypoint Statistics */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Waypoint Statistics</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-300">Average Waypoints:</span>
            <span className="text-white font-mono">{stats.avg_waypoints || "0"}</span>
          </div>
        </div>
      </section>

      {/* Cache Management */}
      <section className="bg-gray-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Cache Management</h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-300">Cache Age:</span>
            <span className="text-white">
              {stats.last_computed ? new Date(stats.last_computed).toLocaleDateString() : "N/A"}
            </span>
          </div>
          <button
            onClick={clearCache}
            disabled={isClearing}
            className="w-full px-4 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition flex items-center justify-center gap-2"
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
          <p className="text-xs text-gray-400">
            Clears all cached paths. Use this if VAC coordinates have been updated.
          </p>
        </div>
      </section>

      {stats.last_computed && (
        <div className="text-xs text-gray-500 text-center">
          Last updated: {new Date(stats.last_computed).toLocaleString()}
        </div>
      )}
    </div>
  );
}
