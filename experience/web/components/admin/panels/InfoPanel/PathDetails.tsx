/**
 * PathDetails Component
 *
 * Displays detailed information about a single path including:
 * - Distance, time, and difficulty metrics
 * - Full journey display (start → waypoints → goal)
 * - Clickable waypoints for details
 * - Bridge emotion requirements with explanations
 *
 * Mode-reactive via useAdminTheme.
 */

"use client";

import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { BRIDGE_EMOTIONS, DIFFICULTY_COLORS } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import type { EmotionPath, PathWaypoint } from "@/types/visualization";
import { Info } from "lucide-react";

interface PathDetailsProps {
  path: EmotionPath;
  onWaypointClick: (waypoint: PathWaypoint, index: number) => void;
  onShowDetails?: () => void;
}

export function PathDetails({ path, onWaypointClick, onShowDetails }: PathDetailsProps) {
  const setHoveredEmotion = useVisualizationStore((state) => state.setHoveredEmotion);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const theme = useAdminTheme();

  return (
    <section>
      <h2 className={`text-sm font-semibold mb-3 ${theme.colors.text.secondary}`}>Path Details</h2>
      <div className={`${theme.layout.borderRadius} p-4 space-y-3 bg-black/20 border ${theme.colors.border} transition-colors duration-500`}>
        {/* Path Header */}
        <div className="flex justify-between items-start">
          <h3 className={`text-sm font-bold ${theme.colors.text.primary}`}>
            {path.from.name} → {path.to.name}
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() =>
                useVisualizationStore
                  .getState()
                  .setIsFlying(!useVisualizationStore.getState().isFlying)
              }
              className={`px-2 py-1 text-xs ${theme.layout.borderRadius} border transition-colors ${theme.effects.glass} ${theme.colors.primary} ${theme.colors.hover}`}
              title="Play Cinematic Journey"
            >
              <span>▶ Play</span>
            </button>
            {onShowDetails && (
              <button
                onClick={onShowDetails}
                disabled={path.waypoints.length === 0}
                className={`px-2 py-1 text-xs ${theme.layout.borderRadius} border transition-colors bg-black/20 ${theme.colors.border} ${theme.colors.text.secondary} ${theme.colors.hover} flex items-center gap-1 disabled:opacity-30 disabled:cursor-not-allowed`}
                title="View Journey Details"
              >
                <Info size={12} />
                <span>Details</span>
              </button>
            )}
          </div>
        </div>

        {/* Path Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h4 className={`text-xs ${theme.colors.text.muted}`}>Distance</h4>
            <p className={`text-sm font-mono ${theme.colors.text.primary}`}>{path.total_distance.toFixed(2)}</p>
          </div>
          <div>
            <h4 className={`text-xs ${theme.colors.text.muted}`}>Time</h4>
            <p className={`text-sm ${theme.colors.text.primary}`}>{path.estimated_time}</p>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <h4 className={`text-xs ${theme.colors.text.muted}`}>Difficulty</h4>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{
                backgroundColor:
                  DIFFICULTY_COLORS[path.difficulty as keyof typeof DIFFICULTY_COLORS] || "#888888",
              }}
            />
            <span className={`text-sm capitalize ${theme.colors.text.primary}`}>{path.difficulty}</span>
          </div>
        </div>

        {/* Journey Path */}
        {path.waypoints.length > 0 && (
          <div>
            <h4 className={`text-xs font-semibold mb-2 ${theme.colors.text.secondary}`}>
              Journey Path ({path.waypoints.length + 2} steps)
            </h4>
            <div className="space-y-2">
              {/* Start */}
              <div
                className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-2 cursor-pointer ${theme.colors.hover} transition`}
                onMouseEnter={() => setHoveredEmotion(path.from.id)}
                onMouseLeave={() => setHoveredEmotion(null)}
              >
                <div className="flex items-center gap-2">
                  <span className={`font-bold ${theme.colors.secondary}`}>1.</span>
                  <span className={`font-medium ${theme.colors.text.primary}`}>
                    {path.from.name}
                    {(BRIDGE_EMOTIONS as readonly string[]).includes(path.from.name) && (
                      <span className="text-yellow-400 ml-1">★</span>
                    )}
                  </span>
                  <span className={`text-xs ${theme.colors.secondary}`}>(Start)</span>
                </div>
              </div>

              {/* Waypoints - Clickable */}
              {path.waypoints.map((wp, i) => {
                const wpEmotion = allEmotions.find((e) => e.name === wp.emotion);
                return (
                  <button
                    key={i}
                    onClick={() => onWaypointClick(wp, i)}
                    onMouseEnter={() => wpEmotion && setHoveredEmotion(wpEmotion.id)}
                    onMouseLeave={() => setHoveredEmotion(null)}
                    className={`w-full bg-black/20 border ${theme.colors.border} ${theme.colors.hover} ${theme.layout.borderRadius} p-2 text-left transition cursor-pointer`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${theme.colors.primary}`}>{i + 2}.</span>
                        <span className={`font-medium ${theme.colors.text.primary}`}>
                          {wp.emotion}
                          {(BRIDGE_EMOTIONS as readonly string[]).includes(wp.emotion) && (
                            <span className="text-yellow-400 ml-1">★</span>
                          )}
                        </span>
                      </div>
                      <span className={`text-xs ${theme.colors.primary}`}>Click for details →</span>
                    </div>
                    {wp.reasoning && (
                      <div className={`text-xs ml-5 mt-1 ${theme.colors.text.secondary}`}>💡 {wp.reasoning}</div>
                    )}
                    {wp.estimated_time && (
                      <div className={`text-xs ml-5 mt-1 ${theme.colors.text.muted}`}>
                        ⏱️ {wp.estimated_time} • {wp.difficulty}
                      </div>
                    )}
                    {wp.strategies && wp.strategies.length > 0 && (
                      <div className={`text-xs ml-5 mt-1 ${theme.colors.text.secondary}`}>
                        <div className={`font-semibold ${theme.colors.text.muted}`}>
                          Strategies ({wp.strategies.length}):
                        </div>
                        <ul className="list-disc list-inside mt-1">
                          {wp.strategies.slice(0, 2).map((strategy, si) => (
                            <li key={si}>{strategy.name}</li>
                          ))}
                          {wp.strategies.length > 2 && (
                            <li className={theme.colors.primary}>+{wp.strategies.length - 2} more...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Goal */}
              <div
                className={`bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} p-2 cursor-pointer ${theme.colors.hover} transition`}
                onMouseEnter={() => setHoveredEmotion(path.to.id)}
                onMouseLeave={() => setHoveredEmotion(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold">{path.waypoints.length + 2}.</span>
                  <span className={`font-medium ${theme.colors.text.primary}`}>
                    {path.to.name}
                    {(BRIDGE_EMOTIONS as readonly string[]).includes(path.to.name) && (
                      <span className="text-yellow-400 ml-1">★</span>
                    )}
                  </span>
                  <span className="text-xs text-green-400">(Goal)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bridge Requirement */}
        {path.requires_bridge && path.bridge_emotions && (
          <div className={`bg-yellow-900/30 border-2 border-yellow-500/50 ${theme.layout.borderRadius} p-3`}>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 text-lg">★</span>
              <h4 className="text-sm font-bold text-yellow-300">Bridge Emotions Required</h4>
            </div>
            <p className={`text-sm mb-2 ${theme.colors.text.secondary}`}>
              <strong>{path.bridge_emotions.join(", ")}</strong>
            </p>
            <p className={`text-xs leading-relaxed ${theme.colors.text.secondary}`}>
              This transition requires a bridge emotion - a psychologically necessary intermediate
              state that enables an otherwise impossible emotional shift.
              {path.bridge_emotions.includes("Vulnerability") &&
                " Vulnerability is the zero-crossing on the Connection axis, where shame can begin to heal through connection with others."}
              {path.bridge_emotions.includes("Awe") &&
                " Awe provides perspective shift that reduces self-focus and creates space for transformation."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
