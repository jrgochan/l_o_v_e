/**
 * Behavior Settings Component
 *
 * Controls for application behavior: paths, focus mode, layer visibility
 */

"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function BehaviorSettings() {
  const settings = useSettingsStore();

  return (
    <div className="space-y-8">
      {/* Path Computation */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Path Computation Mode</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            {[
              {
                value: "always" as const,
                label: "🟢 Always Compute",
                desc: "Fresh calculations every time",
              },
              {
                value: "cache-first" as const,
                label: "🟡 Cache First",
                desc: "Fast & efficient (recommended)",
              },
              {
                value: "manual" as const,
                label: "🔴 Manual Only",
                desc: "No automatic computation",
              },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => settings.updateBehaviorSetting("computeMode", option.value)}
                className={`flex-1 p-3 rounded-lg border-2 transition ${
                  settings.computeMode === option.value
                    ? "border-cyan-500 bg-cyan-500/10 text-white"
                    : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-600"
                }`}
              >
                <div className="text-left">
                  <div className="font-semibold text-sm">{option.label}</div>
                  <div className="text-xs opacity-70 mt-1">{option.desc}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="text-xs text-gray-500 space-y-1 bg-gray-800/30 rounded p-3">
            <p>
              <strong className="text-green-400">Always Compute:</strong> Freshly calculates every
              path (slower but always current)
            </p>
            <p>
              <strong className="text-yellow-400">Cache First:</strong> Uses cached paths when
              available, fetches from backend if needed (recommended - fast!)
            </p>
            <p>
              <strong className="text-red-400">Manual Only:</strong> No automatic computation (use
              Compute button manually)
            </p>
          </div>

          <div>
            <Toggle
              checked={settings.showAllPaths}
              onChange={(checked) => settings.updateBehaviorSetting("showAllPaths", checked)}
              leftLabel="Selected Pairs Only"
              rightLabel="Show All Paths"
            />
            <p className="text-sm text-gray-400 mt-2 ml-1">
              Show all computed paths vs only selected emotion pairs
            </p>
          </div>
        </div>
      </section>

      {/* Focus & Visibility */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Focus & Visibility</h2>
        <div>
          <Toggle
            checked={settings.focusMode}
            onChange={(checked) => settings.updateBehaviorSetting("focusMode", checked)}
            leftLabel="Show All"
            rightLabel="Focus Mode"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">
            Hide unselected emotions for clarity (also toggle with &apos;F&apos; key)
          </p>
        </div>
      </section>

      {/* Layer Visibility */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Layer Visibility</h2>
        <p className="text-sm text-gray-400 mb-4">
          Control which elements are visible in the 3D scene
        </p>
        <div className="grid grid-cols-2 gap-4">
          {[
            { key: "soulSphere" as const, label: "Soul Sphere" },
            { key: "emotionPoints" as const, label: "Emotion Points" },
            { key: "emotionLabels" as const, label: "Emotion Labels" },
            { key: "transitionPaths" as const, label: "Transition Paths" },
            { key: "waypoints" as const, label: "Waypoints" },
            { key: "bridgeHighlight" as const, label: "Bridge Highlight" },
            { key: "legend" as const, label: "Legend" },
          ].map((layer) => (
            <div key={layer.key}>
              <Toggle
                checked={settings.layers[layer.key]}
                onChange={(checked) => settings.updateLayer(layer.key, checked)}
                leftLabel="Hidden"
                rightLabel={layer.label}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
