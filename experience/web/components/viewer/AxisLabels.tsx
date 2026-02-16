/**
 * Axis Labels Component
 *
 * Displays VAC axis labels as HTML overlays on the Soul Sphere canvas.
 * Helps users understand which direction represents Valence, Arousal, and Connection.
 */

"use client";

import { useSettingsStore } from "@/stores/useSettingsStore";

export function AxisLabels() {
  const showAxisLabels = useSettingsStore((state) => state.showAxisLabels);

  if (!showAxisLabels) return null;

  return (
    <div
      className="absolute inset-0 pointer-events-none select-none"
      aria-label="VAC Coordinate System Labels"
    >
      {/* Valence Axis - Horizontal (X) */}
      <div className="absolute right-4 top-1/2 -translate-y-1/2">
        <AxisLabel
          axis="V+"
          description="Positive"
          color="cyan"
          tooltip="Valence: Pleasant, positive emotions"
        />
      </div>

      <div className="absolute left-4 top-1/2 -translate-y-1/2">
        <AxisLabel
          axis="V−"
          description="Negative"
          color="red"
          tooltip="Valence: Unpleasant, negative emotions"
        />
      </div>

      {/* Arousal Axis - Vertical (Y) */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <AxisLabel
          axis="A+"
          description="Activated"
          color="yellow"
          tooltip="Arousal: High energy, stimulated"
        />
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2">
        <AxisLabel
          axis="A−"
          description="Calm"
          color="blue"
          tooltip="Arousal: Low energy, relaxed"
        />
      </div>

      {/* Connection Axis - Depth (Z) */}
      <div className="absolute bottom-4 right-4">
        <AxisLabel
          axis="C+"
          description="Connected"
          color="purple"
          tooltip="Connection: Feeling WITH, aligned"
        />
      </div>

      <div className="absolute top-4 left-4">
        <AxisLabel
          axis="C−"
          description="Separated"
          color="gray"
          tooltip="Connection: Feeling FOR/AT, disconnected"
        />
      </div>
    </div>
  );
}

interface AxisLabelProps {
  axis: string;
  description: string;
  color: "cyan" | "red" | "yellow" | "blue" | "purple" | "gray";
  tooltip: string;
}

function AxisLabel({ axis, description, color, tooltip }: AxisLabelProps) {
  const colorStyles = {
    cyan: "bg-cyan-500/20 border-cyan-400 text-cyan-300",
    red: "bg-red-500/20 border-red-400 text-red-300",
    yellow: "bg-yellow-500/20 border-yellow-400 text-yellow-300",
    blue: "bg-blue-500/20 border-blue-400 text-blue-300",
    purple: "bg-purple-500/20 border-purple-400 text-purple-300",
    gray: "bg-gray-500/20 border-gray-400 text-gray-300",
  };

  return (
    <div
      className={`
        ${colorStyles[color]}
        border rounded-full px-3 py-1.5
        backdrop-blur-sm
        transition-all duration-300
        hover:scale-110 hover:bg-opacity-30
        cursor-help
      `}
      title={tooltip}
      role="img"
      aria-label={tooltip}
    >
      <span className="font-semibold text-sm">{axis}</span>
      <span className="text-xs opacity-70 ml-1.5">{description}</span>
    </div>
  );
}
