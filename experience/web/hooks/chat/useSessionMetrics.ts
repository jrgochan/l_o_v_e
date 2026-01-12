/**
 * Custom hook for managing session metrics
 *
 * Handles session metrics state, timer management, alert counting, and statistics.
 * Extracted from ChatPanel.tsx to reduce complexity.
 * Refactored to use pure utility functions for state calculations.
 */

import { useState, useRef, useEffect } from "react";
import type { SessionMetrics, VAC } from "@/types/chat";
import {
  calculateUpdatedMetrics,
  calculateIncrementedAlert,
  createInitialMetrics,
} from "./metrics/metricsUtils";

export function useSessionMetrics() {
  const sessionStartTimeRef = useRef<Date>(new Date());

  const [sessionMetrics, setSessionMetrics] = useState<SessionMetrics>(() =>
    createInitialMetrics()
  );

  /**
   * Update session metrics timer every second
   */
  useEffect(() => {
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTimeRef.current.getTime()) / 1000);
      setSessionMetrics((prev) => ({
        ...prev,
        elapsedSeconds: elapsed,
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Update metrics after emotion detection
   */
  const updateMetricsAfterEmotion = (
    emotion: string,
    category: string,
    vac: VAC,
    confidence: number
  ) => {
    setSessionMetrics((prev) => calculateUpdatedMetrics(prev, emotion, category, vac, confidence));
  };

  /**
   * Increment specific alert type
   */
  const incrementAlert = (alertType: "critical" | "warning" | "attention") => {
    setSessionMetrics((prev) => calculateIncrementedAlert(prev, alertType));
  };

  /**
   * Update metrics (general purpose)
   */
  const updateMetrics = (updates: Partial<SessionMetrics>) => {
    setSessionMetrics((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  /**
   * Reset session metrics
   */
  const resetMetrics = () => {
    sessionStartTimeRef.current = new Date();
    setSessionMetrics(createInitialMetrics(sessionStartTimeRef.current));
  };

  return {
    sessionMetrics,
    updateMetricsAfterEmotion,
    incrementAlert,
    updateMetrics,
    resetMetrics,
  };
}
