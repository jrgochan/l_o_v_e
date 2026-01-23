/**
 * Aggregate VAC Display Component
 *
 * Shows the aggregate VAC coordinates of selected emotions in the admin interface.
 * Displays what the Soul Sphere is currently representing.
 */

"use client";

import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useExperienceStore } from "@/stores/useExperienceStore";

export function AggregateVACDisplay() {
  const selectedIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const allEmotions = useVisualizationStore((state) => state.allEmotions);
  const targetVAC = useExperienceStore((state) => state.targetVAC);

  // Get selected emotions
  const selectedEmotions = allEmotions.filter((emotion) => selectedIds.has(emotion.id));

  // Format VAC values
  const [v, a, c] = targetVAC;
  const formatValue = (val: number) => val.toFixed(2);

  // Determine color based on valence
  const getValenceColor = (valence: number) => {
    if (valence > 0.3) return "text-cyan-400";
    if (valence < -0.3) return "text-red-400";
    return "text-yellow-400";
  };

  // Determine arousal description
  const getArousalDesc = (arousal: number) => {
    const absArousal = Math.abs(arousal);
    if (absArousal > 0.6) return "Very Intense";
    if (absArousal > 0.3) return "Moderate";
    return "Calm";
  };

  // Determine connection description
  const getConnectionDesc = (connection: number) => {
    if (connection > 0.3) return "Connected";
    if (connection < -0.3) return "Disconnected";
    return "Neutral";
  };

  if (selectedEmotions.length === 0) {
    return (
      <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-2">Soul Sphere State</h3>
        <div className="text-gray-400 text-sm">
          <p>No emotions selected</p>
          <p className="text-xs mt-1">Sphere at neutral position (0, 0, 0)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800/80 backdrop-blur-sm border border-gray-700 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        Soul Sphere State
        {selectedEmotions.length > 1 && (
          <span className="ml-2 text-xs font-normal text-gray-400">
            (Aggregate of {selectedEmotions.length} emotions)
          </span>
        )}
      </h3>

      <div className="grid grid-cols-3 gap-3 mb-3">
        {/* Valence */}
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Valence</div>
          <div className={`text-lg font-bold ${getValenceColor(v)}`}>{formatValue(v)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {v > 0 ? "Positive" : v < 0 ? "Negative" : "Neutral"}
          </div>
        </div>

        {/* Arousal */}
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Arousal</div>
          <div className="text-lg font-bold text-orange-400">{formatValue(a)}</div>
          <div className="text-xs text-gray-500 mt-1">{getArousalDesc(a)}</div>
        </div>

        {/* Connection */}
        <div className="bg-gray-900/50 rounded p-2">
          <div className="text-xs text-gray-400 mb-1">Connection</div>
          <div className="text-lg font-bold text-purple-400">{formatValue(c)}</div>
          <div className="text-xs text-gray-500 mt-1">{getConnectionDesc(c)}</div>
        </div>
      </div>

      {/* Visual explanation */}
      <div className="text-xs text-gray-400 leading-relaxed">
        {selectedEmotions.length === 1 ? (
          <p>
            Sphere showing:{" "}
            <span className="text-white font-medium">{selectedEmotions[0].name}</span>
          </p>
        ) : (
          <p>Sphere showing emotional blend of selected emotions</p>
        )}
      </div>
    </div>
  );
}
