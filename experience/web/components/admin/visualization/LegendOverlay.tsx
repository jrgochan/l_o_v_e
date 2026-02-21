/**
 * Legend Overlay Component
 *
 * Shows category colors and difficulty colors as a legend overlay on the 3D scene.
 */

"use client";

import { useState } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { DIFFICULTY_COLORS } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function LegendOverlay() {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useAdminTheme();
  const categoryFilters = useVisualizationStore((state) => state.categoryFilters);

  const enabledCategories = Array.from(categoryFilters.values()).filter((cat) => cat.enabled);

  return (
    <div
      className={`absolute bottom-4 left-4 ${theme.effects.glass} ${theme.effects.backdropBlur} ${theme.layout.borderRadius} overflow-hidden`}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full px-4 py-3 flex items-center justify-between transition ${theme.colors.hover}`}
      >
        <h3 className={`text-sm font-semibold ${theme.colors.text.primary}`}>Legend</h3>
        <span className={`text-xs ${theme.colors.text.secondary}`}>{isExpanded ? "▼" : "▶"}</span>
      </button>

      {/* Content - Collapsible */}
      {isExpanded && (
        <div className="px-4 pb-4 max-w-md">
          {/* Difficulty Colors */}
          <div className="mb-4">
            <h4 className={`text-xs font-semibold ${theme.colors.text.secondary} mb-2`}>
              Path Difficulty
            </h4>
            <div className="space-y-1">
              {Object.entries(DIFFICULTY_COLORS).map(([difficulty, color]) => (
                <div key={difficulty} className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded" style={{ backgroundColor: color }} />
                  <span className={`text-sm ${theme.colors.text.secondary} capitalize`}>
                    {difficulty}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Category Colors */}
          <div>
            <h4 className={`text-xs font-semibold ${theme.colors.text.secondary} mb-2`}>
              Categories ({enabledCategories.length})
            </h4>
            <div className="space-y-1 max-h-48 overflow-y-auto pr-2">
              {enabledCategories.map((category) => (
                <div key={category.name} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded flex-shrink-0"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className={`text-xs ${theme.colors.text.secondary} leading-tight`}>
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bridge Emotion Indicator */}
          <div className={`mt-4 pt-4 border-t ${theme.colors.border}`}>
            <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-lg">★</span>
              <span className={`text-xs ${theme.colors.text.secondary}`}>Bridge Emotion</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
