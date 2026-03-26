/**
 * Octonion Controls Component
 *
 * Admin panel for enabling/disabling the 8D octonion emotional modeling features:
 * - Layered Soul: Concentric shells for Depth, Coping, Velocity, Novelty
 * - Dimension Map: Fano Plane HUD showing 7D interaction network
 *
 * Includes a "Learn More" explainer for the 4 new dimensions.
 */

"use client";

import { useState } from "react";
import { Toggle } from "@/components/ui/Toggle";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

/** The 4 new dimensions added by octonion extension */
const NEW_DIMENSIONS = [
  {
    name: "Depth",
    symbol: "D",
    range: "Profound ↔ Superficial",
    description: "How deeply held is this feeling? A surface frustration vs. a core wound.",
    color: "text-amber-400",
    bgColor: "bg-amber-900/20",
  },
  {
    name: "Coping",
    symbol: "P",
    range: "Empowered ↔ Helpless",
    description: "Your sense of control. \"I've got this\" vs. \"I can't do anything.\"",
    color: "text-emerald-400",
    bgColor: "bg-emerald-900/20",
  },
  {
    name: "Velocity",
    symbol: "Ė",
    range: "Rapid change ↔ Stillness",
    description: "How fast your emotional state is shifting. Computed from transitions.",
    color: "text-sky-400",
    bgColor: "bg-sky-900/20",
  },
  {
    name: "Novelty",
    symbol: "N",
    range: "Novel ↔ Familiar",
    description: "Is this feeling new and surprising, or well-known territory?",
    color: "text-violet-400",
    bgColor: "bg-violet-900/20",
  },
] as const;

export function OctonionControls() {
  const theme = useAdminTheme();
  const enableOctonionLayer = useSettingsStore((s) => s.enableOctonionLayer);
  const enableFanoPlaneRenders = useSettingsStore((s) => s.enableFanoPlaneRenders);
  const reducedMotion = useSettingsStore((s) => s.reducedMotion);
  const renderQuality = useSettingsStore((s) => s.renderQuality);
  const updateVisualSetting = useSettingsStore((s) => s.updateVisualSetting);

  const [showLearnMore, setShowLearnMore] = useState(false);

  // Auto-disable warning for low render quality
  const isLowQuality = renderQuality === "low";

  return (
    <div className="space-y-3">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <h3
          className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.secondary}`}
        >
          🔮 Octonion Extension
        </h3>
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-900/40 text-violet-300 border border-violet-700/50">
          8D
        </span>
      </div>

      {/* Low quality warning */}
      {isLowQuality && (
        <div className="text-[10px] text-amber-400/80 bg-amber-900/10 rounded px-2 py-1.5 border border-amber-800/30">
          ⚠ Octonion layers are disabled in Low render quality
        </div>
      )}

      <div className={isLowQuality ? "opacity-40 pointer-events-none" : ""}>
        <Toggle
          checked={enableOctonionLayer}
          onChange={(checked) => updateVisualSetting("enableOctonionLayer", checked)}
          leftLabel="4D Classic"
          rightLabel="8D Layered Soul"
        />
        <p className={`text-[11px] mt-1 ml-1 ${theme.colors.text.muted}`}>
          Add Depth, Coping, Velocity &amp; Novelty shells to the Soul Sphere
          {reducedMotion && enableOctonionLayer && (
            <span className="block text-amber-400/70 mt-0.5">
              Reduced motion: particles frozen, aura static
            </span>
          )}
        </p>
      </div>

      {/* Individual Shell Toggles — only visible when master is on */}
      {enableOctonionLayer && !isLowQuality && (
        <div className="ml-3 pl-3 border-l border-violet-700/30 space-y-1.5">
          {([
            { key: "showCopingShell" as const, label: "🛡️ Coping Shell", desc: "Emerald shield / cracked when helpless" },
            { key: "showVelocityParticles" as const, label: "✨ Velocity Particles", desc: "Orbiting field driven by Ė" },
            { key: "showNoveltyAura" as const, label: "🫧 Novelty Aura", desc: "Outer iridescent shimmer" },
          ]).map(({ key, label, desc }) => (
            <label
              key={key}
              className={`flex items-center gap-2 cursor-pointer group ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}
            >
              <input
                type="checkbox"
                checked={useSettingsStore.getState()[key]}
                onChange={(e) => updateVisualSetting(key, e.target.checked)}
                className="rounded border-violet-500/30 bg-transparent w-3.5 h-3.5"
              />
              <div className="min-w-0">
                <span className="text-[11px] font-medium">{label}</span>
                <p className={`text-[10px] ${theme.colors.text.muted} leading-tight`}>{desc}</p>
              </div>
            </label>
          ))}
        </div>
      )}

      {/* Dimension Map Toggle */}
      <div className={isLowQuality ? "opacity-40 pointer-events-none" : ""}>
        <Toggle
          checked={enableFanoPlaneRenders}
          onChange={(checked) => updateVisualSetting("enableFanoPlaneRenders", checked)}
          leftLabel="Map Off"
          rightLabel="Dimension Map"
        />
        <p className={`text-[11px] mt-1 ml-1 ${theme.colors.text.muted}`}>
          Show the 7D interaction network as a floating HUD
        </p>
      </div>

      {/* Learn More */}
      <button
        onClick={() => setShowLearnMore(!showLearnMore)}
        className={`w-full text-left text-[11px] px-2.5 py-1.5 rounded border transition ${
          showLearnMore
            ? "bg-violet-900/20 border-violet-600/40 text-violet-300"
            : `${theme.colors.background} ${theme.colors.border} ${theme.colors.text.muted} hover:text-white/70`
        }`}
      >
        {showLearnMore ? "▾" : "▸"} Why 8 Dimensions?
      </button>

      {showLearnMore && (
        <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <p className={`text-[11px] leading-relaxed ${theme.colors.text.muted}`}>
            The original Soul Sphere captures <em>what</em> you feel (Valence),{" "}
            <em>how energized</em> you are (Arousal), and <em>how connected</em>{" "}
            you feel (Connection). The Octonion extension adds four new
            dimensions for a richer emotional portrait:
          </p>

          <div className="space-y-1.5">
            {NEW_DIMENSIONS.map((dim) => (
              <div
                key={dim.symbol}
                className={`flex items-start gap-2 px-2 py-1.5 rounded ${dim.bgColor} border border-white/5`}
              >
                <span
                  className={`text-xs font-bold font-mono ${dim.color} flex-shrink-0 w-5 text-center`}
                >
                  {dim.symbol}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-medium ${dim.color}`}>
                      {dim.name}
                    </span>
                    <span className="text-[9px] text-gray-500">{dim.range}</span>
                  </div>
                  <p className="text-[10px] text-gray-400 leading-tight mt-0.5">
                    {dim.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="text-[10px] text-gray-500 italic">
            These 7 imaginary dimensions form an octonion on the 7-sphere (S⁷),
            enabling geometric interpolation (SLERP) for smooth emotional
            transitions.
          </p>
        </div>
      )}
    </div>
  );
}
