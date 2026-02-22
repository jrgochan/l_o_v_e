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

import type { Emotion, EmotionPath } from "@/types/visualization";
import { DIFFICULTY_COLORS } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface MatrixTooltipProps {
  fromEmotion: Emotion;
  toEmotion: Emotion;
  path: EmotionPath | undefined;
}

/**
 * Renders enhanced hover tooltip with path details
 */
export function MatrixTooltip({ fromEmotion, toEmotion, path }: MatrixTooltipProps) {
  const theme = useAdminTheme();
  return (
    <div
      className={`absolute bottom-4 right-4 ${theme.colors.background} ${theme.effects.glass} border-2 ${theme.colors.border} ${theme.layout.borderRadius} p-4 shadow-2xl ${theme.effects.glow} max-w-md z-50 animate-in fade-in duration-200`}
    >
      {/* Header with Difficulty Color Bar */}
      <div className="flex items-center gap-3 mb-3">
        {path && (
          <div
            className="w-1 h-16 rounded-full shadow-lg"
            style={{ backgroundColor: DIFFICULTY_COLORS[path.difficulty] }}
          />
        )}
        <div className="flex-1">
          <h3 className={`text-sm font-bold ${theme.colors.text.primary} mb-1`}>
            {fromEmotion.name} → {toEmotion.name}
          </h3>
          <div className={`text-xs ${theme.colors.text.secondary}`}>
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
          <div className={`grid grid-cols-2 gap-3 bg-black/20 rounded p-3`}>
            <div>
              <div className={`text-xs ${theme.colors.text.secondary}`}>Distance</div>
              <div className={`text-sm ${theme.colors.text.primary} font-mono font-semibold`}>
                {path.total_distance.toFixed(3)}
              </div>
            </div>
            <div>
              <div className={`text-xs ${theme.colors.text.secondary}`}>Waypoints</div>
              <div className={`text-sm ${theme.colors.primary} font-semibold`}>
                {path.waypoints.length}
              </div>
            </div>
            <div className="col-span-2">
              <div className={`text-xs ${theme.colors.text.secondary}`}>Estimated Time</div>
              <div className={`text-sm ${theme.colors.text.primary} font-medium`}>
                {path.estimated_time}
              </div>
            </div>
          </div>

          {/* Bridge Requirements */}
          {path.requires_bridge && path.bridge_emotions && path.bridge_emotions.length > 0 && (
            <div className={`mt-3 pt-3 border-t ${theme.colors.border}`}>
              <div className="flex items-center gap-2 text-yellow-400">
                <span className="text-lg">★</span>
                <span className="text-xs font-semibold">Requires Bridge Emotions:</span>
              </div>
              <div className="mt-1 text-xs text-yellow-300">{path.bridge_emotions.join(", ")}</div>
            </div>
          )}

          {/* Click Hint */}
          <div
            className={`mt-2 pt-2 border-t ${theme.colors.border} text-xs ${theme.colors.text.muted} italic`}
          >
            💡 Click to select and view in 3D
          </div>
        </div>
      ) : (
        <div className="bg-black/20 rounded p-3">
          <p className={`text-xs ${theme.colors.text.muted} italic`}>Path not computed yet</p>
          <p className={`text-xs ${theme.colors.text.muted} mt-1`}>
            Click &quot;Load Cached&quot; or &quot;Compute All&quot; to calculate
          </p>
        </div>
      )}
    </div>
  );
}
