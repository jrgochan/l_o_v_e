import React from "react";
import type { QualityLevel } from "@/utils/performance/quality";

export interface PerformanceMetrics {
  fps: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameTime: number; // milliseconds
  qualityRecommendation: QualityLevel;
  isStable: boolean;
}

/**
 * Simple FPS display component (for debugging)
 */
export function FPSDisplay({ metrics }: { metrics: PerformanceMetrics }) {
  const getStatusColor = (fps: number) => {
    if (fps >= 55) return "text-green-400";
    if (fps >= 45) return "text-yellow-400";
    if (fps >= 30) return "text-orange-400";
    return "text-red-400";
  };

  const getQualityColor = (quality: QualityLevel) => {
    switch (quality) {
      case "ultra":
        return "text-cyan-400";
      case "high":
        return "text-green-400";
      case "medium":
        return "text-yellow-400";
      case "low":
        return "text-red-400";
    }
  };

  return (
    <div className="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg font-mono text-xs space-y-1 z-50 min-w-[200px]">
      <div className="flex justify-between">
        <span>FPS:</span>
        <span className={getStatusColor(metrics.fps)}>{metrics.fps}</span>
      </div>
      <div className="flex justify-between">
        <span>Avg:</span>
        <span className={getStatusColor(metrics.averageFps)}>{metrics.averageFps}</span>
      </div>
      <div className="flex justify-between">
        <span>Min/Max:</span>
        <span className="text-gray-400">
          {metrics.minFps}/{metrics.maxFps}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Frame:</span>
        <span className="text-gray-400">{metrics.frameTime.toFixed(2)}ms</span>
      </div>
      <div className="border-t border-gray-700 pt-1 mt-1 flex justify-between">
        <span>Quality:</span>
        <span className={getQualityColor(metrics.qualityRecommendation)}>
          {metrics.qualityRecommendation.toUpperCase()}
        </span>
      </div>
      <div className="flex justify-between">
        <span>Stable:</span>
        <span className={metrics.isStable ? "text-green-400" : "text-yellow-400"}>
          {metrics.isStable ? "✓" : "○"}
        </span>
      </div>
    </div>
  );
}
