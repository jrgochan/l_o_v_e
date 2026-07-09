/**
 * Layer Controls Component — Enhanced
 *
 * Collapsible sections with icons, keyboard hints, and visual polish:
 * - Visibility filters (category toggles for scene rendering)
 * - Settings (auto-compute paths, enable animations)
 * - Layer toggles with icons + keyboard shortcut badges
 * - Export section (collapsed by default)
 *
 * Shortcuts section removed — full list lives in HelpModal.
 */

"use client";

import { useState } from "react";
import { ExportControls } from "../../shared/ExportControls";
import type { CategoryFilter, LayerVisibility, VisualizationSettings } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface LayerControlsProps {
  categoryFilters: Map<string, CategoryFilter>;
  layers: LayerVisibility;
  settings: VisualizationSettings;
  allCategoriesEnabled: boolean;
  onToggleCategoryFilter: (category: string) => void;
  onToggleAllCategories: () => void;
  onUpdateSetting: <K extends keyof VisualizationSettings>(
    key: K,
    value: VisualizationSettings[K]
  ) => void;
  onToggleLayer: (layer: keyof LayerVisibility) => void;
}

/** Layer metadata: icon, human label, optional keyboard shortcut */
const LAYER_META: Record<string, { icon: string; label: string; shortcut?: string }> = {
  soulSphere: { icon: "🔮", label: "Soul Sphere", shortcut: "S" },
  emotionPoints: { icon: "📍", label: "Emotion Points" },
  emotionLabels: { icon: "🏷️", label: "Labels", shortcut: "L" },
  transitionPaths: { icon: "🛤️", label: "Paths", shortcut: "Space" },
  waypoints: { icon: "📌", label: "Waypoints" },
  bridgeHighlight: { icon: "⭐", label: "Bridge Highlight" },
  legend: { icon: "📊", label: "Legend", shortcut: "G" },
  cinematicOverlay: { icon: "🎬", label: "Cinematic Overlay" },
};

/** Collapsible section header */
function SectionHeader({
  title,
  icon,
  expanded,
  onToggle,
  trailing,
}: {
  title: string;
  icon: string;
  expanded: boolean;
  onToggle: () => void;
  trailing?: React.ReactNode;
}) {
  const theme = useAdminTheme();
  return (
    <div className="w-full flex items-center justify-between py-1">
      <div
        onClick={onToggle}
        className="flex items-center gap-1.5 cursor-pointer group flex-1"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <span
          className={`text-xs transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
        >
          ▸
        </span>
        <span
          className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.secondary} group-hover:${theme.colors.text.primary}`}
        >
          {icon} {title}
        </span>
      </div>
      {trailing}
    </div>
  );
}

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

  // Collapsible state — visibility + layers expanded by default
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    visibility: true,
    settings: true,
    layers: true,
    export: false,
  });

  const toggle = (key: string) => setExpandedSections((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      {/* ═══ VISIBILITY FILTERS ═══ */}
      <section>
        <SectionHeader
          title="Visibility"
          icon="👁️"
          expanded={expandedSections.visibility}
          onToggle={() => toggle("visibility")}
          trailing={
            <button
              onClick={(e) => {
                e.stopPropagation();
                onToggleAllCategories();
              }}
              className={`text-[10px] px-1.5 py-0.5 rounded ${theme.colors.primary} hover:bg-white/5 transition`}
            >
              {allCategoriesEnabled ? "Hide All" : "Show All"}
            </button>
          }
        />
        {expandedSections.visibility && (
          <div className="space-y-0.5 mt-1 max-h-28 overflow-y-auto custom-scrollbar">
            {Array.from(categoryFilters.values()).map((filter) => (
              <label
                key={filter.name}
                className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors ${theme.colors.hover}`}
              >
                <input
                  type="checkbox"
                  checked={filter.enabled}
                  onChange={() => onToggleCategoryFilter(filter.name)}
                  className="rounded border-white/20 bg-transparent w-3.5 h-3.5"
                />
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-white/10"
                  style={{ backgroundColor: filter.color }}
                />
                <span
                  className={`text-xs flex-1 truncate ${theme.colors.text.secondary}`}
                  title={filter.name}
                >
                  {filter.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </section>

      {/* ═══ SETTINGS ═══ */}
      <section>
        <SectionHeader
          title="Settings"
          icon="⚙️"
          expanded={expandedSections.settings}
          onToggle={() => toggle("settings")}
        />
        {expandedSections.settings && (
          <div className="space-y-1.5 mt-1">
            <label
              className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer ${theme.colors.text.secondary} hover:bg-white/5 transition`}
            >
              <input
                type="checkbox"
                checked={settings.computeMode !== "manual"}
                onChange={(e) =>
                  onUpdateSetting("computeMode", e.target.checked ? "cache-first" : "manual")
                }
                className="rounded border-white/20 bg-transparent w-3.5 h-3.5"
              />
              <span className="text-xs">Auto-compute paths</span>
            </label>
            <label
              className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer ${theme.colors.text.secondary} hover:bg-white/5 transition`}
            >
              <input
                type="checkbox"
                checked={settings.enableAnimations}
                onChange={(e) => onUpdateSetting("enableAnimations", e.target.checked)}
                className="rounded border-white/20 bg-transparent w-3.5 h-3.5"
              />
              <span className="text-xs">Enable animations</span>
            </label>
          </div>
        )}
      </section>

      {/* ═══ LAYER TOGGLES ═══ */}
      <section>
        <SectionHeader
          title="Layers"
          icon="🧊"
          expanded={expandedSections.layers}
          onToggle={() => toggle("layers")}
        />
        {expandedSections.layers && (
          <div className="space-y-0.5 mt-1">
            {Object.entries(layers).map(([key, value]) => {
              if (key === "viewerShortcuts" || key === "vacDisplay") return null;
              const meta = LAYER_META[key];
              if (!meta) return null;

              return (
                <label
                  key={key}
                  className={`flex items-center gap-2 px-2 py-1 rounded-md cursor-pointer transition-colors ${
                    value ? "bg-white/5" : ""
                  } hover:bg-white/5`}
                >
                  <input
                    type="checkbox"
                    checked={value}
                    onChange={() => onToggleLayer(key as keyof LayerVisibility)}
                    className="rounded border-white/20 bg-transparent w-3.5 h-3.5"
                  />
                  <span className="text-xs w-4 text-center flex-shrink-0">{meta.icon}</span>
                  <span className={`text-xs flex-1 ${theme.colors.text.secondary}`}>
                    {meta.label}
                  </span>
                  {meta.shortcut && (
                    <kbd
                      className={`text-[9px] px-1.5 py-0.5 rounded bg-black/40 border ${theme.colors.border} ${theme.colors.text.muted} font-mono flex-shrink-0`}
                    >
                      {meta.shortcut}
                    </kbd>
                  )}
                </label>
              );
            })}
          </div>
        )}
      </section>

      {/* ═══ EXPORT ═══ */}
      <section>
        <SectionHeader
          title="Export"
          icon="📤"
          expanded={expandedSections.export}
          onToggle={() => toggle("export")}
        />
        {expandedSections.export && (
          <div className="mt-1">
            <ExportControls />
          </div>
        )}
      </section>
    </>
  );
}
