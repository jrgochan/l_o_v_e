/**
 * Simple Axis Labels Component
 *
 * Ultra-simple fixed-position labels at screen edges.
 * No 3D positioning - just plain HTML at canvas corners.
 */

"use client";

import { useSettingsStore } from "@/stores/useSettingsStore";

export function SimpleAxisLabels() {
  const showAxisLabels = useSettingsStore((state) => state.showAxisLabels);

  if (!showAxisLabels) return null;

  return (
    <div className="absolute inset-0 pointer-events-none z-50">
      {/* Right edge - V+ */}
      <div className="absolute right-8 top-1/2 -translate-y-1/2">
        <Label text="V+ Positive" color="cyan" />
      </div>

      {/* Left edge - V- */}
      <div className="absolute left-8 top-1/2 -translate-y-1/2">
        <Label text="V− Negative" color="red" />
      </div>

      {/* Top edge - A+ */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2">
        <Label text="A+ Activated" color="yellow" />
      </div>

      {/* Bottom edge - A- */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <Label text="A− Calm" color="blue" />
      </div>

      {/* Bottom-right - C+ */}
      <div className="absolute bottom-8 right-8">
        <Label text="C+ Connected" color="purple" />
      </div>

      {/* Top-left - C- */}
      <div className="absolute top-8 left-8">
        <Label text="C− Separated" color="gray" />
      </div>
    </div>
  );
}

function Label({ text, color }: { text: string; color: string }) {
  const colors: Record<string, string> = {
    cyan: "bg-cyan-500/40 border-cyan-400 text-cyan-100",
    red: "bg-red-500/40 border-red-400 text-red-100",
    yellow: "bg-yellow-500/40 border-yellow-400 text-yellow-100",
    blue: "bg-blue-500/40 border-blue-400 text-blue-100",
    purple: "bg-purple-500/40 border-purple-400 text-purple-100",
    gray: "bg-gray-500/40 border-gray-400 text-gray-100",
  };

  return (
    <div
      className={`
      ${colors[color]}
      px-1.5 py-0.5
      rounded-full
      border
      text-[10px]
      font-medium
      shadow-md
      backdrop-blur-sm
    `}
    >
      {text}
    </div>
  );
}
