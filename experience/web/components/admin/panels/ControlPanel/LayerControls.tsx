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
  return (
    <>
      {/* Visibility Filters (Scene Rendering) */}
      <section>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-gray-400">
            Visibility <span className="text-xs text-gray-500">(Scene)</span>
          </h2>
          <button
            onClick={onToggleAllCategories}
            className="text-xs text-cyan-400 hover:text-cyan-300"
          >
            {allCategoriesEnabled ? "Hide All" : "Show All"}
          </button>
        </div>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {Array.from(categoryFilters.values()).map((filter) => (
            <label
              key={filter.name}
              className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-800 rounded cursor-pointer"
            >
              <input
                type="checkbox"
                checked={filter.enabled}
                onChange={() => onToggleCategoryFilter(filter.name)}
                className="rounded"
              />
              <div className="w-3 h-3 rounded" style={{ backgroundColor: filter.color }} />
              <span className="text-sm text-gray-300 flex-1 truncate" title={filter.name}>
                {filter.name}
              </span>
            </label>
          ))}
        </div>
      </section>

      {/* Settings */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-2">Settings</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.computeMode !== "manual"}
              onChange={(e) =>
                onUpdateSetting("computeMode", e.target.checked ? "cache-first" : "manual")
              }
              className="rounded"
            />
            <span className="text-sm text-gray-300">Auto-compute paths</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.enableAnimations}
              onChange={(e) => onUpdateSetting("enableAnimations", e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Enable animations</span>
          </label>
        </div>
      </section>

      {/* Layer Toggles */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-2">Layers</h2>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layers.soulSphere}
              onChange={() => onToggleLayer("soulSphere")}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Soul Sphere</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layers.emotionPoints}
              onChange={() => onToggleLayer("emotionPoints")}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Emotion Points</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layers.emotionLabels}
              onChange={() => onToggleLayer("emotionLabels")}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Labels</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layers.transitionPaths}
              onChange={() => onToggleLayer("transitionPaths")}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Paths</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layers.waypoints}
              onChange={() => onToggleLayer("waypoints")}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Waypoints</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={layers.legend}
              onChange={() => onToggleLayer("legend")}
              className="rounded"
            />
            <span className="text-sm text-gray-300">Legend</span>
          </label>
        </div>
      </section>

      {/* Export Controls */}
      <section>
        <ExportControls />
      </section>

      {/* Keyboard Shortcuts Help */}
      <section>
        <h2 className="text-sm font-semibold text-gray-400 mb-2">Shortcuts</h2>
        <div className="text-xs text-gray-400 space-y-1">
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Esc</kbd>
            <span>Clear selection</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">B</kbd>
            <span>Select bridge emotions</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-purple-700 rounded">M</kbd>
            <span>Cycle animation modes</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">Space</kbd>
            <span>Toggle paths</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">F</kbd>
            <span>Toggle focus mode</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">L</kbd>
            <span>Toggle labels</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">S</kbd>
            <span>Toggle sphere</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">O</kbd>
            <span>Toggle motion</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">A</kbd>
            <span>Toggle axes</span>
          </div>
          <div className="flex items-center gap-2">
            <kbd className="px-1.5 py-0.5 bg-gray-700 rounded">H</kbd>
            <span>Help (console)</span>
          </div>
        </div>
      </section>
    </>
  );
}
