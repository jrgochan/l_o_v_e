/**
 * Legend Overlay Component
 *
 * Shows category colors and difficulty colors as a legend overlay on the 3D scene.
 */

"use client";

import { useState } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { DIFFICULTY_COLORS } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function LegendOverlay() {
  const [isExpanded, setIsExpanded] = useState(false);
  const theme = useAdminTheme();
  const categoryFilters = useVisualizationStore((state) => state.categoryFilters);
  const enableOctonionLayer = useSettingsStore((s) => s.enableOctonionLayer);

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

          {/* Octonion Layers Legend */}
          {enableOctonionLayer && (
            <div className={`mt-4 pt-4 border-t ${theme.colors.border}`}>
              <h4 className={`text-xs font-semibold text-violet-400 mb-2`}>🔮 Octonion Layers</h4>
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div
                    className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #22c55e, #991b1b)" }}
                  />
                  <div>
                    <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>
                      Coping Shell
                    </span>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Emerald = empowered, Cracked red = helpless
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div
                    className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #38bdf8, #f97316)" }}
                  />
                  <div>
                    <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>
                      Velocity Particles
                    </span>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Orange orbiting = rapid change, Blue dormant = frozen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div
                    className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                    style={{ background: "linear-gradient(135deg, #8b5cf6, #22d3ee)" }}
                  />
                  <div>
                    <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>
                      Novelty Aura
                    </span>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Iridescent shimmer = novel, Warm amber = familiar
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0 bg-white/20 border border-white/30" />
                  <div>
                    <span className={`text-xs font-medium ${theme.colors.text.secondary}`}>
                      Depth Glow
                    </span>
                    <p className="text-[10px] text-gray-500 leading-tight">
                      Brighter emissive = deeper emotional significance
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
