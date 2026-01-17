/**
 * Analysis Progress Indicator - Focus Card Design
 *
 * A sleek, "Focus Card" visualization for real-time analysis.
 * Highlights the active stage with animated iconography and minimalist progress.
 */

"use client";

import { useMemo, useState, useEffect } from "react";
import { ProgressStage } from "@/types/chat"; // Assuming type is here or locally defined, keeping local if needed for now
// Re-defining interface locally to match previous file if not exported centrally
interface LocalProgressStage {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "in_progress" | "complete";
  percentage: number;
  elapsed_ms?: number;
}

interface AnalysisProgressIndicatorProps {
  stages: LocalProgressStage[];
  currentStage: string;
  overallPercentage: number;
  currentMessage: string;
  toneMode: "warm" | "clinical";
  deepFeelingMode: boolean;
  className?: string;
}

export function AnalysisProgressIndicator({
  stages,
  currentStage,
  overallPercentage,
  currentMessage,
  toneMode,
  deepFeelingMode,
  className = "",
}: AnalysisProgressIndicatorProps) {
  // --- Visual Config per Stage ---
  const stageConfig = useMemo(() => {
    return {
      started: {
        icon: "🎙️",
        color: "text-gray-400",
        bg: "bg-gray-500/20",
        animation: "animate-pulse",
      },
      transcription: {
        icon: "🗣️",
        color: "text-cyan-400",
        bg: "bg-cyan-500/20",
        animation: "animate-pulse",
      },
      prosody: {
        icon: "🎵",
        color: "text-indigo-400",
        bg: "bg-indigo-500/20",
        animation: "animate-bounce",
      },
      emotions: {
        icon: "❤️",
        color: deepFeelingMode ? "text-pink-400" : "text-rose-400",
        bg: deepFeelingMode ? "bg-pink-500/20" : "bg-rose-500/20",
        animation: "animate-pulse-fast",
      },
      relationships: {
        icon: "🔗",
        color: "text-purple-400",
        bg: "bg-purple-500/20",
        animation: "animate-spin-slow",
      },
      aggregate: {
        icon: "🧬",
        color: "text-fuchsia-400",
        bg: "bg-fuchsia-500/20",
        animation: "animate-pulse",
      },
      insights: {
        icon: "✨",
        color: "text-amber-300",
        bg: "bg-amber-500/20",
        animation: "animate-pulse",
      },
      complete: {
        icon: "✅",
        color: "text-emerald-400",
        bg: "bg-emerald-500/20",
        animation: "",
      },
    };
  }, [deepFeelingMode]);

  // Determine current visual state
  const activeStage = stages.find((s) => s.id === currentStage) || stages[0];
  const config =
    stageConfig[activeStage.id as keyof typeof stageConfig] || stageConfig.started;

  const isComplete = overallPercentage >= 100;

  // --- Simulated Progress for Smooth UX ---
  // If we are in an active state but backend is silent (processing), simulate progress
  const [simulatedPercentage, setSimulatedPercentage] = useState(overallPercentage);

  useEffect(() => {
    // Sync with real percentage if it jumps ahead
    if (overallPercentage > simulatedPercentage) {
      setSimulatedPercentage(overallPercentage);
    }

    // Auto-increment if not complete and in an active stage
    if (!isComplete && overallPercentage < 90) {
      const interval = setInterval(() => {
        setSimulatedPercentage((prev: number) => {
          // Asymptotic approach to 90%
          const remaining = 95 - prev;
          if (remaining <= 0) return prev;
          return prev + Math.max(0.2, remaining * 0.05); // Fast then slow
        });
      }, 100);
      return () => clearInterval(interval);
    }
  }, [overallPercentage, isComplete]);

  const displayPercentage = Math.max(overallPercentage, Math.floor(simulatedPercentage));

  return (
    <div
      className={`
      relative overflow-hidden
      w-full max-w-sm mx-auto
      rounded-2xl p-6
      bg-black/60 backdrop-blur-xl
      border border-white/10
      shadow-[0_8px_32px_rgba(0,0,0,0.5)]
      transition-all duration-500
      ${className}
    `}
    >
      {/* Background Ambient Glow */}
      <div
        className={`
          absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
          w-32 h-32 rounded-full blur-[60px] opacity-40
          transition-colors duration-700
          ${config.bg.replace("/20", "/60")}
        `}
      />

      {/* Main Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-4">

        {/* Animated Hero Icon */}
        <div className="relative">
          {/* Ring */}
          <div className={`
             absolute inset-0 rounded-full border-2 border-dashed opacity-30
             ${config.color} animate-[spin_10s_linear_infinite]
          `} />

          <div
            className={`
            w-20 h-20 rounded-full
            flex items-center justify-center
            text-4xl shadow-lg
            transition-all duration-500
            ${config.bg}
            ${config.color}
            border border-white/10
          `}
          >
            <span className={`block ${config.animation}`}>{config.icon}</span>
          </div>
        </div>

        {/* Text Status */}
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-white tracking-wide">
            {isComplete ? "Analysis Complete" : activeStage.label}
          </h3>
          <p className={`text-xs font-medium uppercase tracking-wider opacity-80 ${config.color}`}>
            {isComplete ? "Ready for insight" : "Processing..."}
          </p>
        </div>

        {/* Dynamic Context Message */}
        <div className="h-6 flex items-center justify-center">
          <p className="text-xs text-gray-400 italic animate-fade-in line-clamp-1">
            {currentMessage}
          </p>
        </div>

      </div>

      {/* Footer: Minimalist Progress Track */}
      {/* Footer: Minimalist Progress Track */}
      <div className="relative mt-6 pt-6 border-t border-white/5">

        {/* Continuous Progress Bar */}
        <div className="absolute top-0 left-0 w-full h-[2px] bg-white/5">
          <div
            className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)] transition-all duration-300 ease-out"
            style={{ width: `${displayPercentage}%` }}
          />
        </div>

        {/* Steps and Percentage */}
        <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono mb-2">
          <span>0%</span>
          <span className={isComplete ? "text-emerald-400" : "text-cyan-400"}>
            {displayPercentage}%
          </span>
        </div>

        <div className="flex justify-between items-center gap-1">
          {stages.map((stage, idx) => {
            const isActive = stage.id === currentStage;
            const isDone = stage.status === "complete";

            return (
              <div
                key={stage.id}
                className="flex-1 flex flex-col items-center gap-1 group"
                title={stage.label}
              >
                {/* Step indicator (dot) */}
                <div className={`
                      h-1 w-1 rounded-full transition-all duration-500
                      ${isActive ? `bg-white shadow-[0_0_4px_white] scale-125` : ""}
                      ${isDone ? `bg-white/40` : ""}
                      ${!isActive && !isDone ? "bg-white/10" : ""}
                  `} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}


