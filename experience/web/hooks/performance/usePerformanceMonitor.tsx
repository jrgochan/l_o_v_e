/**
 * Performance Monitor Hook
 *
 * Monitors FPS and provides quality recommendations for emotion visualization.
 * Helps maintain smooth 60fps experience by suggesting quality adjustments.
 */

import { useEffect, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { QualityLevel } from "@/utils/performance/quality";
import type { PerformanceMetrics } from "@/components/performance/FPSDisplay";

interface UsePerformanceMonitorOptions {
  targetFps?: number; // Default: 60
  sampleSize?: number; // Number of frames to average. Default: 60
  autoAdjustQuality?: boolean; // Auto-suggest quality changes. Default: true
  onQualityChange?: (newQuality: QualityLevel) => void;
}

/**
 * Monitor rendering performance and provide quality recommendations
 */
export function usePerformanceMonitor(options: UsePerformanceMonitorOptions = {}) {
  const { targetFps = 60, sampleSize = 60, autoAdjustQuality = true, onQualityChange } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    fps: 60,
    averageFps: 60,
    minFps: 60,
    maxFps: 60,
    frameTime: 16.67,
    qualityRecommendation: "ultra",
    isStable: true,
  });

  const frameTimesRef = useRef<number[]>([]);
  const lastTimeRef = useRef<number>(0);
  const updateCounterRef = useRef(0);
  const lastQualityRef = useRef<QualityLevel>("ultra");

  // Initialize start time on mount
  useEffect(() => {
    lastTimeRef.current = performance.now();
  }, []);

  const getQualityRecommendation = (avgFps: number, minFps: number): QualityLevel => {
    // Ultra: Consistently high FPS (>55 avg, >50 min)
    if (avgFps >= 55 && minFps >= 50) {
      return "ultra";
    }

    // High: Good FPS with occasional dips (>45 avg, >40 min)
    if (avgFps >= 45 && minFps >= 40) {
      return "high";
    }

    // Medium: Acceptable FPS (>35 avg, >30 min)
    if (avgFps >= 35 && minFps >= 30) {
      return "medium";
    }

    // Low: Struggling (<35 avg or <30 min)
    return "low";
  };

  const calculateMetrics = () => {
    const frameTimes = frameTimesRef.current;
    if (frameTimes.length === 0) return;

    // Calculate FPS from frame times
    const averageFrameTime = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const currentFps = 1000 / (frameTimes[frameTimes.length - 1] || 16.67);
    const averageFps = 1000 / averageFrameTime;
    const minFps = 1000 / Math.max(...frameTimes);
    const maxFps = 1000 / Math.min(...frameTimes);

    // Determine quality recommendation
    const qualityRecommendation = getQualityRecommendation(averageFps, minFps);

    // Check stability (is FPS consistently good?)
    const variance =
      frameTimes.reduce((sum, time) => {
        const diff = time - averageFrameTime;
        return sum + diff * diff;
      }, 0) / frameTimes.length;
    const stdDev = Math.sqrt(variance);
    const isStable = stdDev < 5 && averageFps >= targetFps * 0.9;

    // Notify on quality change
    if (autoAdjustQuality && qualityRecommendation !== lastQualityRef.current) {
      lastQualityRef.current = qualityRecommendation;
      onQualityChange?.(qualityRecommendation);
    }

    setMetrics({
      fps: Math.round(currentFps),
      averageFps: Math.round(averageFps),
      minFps: Math.round(minFps),
      maxFps: Math.round(maxFps),
      frameTime: averageFrameTime,
      qualityRecommendation,
      isStable,
    });
  };

  // Track frame times using useFrame
  useFrame(() => {
    const now = performance.now();
    const deltaTime = now - lastTimeRef.current;
    lastTimeRef.current = now;

    // Add to frame times buffer
    frameTimesRef.current.push(deltaTime);

    // Keep only recent samples
    if (frameTimesRef.current.length > sampleSize) {
      frameTimesRef.current.shift();
    }

    // Update metrics every 30 frames (about twice per second at 60fps)
    updateCounterRef.current++;
    if (updateCounterRef.current >= 30) {
      updateCounterRef.current = 0;
      calculateMetrics();
    }
  });

  return metrics;
}
