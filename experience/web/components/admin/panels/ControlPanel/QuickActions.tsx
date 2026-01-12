/**
 * Quick Actions Component
 *
 * Displays selected count and provides quick action buttons:
 * - Clear all selections
 * - Select bridge emotions
 * - Smart recommendations toggle
 */

"use client";

import { SmartRecommendations } from "../../shared/SmartRecommendations";

interface QuickActionsProps {
  selectedCount: number;
  onClearSelection: () => void;
  onSelectBridgeEmotions: () => void;
  showRecommendations: boolean;
  onToggleRecommendations: () => void;
}

/**
 * Renders quick action buttons and smart recommendations
 */
export function QuickActions({
  selectedCount,
  onClearSelection,
  onSelectBridgeEmotions,
  showRecommendations,
  onToggleRecommendations,
}: QuickActionsProps) {
  return (
    <>
      {/* Selected Count & Clear All */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-400">Selected ({selectedCount})</h2>
          {selectedCount > 0 && (
            <button onClick={onClearSelection} className="text-xs text-red-400 hover:text-red-300">
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={onSelectBridgeEmotions}
            className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white text-sm rounded transition"
          >
            Select Bridge Emotions (6)
          </button>
        </div>
      </section>

      {/* Smart Recommendations */}
      <section>
        <button
          onClick={onToggleRecommendations}
          className="w-full flex items-center justify-between px-3 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition mb-2"
        >
          <span>✨ Smart Recommendations</span>
          <span className="text-xs">{showRecommendations ? "▼" : "▶"}</span>
        </button>

        {showRecommendations && (
          <div className="bg-gray-900 border border-purple-500/30 rounded-lg p-2">
            <SmartRecommendations />
          </div>
        )}
      </section>
    </>
  );
}
