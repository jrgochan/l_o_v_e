/**
 * Emotion History Card Component
 *
 * Individual card displaying a single emotion from chat history.
 * Allows toggling sphere visibility and shows emotional details.
 */

"use client";

import { useState } from "react";
import type { EmotionHistoryEntry } from "@/stores/useEmotionHistoryStore";
import { CATEGORY_COLORS } from "@/types/atlas-admin";

interface EmotionHistoryCardProps {
  entry: EmotionHistoryEntry;
  onToggleVisibility: (id: string) => void;
  onRemove: (id: string) => void;
}

export function EmotionHistoryCard({
  entry,
  onToggleVisibility,
  onRemove,
}: EmotionHistoryCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Get category color
  const categoryColor = CATEGORY_COLORS[entry.category] || "#888888";

  // Format time
  const timeStr = entry.timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  // Confidence color
  const confidenceColor =
    entry.confidence >= 0.8
      ? "text-green-400"
      : entry.confidence >= 0.6
        ? "text-yellow-400"
        : "text-orange-400";

  return (
    <div
      className={`bg-gray-800/50 border rounded-lg transition-all ${
        entry.isVisibleInSphere
          ? "border-cyan-400 bg-cyan-900/20"
          : "border-gray-700 hover:border-gray-600"
      }`}
    >
      {/* Main Card Content */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          {/* Visibility Checkbox */}
          <input
            type="checkbox"
            checked={entry.isVisibleInSphere}
            onChange={() => onToggleVisibility(entry.id)}
            className="mt-0.5 rounded cursor-pointer"
            title="Toggle visibility in Soul Sphere"
          />

          {/* Emotion Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="flex-1 text-left hover:text-cyan-300 transition"
              >
                <h4 className="text-sm font-semibold text-white truncate">{entry.emotion}</h4>
              </button>
              <span className="text-xs text-gray-500 whitespace-nowrap">{timeStr}</span>
            </div>

            {/* Category Badge */}
            <div className="flex items-center gap-2 mt-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: categoryColor }} />
              <span className="text-xs text-gray-400 truncate">{entry.category}</span>
            </div>

            {/* Confidence */}
            <div className="text-xs mt-1">
              <span className="text-gray-500">Confidence: </span>
              <span className={confidenceColor}>{(entry.confidence * 100).toFixed(0)}%</span>
            </div>
          </div>

          {/* Remove Button */}
          <button
            onClick={() => onRemove(entry.id)}
            className="text-gray-500 hover:text-red-400 transition text-sm"
            title="Remove from history"
          >
            ✕
          </button>
        </div>

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-700 space-y-2">
            {/* VAC Values */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-gray-900/50 rounded p-2">
                <div className="text-gray-400">Valence</div>
                <div className="text-white font-mono">{entry.vac.valence.toFixed(2)}</div>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <div className="text-gray-400">Arousal</div>
                <div className="text-white font-mono">{entry.vac.arousal.toFixed(2)}</div>
              </div>
              <div className="bg-gray-900/50 rounded p-2">
                <div className="text-gray-400">Connection</div>
                <div className="text-white font-mono">{entry.vac.connection.toFixed(2)}</div>
              </div>
            </div>

            {/* Transcription if available */}
            {entry.transcription && (
              <div className="text-xs">
                <div className="text-gray-400 mb-1">Context:</div>
                <div className="text-gray-300 italic line-clamp-2">
                  &quot;{entry.transcription}&quot;
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
