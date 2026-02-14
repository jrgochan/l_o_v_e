/**
 * PathSummaryList Component
 *
 * Displays a sorted list of paths with:
 * - Badge indicators (shortest, easiest, no bridge, fewest steps)
 * - Path metrics (distance, difficulty, time)
 * - Full journey display for each path
 * - Clickable waypoints
 *
 * Mode-reactive via useAdminTheme.
 */

"use client";

import { usePathSorting } from "@/hooks/admin/usePathSorting";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { DIFFICULTY_COLORS } from "@/types/visualization";
import type { EmotionPath, PathWaypoint } from "@/types/visualization";

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
  const setSelectedPath = useVisualizationStore((state) => state.setSelectedPath);
  const theme = useAdminTheme();

  if (paths.length === 0) return null;

  return (
    <section>
      <h2 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Selected Paths ({paths.length})</h2>
      {isComputingPaths && (
        <div className={`flex items-center gap-2 text-sm mb-3 ${theme.colors.primary}`}>
          <div className={`animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full`} />
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
              className={`${theme.layout.borderRadius} p-3 text-sm border transition-colors duration-500 ${
                isSelected ? `${theme.effects.glass} ${theme.effects.glow}` : `bg-black/20 ${theme.colors.border}`
              }`}
            >
              {/* Path Header */}
              <div className="flex items-center justify-between mb-2">
                <div className={`font-medium ${theme.colors.text.primary}`}>
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
              <div className={`flex items-center gap-3 mb-2 text-xs ${theme.colors.text.muted}`}>
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
              <div className={`mt-3 pt-3 border-t ${theme.colors.border}`}>
                <div className={`text-xs font-semibold mb-2 ${theme.colors.text.secondary}`}>
                  Journey ({path.waypoints.length + 2} steps):
                </div>
                <div className="space-y-1.5">
                  {/* Start */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className={theme.colors.secondary}>1.</span>
                    <span className={theme.colors.text.secondary}>{path.from.name}</span>
                    <span className={`text-[10px] ${theme.colors.secondary}`}>(start)</span>
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
                      className={`w-full flex items-center gap-2 text-xs ${theme.colors.hover} ${theme.layout.borderRadius} px-1 py-0.5 transition cursor-pointer text-left`}
                    >
                      <span className={theme.colors.primary}>{wpIdx + 2}.</span>
                      <span className={theme.colors.text.primary}>{wp.emotion}</span>
                      <span className={`text-[10px] ml-auto ${theme.colors.primary}`}>→ details</span>
                    </button>
                  ))}

                  {/* Goal */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-green-400">{path.waypoints.length + 2}.</span>
                    <span className={theme.colors.text.secondary}>{path.to.name}</span>
                    <span className="text-green-400 text-[10px]">(goal)</span>
                  </div>
                </div>
              </div>

              {/* Bridge Requirement */}
              {path.requires_bridge && path.bridge_emotions && (
                <div className={`mt-2 pt-2 border-t ${theme.colors.border}`}>
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
