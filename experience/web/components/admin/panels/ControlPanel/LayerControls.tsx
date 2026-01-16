/**
 * Layer Controls Component
 *
 * Scene layer visibility toggles and related controls:
 * - Visibility filters (category toggles for scene rendering)
 * - Settings (auto-compute paths, enable animations)
 * - Layer toggles (sphere, points, labels, paths, waypoints, legend)
 * - Keyboard shortcuts help
 */

"use client";

import { ExportControls } from "../../shared/ExportControls";
import type { CategoryFilter, LayerVisibility, AtlasAdminSettings } from "@/types/atlas-admin";

interface LayerControlsProps {
  categoryFilters: Map<string, CategoryFilter>;
  layers: LayerVisibility;
  settings: AtlasAdminSettings;
  allCategoriesEnabled: boolean;
  onToggleCategoryFilter: (category: string) => void;
  onToggleAllCategories: () => void;
  onUpdateSetting: <K extends keyof AtlasAdminSettings>(
    key: K,
    value: AtlasAdminSettings[K]
  ) => void;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

/**
 * Renders layer visibility controls, settings, and keyboard shortcuts
 */
export function LayerControls({
  categoryFilters,
  layers,
  settings,
  allCategoriesEnabled,
  onToggleCategoryFilter,
  onToggleAllCategories,
  onUpdateSetting,
  onToggleLayer,
}: LayerControlsProps) {
  const theme = useAdminTheme();

  return (
    <>
      {/* Visibility Filters (Scene Rendering) */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className={`text-sm font-semibold ${theme.colors.text.secondary}`}>
            Visibility <span className={`text-xs ${theme.colors.text.muted}`}>(Scene)</span>
          </h2>
          <button
            onClick={onToggleAllCategories}
            className={`text-xs ${theme.colors.primary} hover:${theme.colors.secondary}`}
          >
            {allCategoriesEnabled ? "Hide All" : "Show All"}
          </button>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto custom-scrollbar">
          {Array.from(categoryFilters.values()).map((filter) => (
            <label
              key={filter.name}
              className={`flex items-center gap-2 px-2 py-1.5 ${theme.layout.borderRadius} cursor-pointer transition-colors ${theme.colors.hover}`}
            >
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={() => onToggleCategoryFilter(filter.name)}
                className={`rounded border-gray-600 bg-transparent focus:ring-1 focus:ring-offset-0 ${theme.colors.primary}`}
              />
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: filter.color }} />
              <span className={`text-sm flex-1 truncate ${theme.colors.text.secondary}`} title={filter.name}>
                {filter.name}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Settings */}
      <section>
        <h2 className={`text-sm font-semibold mb-2 ${theme.colors.text.secondary}`}>Settings</h2>
        <div className="space-y-2">
          <label className={`flex items-center gap-2 cursor-pointer ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}>
            <input
              type="checkbox"
              checked={settings.computeMode !== "manual"}
              onChange={(e) =>
                onUpdateSetting("computeMode", e.target.checked ? "cache-first" : "manual")
              }
              className="rounded border-gray-600 bg-transparent"
            />
            <span className="text-sm">Auto-compute paths</span>
          </label>

          <label className={`flex items-center gap-2 cursor-pointer ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}>
            <input
              type="checkbox"
              checked={settings.enableAnimations}
              onChange={(e) => onUpdateSetting("enableAnimations", e.target.checked)}
              className="rounded border-gray-600 bg-transparent"
            />
            <span className="text-sm">Enable animations</span>
          </label>
        </div>
      </section>

      {/* Layer Toggles */}
      <section>
        <h2 className={`text-sm font-semibold mb-2 ${theme.colors.text.secondary}`}>Layers</h2>
        <div className="space-y-2">
          {Object.entries(layers).map(([key, value]) => {
            if (key === "viewerShortcuts" || key === "vacDisplay") return null; // Skip some layers
            return (
              <label
                key={key}
                className={`flex items-center gap-2 cursor-pointer ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}
              >
                <input
                  type="checkbox"
                  checked={value}
                  onChange={() => onToggleLayer(key as keyof LayerVisibility)}
                  className="rounded border-gray-600 bg-transparent"
                />
                <span className="text-sm capitalize">
                  {key.replace(/([A-Z])/g, " $1").trim()} {/* Proper Case */}
                </span>
              </label>
            );
          })}
        </div>
      </section>

      {/* Export Controls */}
      <section>
        <ExportControls />
      </section>

      {/* Keyboard Shortcuts Help */}
      <section>
        <h2 className={`text-sm font-semibold mb-2 ${theme.colors.text.secondary}`}>Shortcuts</h2>
        <div className={`text-xs space-y-1 ${theme.colors.text.muted}`}>
          <div className="flex items-center gap-2">
            <kbd className={`px-1.5 py-0.5 rounded bg-gray-800 border ${theme.colors.border}`}>Esc</kbd>
            <span>Clear selection</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className={`px-1.5 py-0.5 rounded bg-gray-800 border ${theme.colors.border}`}>M</kbd>
            <span>Cycle animation modes</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className={`px-1.5 py-0.5 rounded bg-gray-800 border ${theme.colors.border}`}>Space</kbd>
            <span>Toggle paths</span>
          </div>
        </div>
      </section>
    </>
  );
}
