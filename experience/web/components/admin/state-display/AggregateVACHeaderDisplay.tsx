/**
 * Aggregate VAC Header Display Component
 *
 * Horizontal "long format" display of aggregate VAC coordinates in the page header.
 * Shows what the Soul Sphere is currently representing in a clean, scannable format.
 */

"use client";

import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

export function AggregateVACHeaderDisplay() {
  const selectedIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const targetVAC = useExperienceStore((state) => state.targetVAC);

  // Get selected emotions
  const selectedEmotions = allEmotions.filter((emotion) => selectedIds.has(emotion.id));

  // Format VAC values
  const [v, a, c] = targetVAC;
  const formatValue = (val: number) => (val >= 0 ? "+" : "") + val.toFixed(2);

  // Determine valence description
  const getValenceDesc = (valence: number) => {
    if (valence > 0.3) return "Positive";
    if (valence < -0.3) return "Negative";
    return "Neutral";
  };

  // Determine arousal description
  const getArousalDesc = (arousal: number) => {
    if (arousal > 0.6) return "Intense";
    if (arousal > 0.3) return "Active";
    if (arousal < -0.6) return "Very Calm";
    if (arousal < -0.3) return "Calm";
    return "Neutral";
  };

  // Determine connection description
  const getConnectionDesc = (connection: number) => {
    if (connection > 0.6) return "Deeply Connected";
    if (connection > 0.3) return "Connected";
    if (connection < -0.6) return "Isolated";
    if (connection < -0.3) return "Disconnected";
    return "Neutral";
  };

  if (selectedEmotions.length === 0) {
    return (
      <div className="flex items-center gap-3 text-sm">
        <span className="text-gray-400">Soul Sphere:</span>
        <span className="text-gray-500 italic">No selection</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      {/* Label */}
      <span className="text-gray-400 hidden sm:inline">
        {selectedEmotions.length > 1 ? "Aggregate:" : "Emotion:"}
      </span>

      {/* VAC Values - Horizontal Layout */}
      <div className="flex items-center gap-3">
        {/* Valence */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">V</span>
          <span
            className={`font-mono font-semibold ${
              v > 0.3 ? "text-cyan-400" : v < -0.3 ? "text-red-400" : "text-yellow-400"
            }`}
          >
            {formatValue(v)}
          </span>
          <span className="text-xs text-gray-400 hidden md:inline">{getValenceDesc(v)}</span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-700" />

        {/* Arousal */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">A</span>
          <span className="text-orange-400 font-mono font-semibold">{formatValue(a)}</span>
          <span className="text-xs text-gray-400 hidden md:inline">{getArousalDesc(a)}</span>
        </div>

        {/* Separator */}
        <div className="w-px h-4 bg-gray-700" />

        {/* Connection */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">C</span>
          <span className="text-purple-400 font-mono font-semibold">{formatValue(c)}</span>
          <span className="text-xs text-gray-400 hidden md:inline">{getConnectionDesc(c)}</span>
        </div>
      </div>

      {/* Emotion Count */}
      {selectedEmotions.length > 1 && (
        <span className="text-xs text-gray-500 ml-2 hidden sm:inline">
          ({selectedEmotions.length} emotions)
        </span>
      )}
    </div>
  );
}
