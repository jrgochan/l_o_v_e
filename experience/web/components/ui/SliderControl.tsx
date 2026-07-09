/**
 * SliderControl — Styled range slider with gradient fill
 *
 * Features:
 *   - Gradient-filled track (colored portion vs dark unfilled)
 *   - Double-click track to reset to default value
 *   - Integrated label + live numeric readout
 *   - Optional sub-label for state description
 *   - Consistent cross-browser styling
 */

"use client";

import { useCallback } from "react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface SliderControlProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  defaultValue?: number;
  onChange: (value: number) => void;
  /** CSS color for the filled portion of the track */
  accentColor?: string;
  /** Format function for the display value (e.g., "1.0x", "35%") */
  formatValue?: (value: number) => string;
  /** Optional description that changes with value */
  description?: string;
  className?: string;
}

export function SliderControl({
  label,
  value,
  min,
  max,
  step,
  defaultValue,
  onChange,
  accentColor = "#a78bfa",
  formatValue,
  description,
  className = "",
}: SliderControlProps) {
  const theme = useAdminTheme();

  // Percentage for gradient fill
  const pct = ((value - min) / (max - min)) * 100;

  const displayValue = formatValue ? formatValue(value) : value.toFixed(1);

  const handleDoubleClick = useCallback(() => {
    if (defaultValue !== undefined) {
      onChange(defaultValue);
    }
  }, [defaultValue, onChange]);

  return (
    <div className={`space-y-1 ${className}`}>
      {/* Label row */}
      <div className="flex justify-between items-center">
        <span className={`text-xs ${theme.colors.text.muted}`}>{label}</span>
        <span
          className="text-xs font-mono text-white/80 cursor-default"
          title={
            defaultValue !== undefined
              ? `Double-click slider to reset to ${formatValue ? formatValue(defaultValue) : defaultValue}`
              : undefined
          }
        >
          {displayValue}
        </span>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onDoubleClick={handleDoubleClick}
        className="slider-control w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
        style={{
          background: `linear-gradient(to right, ${accentColor} 0%, ${accentColor} ${pct}%, rgba(255,255,255,0.08) ${pct}%, rgba(255,255,255,0.08) 100%)`,
        }}
      />

      {/* Description */}
      {description && (
        <p className={`text-[10px] ${theme.colors.text.muted} leading-tight`}>{description}</p>
      )}

      {/* Inline styles for the range thumb (cross-browser) */}
      <style jsx>{`
        .slider-control::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
          cursor: pointer;
          transition: transform 0.15s ease;
        }
        .slider-control::-webkit-slider-thumb:hover {
          transform: scale(1.2);
        }
        .slider-control::-webkit-slider-thumb:active {
          transform: scale(0.95);
          background: #e2e8f0;
        }
        .slider-control::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: white;
          border: none;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.4);
          cursor: pointer;
        }
        .slider-control::-moz-range-track {
          background: transparent;
          border: none;
        }
      `}</style>
    </div>
  );
}
