/**
 * Analysis Progress Indicator - Heartbeat Analyzer
 *
 * Beautiful, adaptive progress indicator that shows real-time analysis progress
 * with pulsing animations, stage tracking, and contextual messaging.
 */

"use client";

import { useMemo, useState, useEffect } from "react";

export interface ProgressStage {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "in_progress" | "complete";
  percentage: number;
  elapsed_ms?: number;
}

interface AnalysisProgressIndicatorProps {
  stages: ProgressStage[];
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
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Elapsed time counter
  useEffect(() => {
    const startTime = Date.now();
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 100); // Update every 100ms for smooth counting

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`
      bg-gradient-to-br from-gray-800 to-gray-900 
      rounded-xl p-6 border border-cyan-500/30 shadow-2xl
      max-w-md w-full
      ${className}
    `}
    >
      {/* Header with Elapsed Time */}
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-cyan-300 flex items-center justify-center gap-2">
          {deepFeelingMode ? (
            <>
              <span>🌊</span>
              <span>Deep Feeling Analysis</span>
            </>
          ) : (
            <>
              <span>💜</span>
              <span>Emotional Analysis</span>
            </>
          )}
        </h3>
        <div className="text-xs text-gray-400 mt-1 font-mono">
          {elapsedSeconds.toFixed(1)}s elapsed
        </div>
      </div>

      {/* Pulsing Gradient Orb */}
      <PulsingOrb percentage={overallPercentage} />

      {/* Progress Bar */}
      <ProgressBar percentage={overallPercentage} />

      {/* Current Stage (prominent) */}
      <CurrentStage stage={currentStage} stages={stages} />

      {/* Stages Checklist */}
      <StageChecklist stages={stages} />

      {/* Contextual Message with Processing Dots */}
      <AdaptiveMessage
        message={currentMessage}
        toneMode={toneMode}
        isProcessing={overallPercentage < 100}
      />
    </div>
  );
}

/**
 * Pulsing Orb - The heartbeat animation
 */
function PulsingOrb({ percentage }: { percentage: number }) {
  // Color shifts based on progress
  const getGradientColors = () => {
    if (percentage < 33) return "from-cyan-500 via-cyan-400 to-cyan-600";
    if (percentage < 67) return "from-purple-500 via-purple-400 to-purple-600";
    return "from-pink-500 via-pink-400 to-pink-600";
  };

  // Pulse speed increases as we get closer to completion
  const getPulseSpeed = () => {
    if (percentage < 50) return "animate-pulse-slow"; // 2s
    if (percentage < 80) return "animate-pulse-medium"; // 1.5s
    return "animate-pulse-fast"; // 1s (excitement!)
  };

  return (
    <div className="flex justify-center mb-6">
      <div className="relative w-24 h-24">
        {/* Main pulsing orb */}
        <div
          className={`
          absolute inset-0 rounded-full 
          bg-gradient-to-br ${getGradientColors()}
          ${getPulseSpeed()}
          shadow-lg
        `}
        />

        {/* Ping ring */}
        <div
          className={`
          absolute inset-0 rounded-full 
          bg-gradient-to-br ${getGradientColors()}
          opacity-50 animate-ping-slow
        `}
        />

        {/* Percentage overlay */}
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <span className="text-white font-bold text-xl drop-shadow-lg">{percentage}%</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Progress Bar - Smooth gradient fill
 */
function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="mb-6">
      <div className="flex justify-between text-xs text-gray-400 mb-2">
        <span>Overall Progress</span>
        <span className="font-mono text-cyan-400">{percentage}%</span>
      </div>
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden relative">
        <div
          className="
            h-full 
            bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 
            transition-all duration-500 ease-out
            shadow-[0_0_10px_rgba(6,182,212,0.5)]
          "
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Current Stage - Highlights the active stage
 */
function CurrentStage({ stage, stages }: { stage: string; stages: ProgressStage[] }) {
  const current = useMemo(() => stages.find((s) => s.id === stage), [stage, stages]);

  if (!current || current.status === "complete") return null;

  return (
    <div className="text-center my-4 py-3 bg-cyan-500/10 rounded-lg border border-cyan-500/30">
      <div className="text-white font-medium flex items-center justify-center gap-2">
        <span>{current.icon}</span>
        <span>{current.label}</span>
        {current.status === "in_progress" && <div className="animate-spin text-cyan-400">⏳</div>}
      </div>
    </div>
  );
}

/**
 * Stage Checklist - Shows all stages with status icons
 */
function StageChecklist({ stages }: { stages: ProgressStage[] }) {
  return (
    <div className="space-y-2 mb-6 max-h-48 overflow-y-auto">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className={`
            flex items-center gap-3 px-3 py-2 rounded
            transition-all duration-300
            ${stage.status === "in_progress" ? "bg-cyan-500/10 border border-cyan-500/30" : ""}
            ${stage.status === "complete" ? "opacity-60" : ""}
          `}
        >
          {/* Status Icon */}
          <div className="flex-shrink-0 w-6 flex justify-center">
            {stage.status === "complete" && (
              <span className="text-green-400 animate-fade-in">✅</span>
            )}
            {stage.status === "in_progress" && <div className="animate-spin text-cyan-400">⏳</div>}
            {stage.status === "pending" && <span className="text-gray-600">⬜</span>}
          </div>

          {/* Stage Info */}
          <div className="flex-1 flex items-center justify-between">
            <span
              className={`
              flex items-center gap-2 text-sm
              ${stage.status === "complete" ? "text-gray-400" : "text-white"}
              ${stage.status === "in_progress" ? "font-semibold" : ""}
            `}
            >
              <span>{stage.icon}</span>
              <span>{stage.label}</span>
            </span>

            {/* Elapsed Time (if complete) */}
            {stage.elapsed_ms && stage.status === "complete" && (
              <span className="text-xs text-gray-500 font-mono">
                {(stage.elapsed_ms / 1000).toFixed(1)}s
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Adaptive Message - Changes based on tone mode with processing dots
 */
function AdaptiveMessage({
  message,
  toneMode,
  isProcessing,
}: {
  message: string;
  toneMode: "warm" | "clinical";
  isProcessing: boolean;
}) {
  const [dots, setDots] = useState("");

  // Animated dots when processing
  useEffect(() => {
    if (!isProcessing) {
      // Reset dots when not processing, but do it via setInterval to avoid setState in effect
      const resetTimer = setTimeout(() => setDots(""), 0);
      return () => clearTimeout(resetTimer);
    }

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "...") return "";
        return prev + ".";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isProcessing]);

  return (
    <div
      className={`
      text-center text-sm italic px-4 py-3 rounded-lg
      transition-all duration-500
      ${
        toneMode === "warm"
          ? "text-cyan-300 bg-cyan-500/10 border border-cyan-500/20"
          : "text-blue-300 bg-blue-500/10 border border-blue-500/20"
      }
    `}
    >
      <p className="leading-relaxed">
        {message}
        {isProcessing && <span className="inline-block w-6 text-left">{dots}</span>}
      </p>
    </div>
  );
}
