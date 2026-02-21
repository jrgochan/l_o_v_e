/**
 * VAC Axis Labels 3D Component
 *
 * Displays V, A, C axis labels inside the WebGL environment using React Three Drei's Html component.
 * Labels are positioned at the ends of each axis in 3D space for accurate placement.
 */

"use client";

import { Html } from "@react-three/drei";
import { useSettingsStore } from "@/stores/useSettingsStore";

export function VACAxisLabels3D() {
  const showAxisLabels = useSettingsStore((state) => state.showAxisLabels);

  if (!showAxisLabels) return null;

  // Sphere radius is 1.5, position labels at 2.2 units from center
  const labelDistance = 2.2;

  return (
    <>
      {/* Valence Axis - X axis (horizontal) */}
      <Html
        position={[labelDistance, 0, 0]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <AxisLabel3D
          axis="V+"
          description="Positive"
          color="teal"
          tooltip="Valence: Pleasant, positive emotions"
        />
      </Html>

      <Html
        position={[-labelDistance, 0, 0]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <AxisLabel3D
          axis="V−"
          description="Negative"
          color="rose"
          tooltip="Valence: Unpleasant, negative emotions"
        />
      </Html>

      {/* Arousal Axis - Y axis (vertical) */}
      <Html
        position={[0, labelDistance, 0]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <AxisLabel3D
          axis="A+"
          description="Activated"
          color="amber"
          tooltip="Arousal: High energy, stimulated"
        />
      </Html>

      <Html
        position={[0, -labelDistance, 0]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <AxisLabel3D
          axis="A−"
          description="Calm"
          color="indigo"
          tooltip="Arousal: Low energy, relaxed"
        />
      </Html>

      {/* Connection Axis - Z axis (depth) */}
      <Html
        position={[0, 0, labelDistance]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <AxisLabel3D
          axis="C+"
          description="Connected"
          color="purple"
          tooltip="Connection: Feeling WITH, aligned"
        />
      </Html>

      <Html
        position={[0, 0, -labelDistance]}
        center
        distanceFactor={6}
        zIndexRange={[100, 0]}
        occlude={false}
      >
        <AxisLabel3D
          axis="C−"
          description="Separated"
          color="slate"
          tooltip="Connection: Feeling FOR/AT, disconnected"
        />
      </Html>
    </>
  );
}

interface AxisLabel3DProps {
  axis: string;
  description: string;
  color: "teal" | "rose" | "amber" | "indigo" | "purple" | "slate";
  tooltip: string;
}

function AxisLabel3D({ axis, description, color, tooltip }: AxisLabel3DProps) {
  const colorStyles = {
    teal: "bg-teal-500/30 border-teal-400 text-teal-200",
    rose: "bg-rose-500/30 border-rose-400 text-rose-200",
    amber: "bg-amber-500/30 border-amber-400 text-amber-200",
    indigo: "bg-indigo-500/30 border-indigo-400 text-indigo-200",
    purple: "bg-purple-500/30 border-purple-400 text-purple-200",
    slate: "bg-slate-500/30 border-slate-400 text-slate-200",
  };

  return (
    <div
      className={`
        ${colorStyles[color]}
        border rounded-full px-1.5 py-0.5
        backdrop-blur-md
        transition-all duration-300
        hover:scale-110
        cursor-help
        whitespace-nowrap
        shadow-md
      `}
      title={tooltip}
      style={{
        pointerEvents: "auto",
      }}
    >
      <span className="font-medium text-[10px]">{axis}</span>
      <span className="text-[8px] opacity-80 ml-0.5">{description}</span>
    </div>
  );
}
