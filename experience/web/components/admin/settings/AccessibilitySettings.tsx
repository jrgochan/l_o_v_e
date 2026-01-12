/**
 * Accessibility Settings Component
 *
 * Controls for motion, visual, and accessibility preferences
 */

"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function AccessibilitySettings() {
  const settings = useSettingsStore();

  return (
    <div className="space-y-8">
      {/* Motion Preferences */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Motion Preferences</h2>
        <div>
          <Toggle
            checked={settings.reducedMotion}
            onChange={(checked) => settings.updateAccessibilitySetting("reducedMotion", checked)}
            leftLabel="Full Motion"
            rightLabel="Reduced Motion"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">
            Minimize animations for motion sensitivity (respects system preferences)
          </p>
        </div>

        {settings.reducedMotion && (
          <div className="mt-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="text-sm text-gray-300">
              <strong className="text-yellow-300">Reduced Motion Active:</strong> All non-essential
              animations are disabled. Transitions become instant, and particle effects are
              minimized.
            </div>
          </div>
        )}
      </section>

      {/* Visual Settings */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Visual Preferences</h2>
        <div>
          <Toggle
            checked={settings.highContrast}
            onChange={(checked) => settings.updateAccessibilitySetting("highContrast", checked)}
            leftLabel="Normal Contrast"
            rightLabel="High Contrast"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">Increase contrast for better visibility</p>
        </div>
      </section>

      {/* Font Size */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Font Size</h2>
        <p className="text-sm text-gray-400 mb-4">Adjust text size for readability</p>

        <div className="grid grid-cols-3 gap-3">
          {[
            { value: "small", label: "Small", desc: "12-14px" },
            { value: "medium", label: "Medium", desc: "14-16px (default)" },
            { value: "large", label: "Large", desc: "16-18px" },
          ].map((size) => (
            <button
              key={size.value}
              onClick={() => {
                settings.updateAccessibilitySetting(
                  "fontSize",
                  size.value as "small" | "medium" | "large"
                );
              }}
              className={`p-4 rounded-lg border-2 transition ${
                settings.fontSize === size.value
                  ? "bg-cyan-900/30 border-cyan-500"
                  : "bg-gray-800 border-gray-700 hover:border-gray-600"
              }`}
            >
              <div className="font-medium text-white">{size.label}</div>
              <div className="text-xs text-gray-400 mt-1">{size.desc}</div>
            </button>
          ))}
        </div>
      </section>

      {/* Screen Reader Support */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Screen Reader</h2>
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-300">
            <p className="mb-2">
              <strong className="text-blue-300">ARIA labels and semantic HTML</strong> are included
              throughout the application for screen reader compatibility.
            </p>
            <ul className="space-y-1 ml-4">
              <li>• All interactive elements have descriptive labels</li>
              <li>• Live regions announce dynamic updates</li>
              <li>• Proper role assignments for UI components</li>
              <li>• Keyboard navigation fully supported</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Keyboard Navigation */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Keyboard Navigation</h2>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-300 space-y-2">
            <p className="font-semibold text-white mb-2">Full keyboard support:</p>
            <ul className="space-y-1 ml-4">
              <li>
                • <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Tab</kbd> - Navigate
                between controls
              </li>
              <li>
                • <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Enter</kbd> /{" "}
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Space</kbd> - Activate
                buttons and toggles
              </li>
              <li>
                • <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Arrow</kbd> keys - Navigate
                within components
              </li>
              <li>
                • <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Escape</kbd> - Close modals
                and overlays
              </li>
              <li>
                • <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">?</kbd> - Show keyboard
                shortcuts
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Color Contrast */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Color Contrast</h2>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="text-sm text-gray-300">
            <p className="mb-2">
              <strong className="text-white">WCAG AA Compliance:</strong>
            </p>
            <ul className="space-y-1 ml-4">
              <li>• All text: Minimum 4.5:1 contrast ratio</li>
              <li>• Interactive elements: Minimum 3:1 contrast</li>
              <li>• Focus indicators: High contrast borders</li>
              <li>• Color is never the only indicator of state</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
