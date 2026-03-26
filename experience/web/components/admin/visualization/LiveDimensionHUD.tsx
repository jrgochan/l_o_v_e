/**
 * Live Dimension HUD — Floating real-time readout
 *
 * Compact floating badge showing the 4 damped octonion values
 * that the Soul Sphere is currently rendering. Updates at 10fps
 * (throttled from the 60fps render loop) to avoid layout thrashing.
 *
 * Position: bottom-right, above the camera controls.
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";

const DIMS = [
  { key: "depth" as const, symbol: "D", label: "Depth", pos: "text-amber-400", neg: "text-amber-700", bg: "bg-amber-" },
  { key: "coping" as const, symbol: "P", label: "Coping", pos: "text-emerald-400", neg: "text-rose-400", bg: "bg-emerald-" },
  { key: "velocity" as const, symbol: "Ė", label: "Velocity", pos: "text-sky-400", neg: "text-indigo-400", bg: "bg-sky-" },
  { key: "novelty" as const, symbol: "N", label: "Novelty", pos: "text-violet-400", neg: "text-orange-400", bg: "bg-violet-" },
] as const;

export function LiveDimensionHUD() {
  const enabled = useSettingsStore((s) => s.enableOctonionLayer);
  const [values, setValues] = useState({ depth: 0, coping: 0, velocity: 0, novelty: 0 });
  const rafRef = useRef<number | undefined>(undefined);

  // Poll store at ~10fps for display (not reactive subscription to avoid 60fps re-renders)
  useEffect(() => {
    if (!enabled) return;

    let last = 0;
    const tick = (time: number) => {
      if (time - last > 100) { // 10fps
        const ext = useExperienceStore.getState().octonionExtended;
        setValues({ ...ext });
        last = time;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [enabled]);

  if (!enabled) return null;

  const isActive = Math.abs(values.depth) + Math.abs(values.coping) +
    Math.abs(values.velocity) + Math.abs(values.novelty) > 0.01;

  return (
    <div
      className={`absolute bottom-20 right-4 z-30 transition-all duration-500 ${
        isActive ? "opacity-100 translate-y-0" : "opacity-40 translate-y-1"
      }`}
    >
      <div className="bg-black/60 backdrop-blur-md border border-violet-500/30 rounded-lg px-3 py-2 space-y-1 min-w-[150px]">
        {/* Header */}
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[9px] uppercase tracking-widest text-violet-400/80 font-semibold">
            🔮 Live
          </span>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-violet-400 animate-pulse" : "bg-gray-600"}`} />
        </div>

        {/* Bars */}
        {DIMS.map((dim) => {
          const val = values[dim.key];
          const isPos = val >= 0;
          const mag = Math.min(Math.abs(val), 1);
          const colorClass = isPos ? dim.pos : dim.neg;

          return (
            <div key={dim.key} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-bold font-mono w-3 text-right ${colorClass}`}>
                {dim.symbol}
              </span>
              <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative overflow-hidden">
                <div className="absolute left-1/2 top-0 w-px h-full bg-gray-600 z-10" />
                <div
                  className="absolute top-0 h-full rounded-full transition-all duration-150 ease-out"
                  style={{
                    left: isPos ? "50%" : `${50 - mag * 50}%`,
                    width: `${mag * 50}%`,
                    backgroundColor: isPos
                      ? dim.key === "depth" ? "#fbbf24"
                      : dim.key === "coping" ? "#34d399"
                      : dim.key === "velocity" ? "#38bdf8"
                      : "#a78bfa"
                      : dim.key === "depth" ? "#b45309"
                      : dim.key === "coping" ? "#fb7185"
                      : dim.key === "velocity" ? "#818cf8"
                      : "#fb923c",
                  }}
                />
              </div>
              <span className={`text-[9px] font-mono w-7 text-right ${isPos ? "text-gray-300" : "text-gray-500"}`}>
                {val >= 0 ? "+" : ""}{val.toFixed(2)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
