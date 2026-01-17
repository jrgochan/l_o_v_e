/**
 * Quick Actions Component
 *
 * Displays selected count and provides quick action buttons:
 * - Clear all selections
 * - Select bridge emotions
 * - Smart recommendations toggle
 */

"use client";

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
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
  const theme = useAdminTheme();

  return (
    <>
      {/* Selected Count & Clear All */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-sm font-semibold ${theme.colors.text.secondary}`}>
            Selected ({selectedCount})
          </h2>
          {selectedCount > 0 && (
            <button onClick={onClearSelection} className="text-xs text-red-400 hover:text-red-300">
              Clear All
            </button>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={onSelectBridgeEmotions}
            className={`w-full px-3 py-2 text-sm transition ${theme.layout.borderRadius} ${theme.colors.secondary} hover:brightness-110 shadow-sm`}
            style={{
              fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined,
            }}
          >
            Select Bridge Emotions (6)
          </button>
        </div>
      </section>

      {/* Smart Recommendations */}
      <section>
        <button
          onClick={onToggleRecommendations}
          className={`w-full flex items-center justify-between px-3 py-2 text-sm transition mb-2 ${theme.layout.borderRadius} ${theme.colors.primary} hover:brightness-110 shadow-sm`}
          style={{
            fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined,
          }}
        >
          <span>✨ Smart Recommendations</span>
          <span className="text-xs">{showRecommendations ? "▼" : "▶"}</span>
        </button>

        {showRecommendations && (
          <div className={`bg-black/20 border rounded-lg p-2 ${theme.colors.border}`}>
            <SmartRecommendations />
          </div>
        )}
      </section>
    </>
  );
}
