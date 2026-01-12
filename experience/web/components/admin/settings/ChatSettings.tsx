/**
 * Chat Settings Component
 *
 * Controls for chat behavior and defaults
 */

"use client";

import { Toggle } from "@/components/ui/Toggle";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function ChatSettings() {
  const settings = useSettingsStore();

  return (
    <div className="space-y-8">
      {/* Default Modes */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Default Response Style</h2>
        <p className="text-sm text-gray-400 mb-4">Choose the default tone for new chat sessions</p>

        <div>
          <Toggle
            checked={settings.defaultToneMode === "clinical"}
            onChange={(checked) =>
              settings.updateChatSetting("defaultToneMode", checked ? "clinical" : "warm")
            }
            leftLabel="💗 Warm"
            rightLabel="🔬 Clinical"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="bg-pink-900/20 border border-pink-500/30 rounded-lg p-4">
            <div className="font-semibold text-pink-300 mb-2">💗 Warm Mode</div>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Empathetic responses</li>
              <li>• Emotional support</li>
              <li>• Gentle guidance</li>
              <li>• Personal growth focus</li>
            </ul>
          </div>

          <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
            <div className="font-semibold text-blue-300 mb-2">🔬 Clinical Mode</div>
            <ul className="text-sm text-gray-300 space-y-1">
              <li>• Evidence-based language</li>
              <li>• Biomarker analysis</li>
              <li>• Research citations</li>
              <li>• Clinical documentation</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Deep Feeling Mode */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Deep Feeling Analysis</h2>
        <div>
          <Toggle
            checked={settings.defaultDeepFeeling}
            onChange={(checked) => settings.updateChatSetting("defaultDeepFeeling", checked)}
            leftLabel="Single Emotion"
            rightLabel="Deep Feeling (Multi)"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">
            Default to multi-emotion analysis with relationship detection (slower but richer)
          </p>
        </div>

        <div className="mt-4 bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
          <div className="text-sm text-gray-300">
            <strong className="text-purple-300">Deep Feeling Mode</strong> analyzes multiple
            emotions simultaneously, detects relationships (complementary, contradictory, masking),
            and provides aggregate emotional state. Takes 20-45 seconds per analysis.
          </div>
        </div>
      </section>

      {/* Behavior */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Chat Behavior</h2>
        <div>
          <Toggle
            checked={settings.autoFocusEmotions}
            onChange={(checked) => settings.updateChatSetting("autoFocusEmotions", checked)}
            leftLabel="Manual Add"
            rightLabel="Auto-Focus Emotions"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">
            Automatically add detected emotions to the Soul Sphere
          </p>
        </div>
      </section>

      {/* Keyboard Shortcuts */}
      <section>
        <h2 className="text-lg font-semibold text-white mb-4">Keyboard Shortcuts</h2>
        <div>
          <Toggle
            checked={settings.enableKeyboardShortcuts}
            onChange={(checked) => settings.updateChatSetting("enableKeyboardShortcuts", checked)}
            leftLabel="Disabled"
            rightLabel="Enabled"
          />
          <p className="text-sm text-gray-400 mt-2 ml-1">
            Use keyboard for navigation and control (press &apos;H&apos; to view all shortcuts)
          </p>
        </div>

        {settings.enableKeyboardShortcuts && (
          <div className="mt-4 bg-gray-800 rounded-lg p-4">
            <div className="text-sm font-semibold text-gray-300 mb-2">Key Shortcuts</div>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-400">
              <div>D: Data Viz Mode</div>
              <div>F: Focus Mode</div>
              <div>M: Animation Mode</div>
              <div>O: Motion Indicators</div>
              <div>B: Bridge Emotions</div>
              <div>H: Help</div>
              <div>Space: Toggle Paths</div>
              <div>Esc: Clear Selection</div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Press &apos;H&apos; in the atlas for complete list
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
