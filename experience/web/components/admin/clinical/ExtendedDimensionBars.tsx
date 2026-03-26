/**
 * Extended Dimension Bars — Compact octonion dimension visualization
 *
 * Renders the 4 extended dimensions (Depth, Coping, Velocity, Novelty) as
 * compact colored horizontal bars with labels. Reusable across:
 * - Session transcript (per-message)
 * - Multi-emotion table (expanded row)
 * - Fingerprint card (summary)
 *
 * Each bar goes from -1 (left) through 0 (center) to +1 (right),
 * with color indicating the dimension and fill showing magnitude/direction.
 */

"use client";

import type { ExtendedDimensions } from "@/types/chat";

interface DimensionConfig {
  key: keyof ExtendedDimensions;
  label: string;
  symbol: string;
  colorPositive: string;   // Tailwind bg class for positive fill
  colorNegative: string;   // Tailwind bg class for negative fill
  glowPositive: string;    // CSS shadow for positive glow
  glowNegative: string;    // CSS shadow for negative glow
  positiveLabel: string;
  negativeLabel: string;
}

const DIMENSIONS: DimensionConfig[] = [
  {
    key: "depth",
    label: "Depth",
    symbol: "D",
    colorPositive: "bg-amber-400",
    colorNegative: "bg-amber-700",
    glowPositive: "0 0 6px rgba(251, 191, 36, 0.5)",
    glowNegative: "0 0 6px rgba(180, 83, 9, 0.4)",
    positiveLabel: "Profound",
    negativeLabel: "Surface",
  },
  {
    key: "coping",
    label: "Coping",
    symbol: "P",
    colorPositive: "bg-emerald-400",
    colorNegative: "bg-rose-400",
    glowPositive: "0 0 6px rgba(52, 211, 153, 0.5)",
    glowNegative: "0 0 6px rgba(251, 113, 133, 0.5)",
    positiveLabel: "Empowered",
    negativeLabel: "Helpless",
  },
  {
    key: "velocity",
    label: "Velocity",
    symbol: "Ė",
    colorPositive: "bg-sky-400",
    colorNegative: "bg-indigo-400",
    glowPositive: "0 0 6px rgba(56, 189, 248, 0.5)",
    glowNegative: "0 0 6px rgba(129, 140, 248, 0.5)",
    positiveLabel: "Shifting",
    negativeLabel: "Frozen",
  },
  {
    key: "novelty",
    label: "Novelty",
    symbol: "N",
    colorPositive: "bg-violet-400",
    colorNegative: "bg-orange-400",
    glowPositive: "0 0 6px rgba(167, 139, 250, 0.5)",
    glowNegative: "0 0 6px rgba(251, 146, 60, 0.5)",
    positiveLabel: "Novel",
    negativeLabel: "Familiar",
  },
];

interface ExtendedDimensionBarsProps {
  extended: ExtendedDimensions;
  /** 'compact' = single row, 'full' = 2x2 grid with labels */
  layout?: "compact" | "full";
  /** Show numeric values */
  showValues?: boolean;
  /** Show tooltip labels on hover */
  showTooltips?: boolean;
  className?: string;
}

export function ExtendedDimensionBars({
  extended,
  layout = "compact",
  showValues = true,
  showTooltips = true,
  className = "",
}: ExtendedDimensionBarsProps) {
  if (layout === "compact") {
    return (
      <div className={`grid grid-cols-2 gap-x-3 gap-y-1 ${className}`}>
        {DIMENSIONS.map((dim) => {
          const value = extended[dim.key];
          return (
            <CompactBar
              key={dim.key}
              dim={dim}
              value={value}
              showValues={showValues}
              showTooltips={showTooltips}
            />
          );
        })}
      </div>
    );
  }

  // Full layout — vertical stack with richer labels
  return (
    <div className={`space-y-2 ${className}`}>
      {DIMENSIONS.map((dim) => {
        const value = extended[dim.key];
        return (
          <FullBar
            key={dim.key}
            dim={dim}
            value={value}
            showTooltips={showTooltips}
          />
        );
      })}
    </div>
  );
}

function CompactBar({
  dim,
  value,
  showValues,
  showTooltips,
}: {
  dim: DimensionConfig;
  value: number;
  showValues: boolean;
  showTooltips: boolean;
}) {
  const isPositive = value >= 0;
  const magnitude = Math.abs(value);
  const fillColor = isPositive ? dim.colorPositive : dim.colorNegative;
  const glow = isPositive ? dim.glowPositive : dim.glowNegative;

  return (
    <div
      className="flex items-center gap-1.5 group"
      title={showTooltips ? `${dim.label}: ${value >= 0 ? dim.positiveLabel : dim.negativeLabel} (${value >= 0 ? "+" : ""}${value.toFixed(2)})` : undefined}
    >
      {/* Symbol */}
      <span className="text-[10px] font-bold font-mono text-gray-400 w-3 text-right flex-shrink-0">
        {dim.symbol}
      </span>

      {/* Bar track */}
      <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative overflow-hidden min-w-[48px]">
        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-gray-600 z-10" />

        {/* Fill — from center outward */}
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-500 ease-out ${fillColor}`}
          style={{
            left: isPositive ? "50%" : `${50 - magnitude * 50}%`,
            width: `${magnitude * 50}%`,
            boxShadow: magnitude > 0.3 ? glow : "none",
          }}
        />
      </div>

      {/* Value */}
      {showValues && (
        <span
          className={`text-[10px] font-mono w-7 text-right flex-shrink-0 ${
            isPositive ? "text-gray-300" : "text-gray-400"
          }`}
        >
          {value >= 0 ? "+" : ""}
          {value.toFixed(1)}
        </span>
      )}
    </div>
  );
}

function FullBar({
  dim,
  value,
  showTooltips,
}: {
  dim: DimensionConfig;
  value: number;
  showTooltips: boolean;
}) {
  const isPositive = value >= 0;
  const magnitude = Math.abs(value);
  const fillColor = isPositive ? dim.colorPositive : dim.colorNegative;
  const glow = isPositive ? dim.glowPositive : dim.glowNegative;
  const interpretation =
    magnitude < 0.2
      ? "Neutral"
      : magnitude < 0.5
        ? isPositive ? `Somewhat ${dim.positiveLabel.toLowerCase()}` : `Somewhat ${dim.negativeLabel.toLowerCase()}`
        : isPositive ? dim.positiveLabel : dim.negativeLabel;

  return (
    <div
      className="space-y-1"
      title={showTooltips ? `${dim.label}: ${interpretation}` : undefined}
    >
      {/* Labels */}
      <div className="flex items-center justify-between text-[10px]">
        <div className="flex items-center gap-1.5">
          <span className="font-bold font-mono text-gray-400">{dim.symbol}</span>
          <span className="text-gray-300 font-medium">{dim.label}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-gray-500 italic">{interpretation}</span>
          <span className={`font-mono font-semibold ${isPositive ? "text-gray-200" : "text-gray-400"}`}>
            {value >= 0 ? "+" : ""}{value.toFixed(2)}
          </span>
        </div>
      </div>

      {/* Bar track */}
      <div className="h-2 bg-gray-800 rounded-full relative overflow-hidden">
        {/* Endpoint labels */}
        <span className="absolute left-0.5 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 z-10 pointer-events-none">
          {dim.negativeLabel[0]}
        </span>
        <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-[7px] text-gray-600 z-10 pointer-events-none">
          {dim.positiveLabel[0]}
        </span>

        {/* Center line */}
        <div className="absolute left-1/2 top-0 w-px h-full bg-gray-600 z-10" />

        {/* Fill */}
        <div
          className={`absolute top-0 h-full rounded-full transition-all duration-700 ease-out ${fillColor}`}
          style={{
            left: isPositive ? "50%" : `${50 - magnitude * 50}%`,
            width: `${magnitude * 50}%`,
            boxShadow: magnitude > 0.3 ? glow : "none",
          }}
        />
      </div>
    </div>
  );
}

export { DIMENSIONS };
export type { DimensionConfig };
