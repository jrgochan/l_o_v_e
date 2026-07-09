/**
 * Animation Mode Selector — Compact Card Grid
 *
 * 3-column grid of mode cards. Each card shows icon + short name.
 * Active card gets colored ring + background. Tooltip shows description.
 * Keyboard shortcut: M to cycle through modes.
 *
 * Mode-reactive via useAdminTheme.
 */

"use client";

import type { PathAnimationMode } from "@/types/visualization";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface AnimationModeSelectorProps {
  currentMode: PathAnimationMode;
  onModeChange: (mode: PathAnimationMode) => void;
}

const MODES: {
  key: PathAnimationMode;
  icon: string;
  label: string;
  desc: string;
  activeRing: string;
  activeBg: string;
}[] = [
  {
    key: "subtle",
    icon: "😌",
    label: "Subtle",
    desc: "Therapeutic calm • Default mode",
    activeRing: "ring-blue-400/70",
    activeBg: "bg-blue-600/30",
  },
  {
    key: "dynamic",
    icon: "😊",
    label: "Dynamic",
    desc: "Engaging flow • Energetic",
    activeRing: "ring-orange-400/70",
    activeBg: "bg-orange-600/30",
  },
  {
    key: "mystical",
    icon: "🔮",
    label: "Mystical",
    desc: "Quantum dreams • Magical",
    activeRing: "ring-purple-400/70",
    activeBg: "bg-purple-600/30",
  },
  {
    key: "crystalline",
    icon: "💎",
    label: "Crystal",
    desc: "Structural clarity • Faceted",
    activeRing: "ring-cyan-400/70",
    activeBg: "bg-cyan-600/30",
  },
  {
    key: "luminous",
    icon: "✨",
    label: "Luminous",
    desc: "Energetic spirit • Glowing",
    activeRing: "ring-yellow-400/70",
    activeBg: "bg-yellow-600/30",
  },
  {
    key: "liquid",
    icon: "🌊",
    label: "Liquid",
    desc: "Deep immersion • Flowing",
    activeRing: "ring-blue-300/70",
    activeBg: "bg-blue-500/30",
  },
  {
    key: "glitch",
    icon: "👾",
    label: "Glitch",
    desc: "Digital reality • Chaotic",
    activeRing: "ring-green-400/70",
    activeBg: "bg-green-700/30",
  },
];

export function AnimationModeSelector({ currentMode, onModeChange }: AnimationModeSelectorProps) {
  const theme = useAdminTheme();

  return (
    <section>
      <h2
        className={`text-xs font-semibold uppercase tracking-wider mb-2 ${theme.colors.text.secondary}`}
      >
        🎨 Animation{" "}
        <span className={`text-[10px] ${theme.colors.text.muted} normal-case tracking-normal`}>
          Press M
        </span>
      </h2>
      <div className="grid grid-cols-3 gap-1.5">
        {MODES.map(({ key, icon, label, desc, activeRing, activeBg }) => {
          const isActive = currentMode === key;
          return (
            <button
              key={key}
              onClick={() => onModeChange(key)}
              title={desc}
              className={`
                flex flex-col items-center gap-0.5 px-1.5 py-2
                rounded-lg text-center transition-all duration-200
                border
                ${
                  isActive
                    ? `${activeBg} ${activeRing} ring-1 border-white/20 shadow-lg`
                    : `bg-black/20 border-white/5 ${theme.colors.text.muted} hover:bg-white/5 hover:border-white/10`
                }
              `}
            >
              <span className="text-base leading-none">{icon}</span>
              <span
                className={`text-[10px] font-medium leading-tight ${isActive ? "text-white" : ""}`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
