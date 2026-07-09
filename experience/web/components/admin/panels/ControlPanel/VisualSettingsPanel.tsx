/**
 * Visual Settings Panel — Soul Sphere DJ Controls
 *
 * Premium slider controls for sphere transparency, animation speed,
 * render quality, breathing intensity, and topology intensity.
 * Uses the custom SliderControl component for consistent styling.
 */

"use client";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";
import { SliderControl } from "@/components/ui/SliderControl";

export function VisualSettingsPanel() {
  const theme = useAdminTheme();
  const settings = useSettingsStore();

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3
          className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.secondary}`}
        >
          🎛️ Soul Sphere DJ
        </h3>
      </div>

      {/* Transparency Slider */}
      <SliderControl
        label="Transparency"
        value={1 - settings.sphereOpacity}
        min={0}
        max={1}
        step={0.05}
        defaultValue={0}
        onChange={(v) => settings.setSphereOpacity(1 - v)}
        accentColor="#a78bfa"
        formatValue={(v) => `${(v * 100).toFixed(0)}%`}
      />

      {/* Speed Slider */}
      <SliderControl
        label="Speed"
        value={settings.animationSpeed}
        min={0.1}
        max={3.0}
        step={0.1}
        defaultValue={1.0}
        onChange={(v) => settings.setAnimationSpeed(v)}
        accentColor="#22d3ee"
        formatValue={(v) => `${v.toFixed(1)}x`}
      />

      {/* Quality Selector */}
      <div className="space-y-1.5">
        <span className={`text-xs ${theme.colors.text.muted}`}>Quality</span>
        <div className="grid grid-cols-3 gap-1">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              onClick={() => settings.setRenderQuality(q)}
              className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 capitalize border ${
                settings.renderQuality === q
                  ? "bg-white/10 text-white border-white/20 shadow-sm"
                  : `bg-transparent ${theme.colors.text.muted} border-transparent hover:bg-white/5 hover:text-white/70`
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Breathing Intensity — only when octonion is on */}
      {settings.enableOctonionLayer && (
        <SliderControl
          label="Breathing"
          value={settings.breathingIntensity}
          min={0}
          max={3.0}
          step={0.1}
          defaultValue={1.0}
          onChange={(v) => settings.updateVisualSetting("breathingIntensity", v)}
          accentColor="#34d399"
          formatValue={(v) => `${v.toFixed(1)}x`}
          description={
            settings.breathingIntensity === 0
              ? "Frozen"
              : settings.breathingIntensity === 1
                ? "Data-driven"
                : "Amplified"
          }
        />
      )}

      {/* Topology Intensity — only when octonion is on */}
      {settings.enableOctonionLayer && (
        <SliderControl
          label="Topology"
          value={settings.topologyIntensity}
          min={0}
          max={2.0}
          step={0.1}
          defaultValue={1.0}
          onChange={(v) => settings.updateVisualSetting("topologyIntensity", v)}
          accentColor="#fbbf24"
          formatValue={(v) => `${v.toFixed(1)}x`}
          description={
            settings.topologyIntensity === 0
              ? "Smooth sphere"
              : settings.topologyIntensity === 1
                ? "Data-driven"
                : "Exaggerated"
          }
        />
      )}

      {/* Auto-Rotate Toggle */}
      <button
        onClick={() => settings.toggleAutoRotate()}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition-all duration-200 ${
          settings.autoRotate
            ? "bg-violet-900/20 border-violet-500/30 text-violet-300 hover:bg-violet-900/30"
            : `bg-black/10 ${theme.colors.border} ${theme.colors.text.muted} hover:bg-white/5`
        }`}
      >
        <span className="flex items-center gap-1.5">
          <span
            className={`transition-transform duration-500 inline-block ${settings.autoRotate ? "animate-spin" : ""}`}
            style={settings.autoRotate ? { animationDuration: "3s" } : undefined}
          >
            🌀
          </span>
          Auto-Rotate
        </span>
        <span
          className={`w-2 h-2 rounded-full transition-colors ${
            settings.autoRotate ? "bg-violet-400" : "bg-white/10"
          }`}
        />
      </button>
    </div>
  );
}
