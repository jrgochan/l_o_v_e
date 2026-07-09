/**
 * Emotional Fingerprint Radar — 7-axis SVG radar chart
 *
 * Renders all 7 emotional dimensions (V, A, C, D, P, Ė, N) as a
 * heptagonal radar chart with:
 * - Pulsing active axes (magnitude > 0.3)
 * - Gradient fill area
 * - Animated transitions
 * - Compact or full layout
 */

"use client";

import { useMemo, useId } from "react";
import type { VAC, ExtendedDimensions } from "@/types/chat";

interface RadarAxis {
  key: string;
  label: string;
  symbol: string;
  value: number;
  color: string; // Hex color for the axis
  glowColor: string; // Glow hex
}

interface EmotionalFingerprintProps {
  vac: VAC;
  extended?: ExtendedDimensions;
  /** Size in pixels */
  size?: number;
  /** Show labels around the chart */
  showLabels?: boolean;
  /** Show numeric values */
  showValues?: boolean;
  /** Animate on mount */
  animated?: boolean;
  className?: string;
}

export function EmotionalFingerprint({
  vac,
  extended,
  size = 200,
  showLabels = true,
  showValues = true,
  animated = true,
  className = "",
}: EmotionalFingerprintProps) {
  const axes: RadarAxis[] = useMemo(
    () => [
      {
        key: "valence",
        label: "Valence",
        symbol: "V",
        value: vac.valence,
        color: "#34d399",
        glowColor: "#34d399",
      },
      {
        key: "arousal",
        label: "Arousal",
        symbol: "A",
        value: vac.arousal,
        color: "#f97316",
        glowColor: "#f97316",
      },
      {
        key: "connection",
        label: "Connection",
        symbol: "C",
        value: vac.connection,
        color: "#38bdf8",
        glowColor: "#38bdf8",
      },
      {
        key: "depth",
        label: "Depth",
        symbol: "D",
        value: extended?.depth ?? 0,
        color: "#fbbf24",
        glowColor: "#fbbf24",
      },
      {
        key: "coping",
        label: "Coping",
        symbol: "P",
        value: extended?.coping ?? 0,
        color: "#4ade80",
        glowColor: "#4ade80",
      },
      {
        key: "velocity",
        label: "Velocity",
        symbol: "Ė",
        value: extended?.velocity ?? 0,
        color: "#818cf8",
        glowColor: "#818cf8",
      },
      {
        key: "novelty",
        label: "Novelty",
        symbol: "N",
        value: extended?.novelty ?? 0,
        color: "#a78bfa",
        glowColor: "#a78bfa",
      },
    ],
    [vac, extended]
  );

  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size * 0.38; // Leave room for labels
  const angleStep = (2 * Math.PI) / axes.length;
  const startAngle = -Math.PI / 2; // Start at top

  // Generate polygon points for a given radius
  const getPolygonPoints = (radius: number) =>
    axes
      .map((_, i) => {
        const angle = startAngle + i * angleStep;
        const x = cx + radius * Math.cos(angle);
        const y = cy + radius * Math.sin(angle);
        return `${x},${y}`;
      })
      .join(" ");

  // Generate the data polygon (values mapped to radius)
  const dataPoints = axes.map((axis, i) => {
    const angle = startAngle + i * angleStep;
    // Map [-1, 1] to [0, maxRadius]. We use abs value for radius, but keep direction info
    const normalizedRadius = ((axis.value + 1) / 2) * maxRadius;
    const x = cx + normalizedRadius * Math.cos(angle);
    const y = cy + normalizedRadius * Math.sin(angle);
    return { x, y, axis, angle };
  });

  const dataPolygonPoints = dataPoints.map((p) => `${p.x},${p.y}`).join(" ");

  // Unique ID for gradients (deterministic, SSR-safe)
  const reactId = useId();
  const gradientId = `radar-grad-${reactId}`;
  const glowFilterId = `radar-glow-${reactId}`;

  return (
    <div className={`relative ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="overflow-visible">
        <defs>
          {/* Radial gradient for the data area */}
          <radialGradient id={gradientId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.3" />
            <stop offset="70%" stopColor="#6366f1" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </radialGradient>

          {/* Glow filter */}
          <filter id={glowFilterId} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1.0].map((fraction) => (
          <polygon
            key={fraction}
            points={getPolygonPoints(maxRadius * fraction)}
            fill="none"
            stroke="#374151"
            strokeWidth={fraction === 0.5 ? "0.8" : "0.4"}
            strokeDasharray={fraction === 0.5 ? "4 2" : "none"}
            opacity={fraction === 0.5 ? "0.8" : "0.4"}
          />
        ))}

        {/* Axis lines */}
        {axes.map((axis, i) => {
          const angle = startAngle + i * angleStep;
          const x2 = cx + maxRadius * Math.cos(angle);
          const y2 = cy + maxRadius * Math.sin(angle);
          const isActive = Math.abs(axis.value) > 0.3;
          return (
            <line
              key={axis.key}
              x1={cx}
              y1={cy}
              x2={x2}
              y2={y2}
              stroke={isActive ? axis.color : "#4b5563"}
              strokeWidth={isActive ? "1" : "0.5"}
              opacity={isActive ? "0.7" : "0.3"}
            />
          );
        })}

        {/* Center dot */}
        <circle cx={cx} cy={cy} r="2" fill="#6b7280" opacity="0.5" />

        {/* Zero ring (the 50% ring represents 0) — subtle highlight */}
        <polygon
          points={getPolygonPoints(maxRadius * 0.5)}
          fill="none"
          stroke="#6b7280"
          strokeWidth="0.6"
          opacity="0.5"
        />

        {/* Data polygon fill */}
        <polygon
          points={dataPolygonPoints}
          fill={`url(#${gradientId})`}
          stroke="none"
          className={animated ? "animate-[fadeIn_0.8s_ease-out]" : ""}
        />

        {/* Data polygon outline */}
        <polygon
          points={dataPolygonPoints}
          fill="none"
          stroke="#8b5cf6"
          strokeWidth="1.5"
          strokeLinejoin="round"
          opacity="0.8"
          filter={`url(#${glowFilterId})`}
          className={animated ? "animate-[fadeIn_0.6s_ease-out]" : ""}
        />

        {/* Data points */}
        {dataPoints.map((point) => {
          const isActive = Math.abs(point.axis.value) > 0.3;
          const isStrong = Math.abs(point.axis.value) > 0.6;
          return (
            <g key={point.axis.key}>
              {/* Glow behind active points */}
              {isActive && (
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isStrong ? 5 : 3.5}
                  fill={point.axis.color}
                  opacity="0.2"
                  className={isStrong ? "animate-pulse" : ""}
                />
              )}
              {/* Point */}
              <circle
                cx={point.x}
                cy={point.y}
                r={isActive ? 3 : 2}
                fill={isActive ? point.axis.color : "#6b7280"}
                stroke={isActive ? "#fff" : "#4b5563"}
                strokeWidth={isActive ? "1" : "0.5"}
                className={animated ? "animate-[scaleIn_0.5s_ease-out]" : ""}
              />
            </g>
          );
        })}
      </svg>

      {/* Labels (positioned outside the SVG for crisp text) */}
      {showLabels &&
        axes.map((axis, i) => {
          const angle = startAngle + i * angleStep;
          const labelRadius = maxRadius + (showValues ? 28 : 18);
          const x = cx + labelRadius * Math.cos(angle);
          const y = cy + labelRadius * Math.sin(angle);
          const isActive = Math.abs(axis.value) > 0.3;

          return (
            <div
              key={axis.key}
              className="absolute pointer-events-none"
              style={{
                left: x,
                top: y,
                transform: "translate(-50%, -50%)",
              }}
            >
              <div
                className={`text-center whitespace-nowrap ${isActive ? "opacity-100" : "opacity-50"}`}
              >
                <div
                  className="text-[10px] font-bold font-mono"
                  style={{ color: isActive ? axis.color : "#6b7280" }}
                >
                  {axis.symbol}
                </div>
                {showValues && (
                  <div className="text-[9px] font-mono text-gray-400">
                    {axis.value >= 0 ? "+" : ""}
                    {axis.value.toFixed(1)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}
