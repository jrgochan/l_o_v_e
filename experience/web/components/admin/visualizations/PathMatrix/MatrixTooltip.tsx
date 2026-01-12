/**
 * Matrix Tooltip Component
 *
 * Enhanced hover tooltip showing path details:
 * - Emotion names
 * - Path metrics (distance, difficulty, time)
 * - Waypoint count
 * - Bridge requirements
 * - Visual difficulty indicator
 */

"use client";

import type { AtlasEmotion, EmotionPath } from "@/types/atlas-admin";
import { DIFFICULTY_COLORS } from "@/types/atlas-admin";

interface MatrixTooltipProps {
  fromEmotion: AtlasEmotion;
  toEmotion: AtlasEmotion;
  path: EmotionPath | undefined;
}

/**
 * Renders enhanced hover tooltip with path details
 */
export function MatrixTooltip({ fromEmotion, toEmotion, path }: MatrixTooltipProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-gray-800 border-2 border-gray-600 rounded-lg p-4 shadow-2xl max-w-md z-50 animate-in fade-in duration-200">
      {/* Header with Difficulty Color Bar */}
      <div className="flex items-center gap-3 mb-3">
        {path && (
          <div
            className="w-1 h-16 rounded-full shadow-lg"
            style={{ backgroundColor: DIFFICULTY_COLORS[path.difficulty] }}
          />
        )}
        <div className="flex-1">
          <h3 className="text-sm font-bold text-white mb-1">
            {fromEmotion.name} → {toEmotion.name}
          </h3>
          <div className="text-xs text-gray-400">
            {fromEmotion.category} → {toEmotion.category}
          </div>
        </div>
      </div>

      {/* Path Details */}
      {path ? (
        <div className="space-y-2">
          {/* Difficulty Badge */}
          <div className="flex items-center gap-2">
            <span
              className="px-3 py-1 rounded-full text-xs font-semibold text-white shadow-md"
              style={{ backgroundColor: DIFFICULTY_COLORS[path.difficulty] }}
            >
              {path.difficulty.toUpperCase()}
            </span>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 gap-3 bg-gray-900/50 rounded p-3">
            <div>
              <div className="text-xs text-gray-400">Distance</div>
              <div className="text-sm text-white font-mono font-semibold">
                {path.total_distance.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400">Waypoints</div>
              <div className="text-sm text-cyan-400 font-semibold">{path.waypoints.length}</div>
            </div>
            <div className="col-span-2">
              <div className="text-xs text-gray-400">Estimated Time</div>
              <div className="text-sm text-white font-medium">{path.estimated_time}</div>
            </div>
          </div>

          {/* Bridge Requirements */}
          {path.requires_bridge && path.bridge_emotions && path.bridge_emotions.length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="text-lg">★</span>
                <span className="text-xs font-semibold">Requires Bridge Emotions:</span>
              </div>
              <div className="mt-1 text-xs text-yellow-300">{path.bridge_emotions.join(", ")}</div>
            </div>
          )}

          {/* Click Hint */}
          <div className="mt-2 pt-2 border-t border-gray-700/50 text-xs text-gray-500 italic">
            💡 Click to select and view in 3D
          </div>
        </div>
      ) : (
        <div className="bg-gray-900/50 rounded p-3">
          <p className="text-xs text-gray-500 italic">Path not computed yet</p>
          <p className="text-xs text-gray-600 mt-1">
            Click &quot;Load Cached&quot; or &quot;Compute All&quot; to calculate
          </p>
        </div>
      )}
    </div>
  );
}
