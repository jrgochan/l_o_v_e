/**
 * Animation Mode Selector Component
 *
 * Path animation mode selection with visual styles:
 * - Subtle Elegant (default therapeutic calm)
 * - Dynamic Playful (energetic flow)
 * - Mystical Ethereal (quantum dreams)
 *
 * Keyboard shortcut: M to cycle through modes
 */

"use client";

import type { PathAnimationMode } from "@/types/atlas-admin";

interface AnimationModeSelectorProps {
  currentMode: PathAnimationMode;
  onModeChange: (mode: PathAnimationMode) => void;
}

/**
 * Renders animation mode selector buttons
 */
export function AnimationModeSelector({ currentMode, onModeChange }: AnimationModeSelectorProps) {
  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-400 mb-2">
        Path Animation <span className="text-xs text-gray-500">(Press M)</span>
      </h2>
      <div className="space-y-2">
        <button
          onClick={() => onModeChange("subtle")}
          className={`w-full px-3 py-2 rounded text-left text-sm transition ${
            currentMode === "subtle"
              ? "bg-blue-600 text-white ring-2 ring-blue-400"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">😌 Subtle Elegant</span>
            {currentMode === "subtle" && <span className="text-xs">✓</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Therapeutic calm • Default</div>
        </button>

        <button
          onClick={() => onModeChange("dynamic")}
          className={`w-full px-3 py-2 rounded text-left text-sm transition ${
            currentMode === "dynamic"
              ? "bg-orange-600 text-white ring-2 ring-orange-400"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">😊 Dynamic Playful</span>
            {currentMode === "dynamic" && <span className="text-xs">✓</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Engaging flow • Energetic</div>
        </button>

        <button
          onClick={() => onModeChange("mystical")}
          className={`w-full px-3 py-2 rounded text-left text-sm transition ${
            currentMode === "mystical"
              ? "bg-purple-600 text-white ring-2 ring-purple-400"
              : "bg-gray-800 text-gray-300 hover:bg-gray-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="font-medium">🔮 Mystical Ethereal</span>
            {currentMode === "mystical" && <span className="text-xs">✓</span>}
          </div>
          <div className="text-xs text-gray-400 mt-0.5">Quantum dreams • Magical</div>
        </button>
      </div>
    </section>
  );
}
