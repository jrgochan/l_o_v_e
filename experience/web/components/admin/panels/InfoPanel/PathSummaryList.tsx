/**
 * PathSummaryList Component
 *
 * Displays a sorted list of paths with:
 * - Badge indicators (shortest, easiest, no bridge, fewest steps)
 * - Path metrics (distance, difficulty, time)
 * - Full journey display for each path
 * - Clickable waypoints
 *
 * Uses usePathSorting hook for sorting and badge calculation.
 */

"use client";

import { usePathSorting } from "@/hooks/admin/usePathSorting";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { DIFFICULTY_COLORS } from "@/types/atlas-admin";
import type { EmotionPath, PathWaypoint } from "@/types/atlas-admin";

interface PathSummaryListProps {
  paths: EmotionPath[];
  selectedPathId: string | null;
  isComputingPaths: boolean;
  onWaypointClick: (path: EmotionPath, waypoint: PathWaypoint, index: number) => void;
}

export function PathSummaryList({
  paths,
  selectedPathId,
  isComputingPaths,
  onWaypointClick,
}: PathSummaryListProps) {
  const sortedPaths = usePathSorting(paths);
  const setSelectedPath = useAtlasAdminStore((state) => state.setSelectedPath);

  if (paths.length === 0) return null;

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Selected Paths ({paths.length})</h2>
      {isComputingPaths && (
        <div className="flex items-center gap-2 text-cyan-400 text-sm mb-3">
          <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
          <span>Computing paths...</span>
        </div>
      )}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sortedPaths.map(({ path, badges }) => {
          // Generate a stable ID for the path
          const pathId = path.id;
          const isSelected = selectedPathId === pathId;

          return (
            <div
              key={pathId}
              className={`rounded-lg p-3 text-sm border ${
                isSelected ? "bg-cyan-900/40 border-cyan-500" : "bg-gray-800 border-gray-700"
              }`}
            >
              {/* Path Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="font-medium text-white">
                  {badges.isShort && <span className="text-green-400 mr-1">⭐</span>}
                  {path.from.name} → {path.to.name}
                </div>
                <div className="flex items-center gap-1">
                  {badges.isShort && (
                    <span className="text-[10px] px-2 py-0.5 bg-green-600 text-white rounded">
                      Shortest
                    </span>
                  )}
                  {badges.isEasy && (
                    <span className="text-[10px] px-2 py-0.5 bg-cyan-600 text-white rounded">
                      Easiest
                    </span>
                  )}
                  {badges.noBridge && (
                    <span className="text-[10px] px-2 py-0.5 bg-blue-600 text-white rounded">
                      No Bridge
                    </span>
                  )}
                  {badges.fewestSteps && (
                    <span className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded">
                      Fewest Steps
                    </span>
                  )}
                </div>
              </div>

              {/* Path Metrics */}
              <div className="flex items-center gap-3 mb-2 text-xs text-gray-400">
                <span className="font-mono">Dist: {path.total_distance.toFixed(3)}</span>
                <span className="flex items-center gap-1">
                  <div
                    className="w-2 h-2 rounded"
                    style={{
                      backgroundColor:
                        DIFFICULTY_COLORS[path.difficulty as keyof typeof DIFFICULTY_COLORS] ||
                        "#888888",
                    }}
                  />
                  {path.difficulty}
                </span>
                <span>{path.estimated_time}</span>
              </div>

              {/* Full Journey Display */}
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="text-xs font-semibold text-gray-400 mb-2">
                  Journey ({path.waypoints.length + 2} steps):
                </div>
                <div className="space-y-1.5">
                  {/* Start */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-blue-400">1.</span>
                    <span className="text-gray-300">{path.from.name}</span>
                    <span className="text-blue-400 text-[10px]">(start)</span>
                  </div>

                  {/* Waypoints - Clickable */}
                  {path.waypoints.map((wp, wpIdx) => (
                    <button
                      key={wpIdx}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedPath(pathId);
                        onWaypointClick(path, wp, wpIdx);
                      }}
                      className="w-full flex items-center gap-2 text-xs hover:bg-gray-700 rounded px-1 py-0.5 transition cursor-pointer text-left"
                    >
                      <span className="text-cyan-400">{wpIdx + 2}.</span>
                      <span className="text-white">{wp.emotion}</span>
                      <span className="text-cyan-400 text-[10px] ml-auto">→ details</span>
                    </button>
                  ))}

                  {/* Goal */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">{path.waypoints.length + 2}.</span>
                    <span className="text-gray-300">{path.to.name}</span>
                    <span className="text-green-400 text-[10px]">(goal)</span>
                  </div>
                </div>
              </div>

              {/* Bridge Requirement */}
              {path.requires_bridge && path.bridge_emotions && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-xs text-yellow-400">
                    ★ Requires: {path.bridge_emotions.join(", ")}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
