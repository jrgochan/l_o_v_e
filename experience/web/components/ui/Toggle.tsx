/**
 * Toggle Component
 *
 * Smooth animated toggle switch with labels on both sides.
 * Used for Warm/Clinical, Atlas/AI, and Deep Feeling mode.
 */

"use client";

import { useState } from "react";

interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  leftLabel: string;
  rightLabel: string;
  tooltip?: string;
  disabled?: boolean;
  className?: string;
}

export function Toggle({
  checked,
  onChange,
  leftLabel,
  rightLabel,
  tooltip,
  disabled = false,
  className = "",
}: ToggleProps) {
  const [isFocused, setIsFocused] = useState(false);

  const handleToggle = () => {
    if (!disabled) {
      onChange(!checked);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleToggle();
    }
  };

  return (
    <div className={`inline-flex items-center gap-2 ${className}`} title={tooltip}>
      {/* Left Label */}
      <span
        className={`text-sm font-medium transition-colors ${
          checked ? "text-gray-400" : "text-white"
        } ${disabled ? "opacity-50" : ""}`}
      >
        {leftLabel}
      </span>

      {/* Toggle Switch */}
      <button
        role="switch"
        aria-checked={checked}
        aria-label={`Toggle between ${leftLabel} and ${rightLabel}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        disabled={disabled}
        className={`
          relative inline-flex h-9 w-36 items-center rounded-full
          transition-all duration-200 ease-in-out
          focus:outline-none
          ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}
          ${isFocused ? "ring-2 ring-cyan-400 ring-offset-2 ring-offset-gray-900" : ""}
          ${
            checked
              ? "bg-gradient-to-r from-cyan-600 to-blue-600 shadow-lg shadow-cyan-500/50"
              : "bg-gradient-to-r from-amber-600 to-orange-600 shadow-lg shadow-amber-500/50"
          }
        `}
      >
        {/* Slider Pill */}
        <span
          className={`
            inline-block h-7 w-7 transform rounded-full
            bg-white shadow-lg
            transition-transform duration-200 ease-in-out
            ${checked ? "translate-x-[108px]" : "translate-x-1"}
          `}
        />
      </button>

      {/* Right Label */}
      <span
        className={`text-sm font-medium transition-colors ${
          checked ? "text-white" : "text-gray-400"
        } ${disabled ? "opacity-50" : ""}`}
      >
        {rightLabel}
      </span>
    </div>
  );
}

/**
 * ToggleGroup Component
 *
 * Group multiple toggles with consistent spacing
 */

interface ToggleGroupProps {
  children: React.ReactNode;
  className?: string;
}

export function ToggleGroup({ children, className = "" }: ToggleGroupProps) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>;
}
