/**
 * Visual Settings Component
 *
 * Controls for visual appearance: animation modes, colors, sizes, etc.
 */

"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useSettingsStore } from "@/stores/useSettingsStore";
import type { PathAnimationMode } from "@/types/atlas-admin";

type ColorScheme = "category" | "valence" | "arousal" | "connection";

export function VisualSettings() {
  const settings = useSettingsStore();

  return (
    <div className="space-y-8">
      {/* Path Animation Mode */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Visual Mode</h2>
        <p className="text-sm text-gray-400 mb-4">
          Choose the visual identity for emotions - affects materials, colors, lighting, and
          animations. Press &apos;M&apos; to cycle.
        </p>
        <div className="space-y-3">
          {[
            {
              value: "subtle" as PathAnimationMode,
              emoji: "🧘",
              name: "Subtle - Clinical Clarity",
              desc: "Professional, therapeutic. Matte materials, desaturated colors, gentle animations. Perfect for clinical work.",
              features: "Bright even lighting • Minimal effects • Clear visibility",
            },
            {
              value: "dynamic" as PathAnimationMode,
              emoji: "⚡",
              name: "Dynamic - Living Energy",
              desc: "Vibrant, expressive. Glossy metallic, saturated colors, energetic motion. For exploration and engagement.",
              features: "Colored lighting • Particle effects • High energy",
            },
            {
              value: "mystical" as PathAnimationMode,
              emoji: "🌌",
              name: "Mystical - Cosmic Consciousness",
              desc: "Ethereal, spiritual. Translucent glass, glowing auras, floating motion. For meditation and reflection.",
              features: "Soft ambient light • Heavy bloom • Multi-layer spheres",
            },
          ].map((mode) => (
            <button
              key={mode.value}
              onClick={() => settings.updateVisualSetting("pathAnimationMode", mode.value)}
              className={`w-full text-left p-4 rounded-lg border-2 transition ${settings.pathAnimationMode === mode.value
                  ? "bg-cyan-900/30 border-cyan-500 shadow-lg shadow-cyan-500/20"
                  : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl mt-1">{mode.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-white mb-1">{mode.name}</div>
                  <div className="text-sm text-gray-300 mb-2">{mode.desc}</div>
                  <div className="text-xs text-gray-500 italic">{mode.features}</div>
                </div>
                {settings.pathAnimationMode === mode.value && (
                  <div className="text-cyan-400 text-xl flex-shrink-0">✓</div>
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Color Scheme */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Color Scheme</h2>
        <p className="text-sm text-gray-400 mb-4">How emotions are colored in the visualization</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              value: "category" as ColorScheme,
              name: "By Category",
              desc: "13 psychological categories",
            },
            {
              value: "valence" as ColorScheme,
              name: "By Valence",
              desc: "Red (negative) → Green (positive)",
            },
            {
              value: "arousal" as ColorScheme,
              name: "By Arousal",
              desc: "Blue (low) → Red (high)",
            },
            {
              value: "connection" as ColorScheme,
              name: "By Connection",
              desc: "Purple (withdrawal) → Yellow (openness)",
            },
          ].map((scheme) => (
            <button
              key={scheme.value}
              onClick={() => settings.updateVisualSetting("colorScheme", scheme.value)}
              className={`p-4 rounded-lg border-2 transition text-left ${settings.colorScheme === scheme.value
                  ? "bg-cyan-900/30 border-cyan-500"
                  : "bg-gray-800 border-gray-700 hover:border-gray-600"
                }`}
            >
              <div className="font-medium text-white">{scheme.name}</div>
              <div className="text-xs text-gray-400 mt-1">{scheme.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Visual Options */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Visual Options</h2>
        <div className="space-y-4">
          <Toggle
            checked={settings.showMotionIndicators}
            onChange={(checked) => settings.updateVisualSetting("showMotionIndicators", checked)}
            leftLabel="Motion Indicators Off"
            rightLabel="Motion Indicators On"
          />
          <p className="text-sm text-gray-400 -mt-2 ml-1">
            Show orbital/reaching/recoil/stable rings around emotions
          </p>

          <Toggle
            checked={settings.showAxisLabels}
            onChange={(checked) => settings.updateVisualSetting("showAxisLabels", checked)}
            leftLabel="Axis Labels Off"
            rightLabel="Axis Labels On"
          />
          <p className="text-sm text-gray-400 -mt-2 ml-1">
            Show V (Valence), A (Arousal), and C (Connection) axis labels on Soul Sphere
          </p>

          <Toggle
            checked={settings.enableAnimations}
            onChange={(checked) => settings.updateVisualSetting("enableAnimations", checked)}
            leftLabel="Animations Off"
            rightLabel="Animations On"
          />
          <p className="text-sm text-gray-400 -mt-2 ml-1">
            Enable smooth animations and transitions
          </p>

          <Toggle
            checked={settings.dataVisualizationMode}
            onChange={(checked) => settings.updateVisualSetting("dataVisualizationMode", checked)}
            leftLabel="Normal View"
            rightLabel="Data Viz Mode"
          />
          <p className="text-sm text-gray-400 -mt-2 ml-1">
            Show all emotions in grid layout (also toggle with &apos;D&apos; key)
          </p>
        </div>
      </section>

      {/* Display Sizes */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Display Sizes</h2>

        <div className="space-y-6">
          {/* Path Opacity */}
          <div>
            <label className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Path Opacity</span>
              <span className="font-mono text-white">
                {(settings.pathOpacity * 100).toFixed(0)}%
              </span>
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.pathOpacity}
              onChange={(e) =>
                settings.updateVisualSetting("pathOpacity", parseFloat(e.target.value))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>

          {/* Emotion Size */}
          <div>
            <label className="flex justify-between text-sm text-gray-300 mb-2">
              <span>Emotion Size</span>
              <span className="font-mono text-white">{settings.emotionSize.toFixed(1)}x</span>
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.emotionSize}
              onChange={(e) =>
                settings.updateVisualSetting("emotionSize", parseFloat(e.target.value))
              }
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
          </div>
        </div>
      </section>
    </div>
  );
}
