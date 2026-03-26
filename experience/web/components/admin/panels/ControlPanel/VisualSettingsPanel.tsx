/**
 * Visual Settings Panel (Compact)
 *
 * Inline "DJ" controls for the ControlPanel VIEW tab.
 * Provides quick access to sphere transparency, animation speed,
 * render quality, and a sync broadcast toggle.
 */

"use client";

import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

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
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className={`text-xs ${theme.colors.text.muted}`}>Transparency</span>
          <span className="text-xs font-mono text-white">
            {((1 - settings.sphereOpacity) * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={1 - settings.sphereOpacity}
          onChange={(e) => settings.setSphereOpacity(1 - parseFloat(e.target.value))}
          className="w-full h-1.5 bg-black/30 rounded-lg appearance-none cursor-pointer accent-purple-500"
        />
      </div>

      {/* Speed Slider */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className={`text-xs ${theme.colors.text.muted}`}>Speed</span>
          <span className="text-xs font-mono text-white">
            {settings.animationSpeed.toFixed(1)}x
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="3.0"
          step="0.1"
          value={settings.animationSpeed}
          onChange={(e) => settings.setAnimationSpeed(parseFloat(e.target.value))}
          className="w-full h-1.5 bg-black/30 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
      </div>

      {/* Quality Selector */}
      <div className="space-y-1.5">
        <span className={`text-xs ${theme.colors.text.muted}`}>Quality</span>
        <div className="grid grid-cols-3 gap-1">
          {(["low", "medium", "high"] as const).map((q) => (
            <button
              key={q}
              onClick={() => settings.setRenderQuality(q)}
              className={`px-2 py-1 rounded text-xs font-medium transition capitalize border ${
                settings.renderQuality === q
                  ? `${theme.colors.primary.replace("text-", "bg-")}/20 ${theme.colors.primary} ${theme.colors.border}`
                  : `bg-transparent ${theme.colors.text.muted} border-transparent hover:${theme.colors.text.primary}`
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Breathing Intensity — only when octonion is on */}
      {settings.enableOctonionLayer && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className={`text-xs ${theme.colors.text.muted}`}>Breathing</span>
            <span className="text-xs font-mono text-white">
              {settings.breathingIntensity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="3.0"
            step="0.1"
            value={settings.breathingIntensity}
            onChange={(e) => settings.updateVisualSetting("breathingIntensity", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-black/30 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
          <p className={`text-[10px] ${theme.colors.text.muted}`}>
            {settings.breathingIntensity === 0 ? "Frozen" : settings.breathingIntensity === 1 ? "Data-driven" : "Amplified"}
          </p>
        </div>
      )}

      {/* Topology Intensity — only when octonion is on */}
      {settings.enableOctonionLayer && (
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className={`text-xs ${theme.colors.text.muted}`}>Topology</span>
            <span className="text-xs font-mono text-white">
              {settings.topologyIntensity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2.0"
            step="0.1"
            value={settings.topologyIntensity}
            onChange={(e) => settings.updateVisualSetting("topologyIntensity", parseFloat(e.target.value))}
            className="w-full h-1.5 bg-black/30 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
          <p className={`text-[10px] ${theme.colors.text.muted}`}>
            {settings.topologyIntensity === 0 ? "Smooth sphere" : settings.topologyIntensity === 1 ? "Data-driven" : "Exaggerated"}
          </p>
        </div>
      )}

      {/* Auto-Rotate Toggle */}
      <button
        onClick={() => settings.toggleAutoRotate()}
        className={`w-full flex items-center justify-between px-3 py-2 rounded-lg border text-xs transition ${
          settings.autoRotate
            ? "bg-purple-900/30 border-purple-600 text-purple-300"
            : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.muted}`
        }`}
      >
        <span>Auto-Rotate</span>
        <span
          className={`w-2 h-2 rounded-full ${
            settings.autoRotate ? theme.colors.primary.replace("text-", "bg-") : "bg-black/40"
          }`}
        />
      </button>
    </div>
  );
}
