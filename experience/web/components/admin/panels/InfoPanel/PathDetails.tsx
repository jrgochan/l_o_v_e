/**
 * PathDetails Component
 *
 * Displays detailed information about a single path including:
 * - Distance, time, and difficulty metrics
 * - Full journey display (start → waypoints → goal)
 * - Clickable waypoints for details
 * - Bridge emotion requirements with explanations
 *
 * Uses store actions for hover management.
 */

"use client";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { BRIDGE_EMOTIONS, DIFFICULTY_COLORS } from "@/types/atlas-admin";
import type { EmotionPath, PathWaypoint } from "@/types/atlas-admin";

interface PathDetailsProps {
  path: EmotionPath;
  onWaypointClick: (waypoint: PathWaypoint, index: number) => void;
}

export function PathDetails({ path, onWaypointClick }: PathDetailsProps) {
  const setHoveredEmotion = useAtlasAdminStore((state) => state.setHoveredEmotion);
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 mb-3">Path Details</h2>
      <div className="bg-gray-800 rounded-lg p-4 space-y-3">
        {/* Path Header */}
        <div className="flex justify-between items-start">
          <h3 className="text-sm font-bold text-white">
            {path.from.name} → {path.to.name}
          </h3>
          <button
            onClick={() =>
              useAtlasAdminStore.getState().setIsFlying(!useAtlasAdminStore.getState().isFlying)
            }
            className="px-2 py-1 bg-cyan-900/50 hover:bg-cyan-800 text-cyan-200 text-xs rounded border border-cyan-700/50 flex items-center gap-1 transition"
            title="Play Cinematic Journey"
          >
            <span>▶ Play</span>
          </button>
        </div>

        {/* Path Metrics */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <h4 className="text-xs text-gray-400">Distance</h4>
            <p className="text-sm text-white font-mono">{path.total_distance.toFixed(2)}</p>
          </div>
          <div>
            <h4 className="text-xs text-gray-400">Time</h4>
            <p className="text-sm text-white">{path.estimated_time}</p>
          </div>
        </div>

        {/* Difficulty */}
        <div>
          <h4 className="text-xs text-gray-400">Difficulty</h4>
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{
                backgroundColor:
                  DIFFICULTY_COLORS[path.difficulty as keyof typeof DIFFICULTY_COLORS] || "#888888",
              }}
            />
            <span className="text-sm text-white capitalize">{path.difficulty}</span>
          </div>
        </div>

        {/* Journey Path */}
        {path.waypoints.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">
              Journey Path ({path.waypoints.length + 2} steps)
            </h4>
            <div className="space-y-2">
              {/* Start */}
              <div
                className="bg-blue-900/20 border border-blue-500/30 rounded p-2 cursor-pointer hover:bg-blue-900/30 transition"
                onMouseEnter={() => setHoveredEmotion(path.from.id)}
                onMouseLeave={() => setHoveredEmotion(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-blue-400 font-bold">1.</span>
                  <span className="text-white font-medium">
                    {path.from.name}
                    {(BRIDGE_EMOTIONS as readonly string[]).includes(path.from.name) && (
                      <span className="text-yellow-400 ml-1">★</span>
                    )}
                  </span>
                  <span className="text-xs text-blue-400">(Start)</span>
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
                    className="w-full bg-gray-700/50 border border-gray-600 hover:border-cyan-500 hover:bg-gray-700 rounded p-2 text-left transition cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-bold">{i + 2}.</span>
                        <span className="text-white font-medium">
                          {wp.emotion}
                          {(BRIDGE_EMOTIONS as readonly string[]).includes(wp.emotion) && (
                            <span className="text-yellow-400 ml-1">★</span>
                          )}
                        </span>
                      </div>
                      <span className="text-xs text-cyan-400">Click for details →</span>
                    </div>
                    {wp.reasoning && (
                      <div className="text-xs text-gray-300 ml-5 mt-1">💡 {wp.reasoning}</div>
                    )}
                    {wp.estimated_time && (
                      <div className="text-xs text-gray-400 ml-5 mt-1">
                        ⏱️ {wp.estimated_time} • {wp.difficulty}
                      </div>
                    )}
                    {wp.strategies && wp.strategies.length > 0 && (
                      <div className="text-xs text-gray-300 ml-5 mt-1">
                        <div className="font-semibold text-gray-400">
                          Strategies ({wp.strategies.length}):
                        </div>
                        <ul className="list-disc list-inside mt-1">
                          {wp.strategies.slice(0, 2).map((strategy, si) => (
                            <li key={si}>{strategy.name}</li>
                          ))}
                          {wp.strategies.length > 2 && (
                            <li className="text-cyan-400">+{wp.strategies.length - 2} more...</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </button>
                );
              })}

              {/* Goal */}
              <div
                className="bg-green-900/20 border border-green-500/30 rounded p-2 cursor-pointer hover:bg-green-900/30 transition"
                onMouseEnter={() => setHoveredEmotion(path.to.id)}
                onMouseLeave={() => setHoveredEmotion(null)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-green-400 font-bold">{path.waypoints.length + 2}.</span>
                  <span className="text-white font-medium">
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
          <div className="bg-yellow-900/30 border-2 border-yellow-500/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-yellow-400 text-lg">★</span>
              <h4 className="text-sm font-bold text-yellow-300">Bridge Emotions Required</h4>
            </div>
            <p className="text-sm text-gray-200 mb-2">
              <strong>{path.bridge_emotions.join(", ")}</strong>
            </p>
            <p className="text-xs text-gray-300 leading-relaxed">
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
