/**
 * Extended Dimension Comparison — Side-by-side comparison of two emotions
 *
 * When exactly 2 emotions are selected and both have extended vectors,
 * this shows a compact comparison view highlighting where the emotions
 * diverge in the 4 extended dimensions. Clinically, the divergence points
 * are the most interesting (emotions that share VAC but differ in D/P/Ė/N).
 */

"use client";

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface EmotionSummary {
  name: string;
  extended: number[]; // [D, P, Ė, N]
}

interface DimensionComparisonProps {
  emotionA: EmotionSummary;
  emotionB: EmotionSummary;
}

const DIMS = [
  { symbol: "D", label: "Depth", posLabel: "Profound", negLabel: "Surface", posColor: "#fbbf24", negColor: "#b45309" },
  { symbol: "P", label: "Coping", posLabel: "Empowered", negLabel: "Helpless", posColor: "#34d399", negColor: "#fb7185" },
  { symbol: "Ė", label: "Velocity", posLabel: "Shifting", negLabel: "Frozen", posColor: "#38bdf8", negColor: "#818cf8" },
  { symbol: "N", label: "Novelty", posLabel: "Novel", negLabel: "Familiar", posColor: "#a78bfa", negColor: "#fb923c" },
];

const DIVERGENCE_THRESHOLD = 0.4; // Flag when delta > 0.4

export function DimensionComparison({ emotionA, emotionB }: DimensionComparisonProps) {
  const theme = useAdminTheme();

  const divergences: { dim: string; delta: number }[] = [];

  DIMS.forEach((dim, i) => {
    const delta = Math.abs(emotionA.extended[i] - emotionB.extended[i]);
    if (delta > DIVERGENCE_THRESHOLD) {
      divergences.push({ dim: dim.label, delta });
    }
  });

  return (
    <div className={`bg-black/20 border ${theme.colors.border} rounded-lg p-3 space-y-2`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h4 className={`text-xs font-semibold ${theme.colors.text.secondary}`}>
          🔮 Extended Dimensions
        </h4>
        <span className="text-[9px] text-violet-400/70 uppercase tracking-wide">Comparison</span>
      </div>

      {/* Column headers */}
      <div className="flex items-center gap-1 text-[10px]">
        <span className="w-4" />
        <span className={`flex-1 text-center truncate font-medium ${theme.colors.primary}`}>
          {emotionA.name}
        </span>
        <span className="w-6" />
        <span className={`flex-1 text-center truncate font-medium ${theme.colors.secondary}`}>
          {emotionB.name}
        </span>
        <span className="w-4 text-center text-gray-500">Δ</span>
      </div>

      {/* Dimension rows */}
      {DIMS.map((dim, i) => {
        const valA = emotionA.extended[i];
        const valB = emotionB.extended[i];
        const delta = Math.abs(valA - valB);
        const isDivergent = delta > DIVERGENCE_THRESHOLD;

        return (
          <div key={dim.symbol} className="flex items-center gap-1">
            {/* Symbol */}
            <span className={`text-[10px] font-bold font-mono w-4 text-right ${isDivergent ? "text-amber-400" : "text-gray-500"}`}>
              {dim.symbol}
            </span>

            {/* Bar A */}
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative overflow-hidden">
              <div className="absolute left-1/2 top-0 w-px h-full bg-gray-700 z-10" />
              <div
                className="absolute top-0 h-full rounded-full transition-all duration-300"
                style={{
                  left: valA >= 0 ? "50%" : `${50 - Math.abs(valA) * 50}%`,
                  width: `${Math.abs(valA) * 50}%`,
                  backgroundColor: valA >= 0 ? dim.posColor : dim.negColor,
                }}
              />
            </div>

            {/* Delta badge */}
            <span className={`text-[9px] font-mono w-6 text-center rounded ${
              isDivergent
                ? "bg-amber-900/40 text-amber-300 font-semibold"
                : "text-gray-600"
            }`}>
              {delta.toFixed(1)}
            </span>

            {/* Bar B */}
            <div className="flex-1 h-1.5 bg-gray-800 rounded-full relative overflow-hidden">
              <div className="absolute left-1/2 top-0 w-px h-full bg-gray-700 z-10" />
              <div
                className="absolute top-0 h-full rounded-full transition-all duration-300"
                style={{
                  left: valB >= 0 ? "50%" : `${50 - Math.abs(valB) * 50}%`,
                  width: `${Math.abs(valB) * 50}%`,
                  backgroundColor: valB >= 0 ? dim.posColor : dim.negColor,
                }}
              />
            </div>

            {/* Divergence indicator */}
            <span className={`w-4 text-center ${isDivergent ? "text-amber-400" : "text-transparent"}`}>
              ⚠
            </span>
          </div>
        );
      })}

      {/* Divergence summary */}
      {divergences.length > 0 && (
        <div className="text-[10px] text-amber-300/80 bg-amber-900/15 rounded px-2 py-1 border border-amber-700/20">
          <strong>⚠ Key divergence{divergences.length > 1 ? "s" : ""}:</strong>{" "}
          {divergences.map((d) => `${d.dim} (Δ${d.delta.toFixed(2)})`).join(", ")}
        </div>
      )}
      {divergences.length === 0 && (
        <div className="text-[10px] text-emerald-400/60 italic">
          No significant divergence — similar extended profiles
        </div>
      )}
    </div>
  );
}
