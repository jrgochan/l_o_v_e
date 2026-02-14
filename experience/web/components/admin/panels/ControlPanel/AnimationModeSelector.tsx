/**
 * Animation Mode Selector Component
 *
 * Path animation mode selection with visual styles:
 * - Subtle Elegant (default therapeutic calm)
 * - Dynamic Playful (energetic flow)
 * - Mystical Ethereal (quantum dreams)
 * - Crystalline, Luminous, Liquid, Glitch
 *
 * Keyboard shortcut: M to cycle through modes
 * Mode-reactive via useAdminTheme — inactive button states adapt to current theme.
 */

"use client";

import type { PathAnimationMode } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface AnimationModeSelectorProps {
  currentMode: PathAnimationMode;
  onModeChange: (mode: PathAnimationMode) => void;
}

const MODES: { key: PathAnimationMode; icon: string; label: string; desc: string; activeColor: string }[] = [
  { key: "subtle", icon: "😌", label: "Subtle Elegant", desc: "Therapeutic calm • Default", activeColor: "bg-blue-600 ring-2 ring-blue-400" },
  { key: "dynamic", icon: "😊", label: "Dynamic Playful", desc: "Engaging flow • Energetic", activeColor: "bg-orange-600 ring-2 ring-orange-400" },
  { key: "mystical", icon: "🔮", label: "Mystical Ethereal", desc: "Quantum dreams • Magical", activeColor: "bg-purple-600 ring-2 ring-purple-400" },
  { key: "crystalline", icon: "💎", label: "Crystalline", desc: "Structural Clarity • Faceted", activeColor: "bg-cyan-600 ring-2 ring-cyan-400" },
  { key: "luminous", icon: "✨", label: "Luminous", desc: "Energetic Spirit • Glowing", activeColor: "bg-yellow-600 ring-2 ring-yellow-400" },
  { key: "liquid", icon: "🌊", label: "Liquid", desc: "Deep Immersion • Flowing", activeColor: "bg-blue-500 ring-2 ring-blue-300" },
  { key: "glitch", icon: "👾", label: "Glitch", desc: "Digital Reality • Chaotic", activeColor: "bg-green-700 ring-2 ring-green-500 font-mono" },
];

/**
 * Renders animation mode selector buttons
 */
export function AnimationModeSelector({ currentMode, onModeChange }: AnimationModeSelectorProps) {
  const theme = useAdminTheme();

  return (
    <section>
      <h2 className={`text-sm font-semibold mb-2 ${theme.colors.text.secondary}`}>
        Path Animation <span className={`text-xs ${theme.colors.text.muted}`}>(Press M)</span>
      </h2>
      <div className="space-y-2">
        {MODES.map(({ key, icon, label, desc, activeColor }) => (
          <button
            key={key}
            onClick={() => onModeChange(key)}
            className={`w-full px-3 py-2 ${theme.layout.borderRadius} text-left text-sm transition-all duration-300 ${
              currentMode === key
                ? `${activeColor} text-white`
                : `bg-black/20 border ${theme.colors.border} ${theme.colors.text.secondary} ${theme.colors.hover}`
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{icon} {label}</span>
              {currentMode === key && <span className="text-xs">✓</span>}
            </div>
            <div className={`text-xs mt-0.5 ${currentMode === key ? "text-white/70" : theme.colors.text.muted}`}>{desc}</div>
          </button>
        ))}
      </div>
    </section>
  );
}
