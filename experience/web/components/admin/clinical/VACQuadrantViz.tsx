/**
 * VAC Quadrant Visualization Component
 *
 * 2D plot showing Valence vs Arousal with quadrant labels
 */

"use client";

import type { VAC } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface VACQuadrantVizProps {
  vac: VAC;
}

export function VACQuadrantViz({ vac }: VACQuadrantVizProps) {
  const theme = useAdminTheme();
  // Normalize VAC values from [-1, 1] to [0, 100] for positioning
  const normalizeToPercent = (value: number) => ((value + 1) / 2) * 100;

  const x = normalizeToPercent(vac.valence);
  const y = 100 - normalizeToPercent(vac.arousal); // Invert Y for screen coordinates

  // Determine quadrant
  const getQuadrant = () => {
    if (vac.valence > 0 && vac.arousal > 0) {
      return { name: "IV", label: "Excited/Joyful", color: "text-green-400" };
    } else if (vac.valence < 0 && vac.arousal > 0) {
      return { name: "III", label: "Anxious/Angry", color: "text-red-400" };
    } else if (vac.valence < 0 && vac.arousal < 0) {
      return { name: "II", label: "Sad/Depressed", color: "text-blue-400" };
    } else {
      return { name: "I", label: "Calm/Content", color: "text-purple-400" };
    }
  };

  const quadrant = getQuadrant();

  return (
    <div className={`rounded-lg p-4 border border-purple-500/30 ${theme.colors.background}`}>
      <div className="text-sm text-purple-300 mb-2 font-semibold">VAC Analysis</div>

      {/* 2D Plot */}
      <div
        className={`relative w-full aspect-square rounded border ${theme.colors.background} ${theme.colors.border}`}
      >
        {/* Quadrant backgrounds */}
        <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
          <div className="border-r border-b border-gray-600 bg-purple-500/5"></div>
          <div className="border-b border-gray-600 bg-green-500/5"></div>
          <div className="border-r border-gray-600 bg-blue-500/5"></div>
          <div className="bg-red-500/5"></div>
        </div>

        {/* Axis labels */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Top (Arousal +) */}
          <div
            className={`absolute top-1 left-1/2 -translate-x-1/2 text-xs ${theme.colors.text.muted}`}
          >
            A+
          </div>
          {/* Bottom (Arousal -) */}
          <div
            className={`absolute bottom-1 left-1/2 -translate-x-1/2 text-xs ${theme.colors.text.muted}`}
          >
            A-
          </div>
          {/* Left (Valence -) */}
          <div
            className={`absolute left-1 top-1/2 -translate-y-1/2 text-xs ${theme.colors.text.muted}`}
          >
            V-
          </div>
          {/* Right (Valence +) */}
          <div
            className={`absolute right-1 top-1/2 -translate-y-1/2 text-xs ${theme.colors.text.muted}`}
          >
            V+
          </div>
        </div>

        {/* Center crosshair */}
        <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-600"></div>
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600"></div>

        {/* Data point */}
        <div
          className="absolute w-3 h-3 -ml-1.5 -mt-1.5 rounded-full bg-purple-500 border-2 border-white shadow-lg shadow-purple-500/50 animate-pulse"
          style={{
            left: `${x}%`,
            top: `${y}%`,
          }}
        >
          <div
            className={`absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-white px-1.5 py-0.5 rounded border border-purple-500 ${theme.colors.background}`}
          >
            ({vac.valence.toFixed(2)}, {vac.arousal.toFixed(2)})
          </div>
        </div>
      </div>

      {/* Quadrant Info */}
      <div className="mt-3 space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className={theme.colors.text.muted}>Quadrant {quadrant.name}</span>
          <span className={`font-semibold ${quadrant.color}`}>{quadrant.label}</span>
        </div>

        {/* Connection value */}
        <div className="flex justify-between items-center text-xs">
          <span className={theme.colors.text.muted}>Connection</span>
          <span
            className={`font-mono ${
              vac.connection > 0.5
                ? "text-green-400"
                : vac.connection < -0.5
                  ? "text-red-400"
                  : theme.colors.text.secondary
            }`}
          >
            {vac.connection.toFixed(2)}
          </span>
        </div>

        {/* Connection bar */}
        <div className={`h-1.5 rounded-full overflow-hidden ${theme.colors.background}`}>
          <div
            className={`h-full ${vac.connection > 0 ? "bg-green-500" : "bg-red-500"}`}
            style={{ width: `${Math.abs(vac.connection) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
