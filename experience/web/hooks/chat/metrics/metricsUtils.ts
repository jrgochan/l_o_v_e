import type { SessionMetrics, VAC } from "@/types/chat";

/**
 * Calculate updated metrics after a new emotion is detected
 */
export const calculateUpdatedMetrics = (
  prevMetrics: SessionMetrics,
  emotion: string,
  category: string,
  vac: VAC,
  confidence: number
): SessionMetrics => {
  const newEmotionCount = prevMetrics.emotionCount + 1;
  const newAverageConfidence =
    (prevMetrics.averageConfidence * prevMetrics.emotionCount + confidence) / newEmotionCount;

  // Update alert counts based on analysis
  const newAlertCount = { ...prevMetrics.alertCount };

  // Critical: High arousal + negative valence
  if (vac.arousal > 0.7 && vac.valence < -0.5) {
    newAlertCount.critical++;
  }

  // Attention: Low confidence
  if (confidence < 0.6) {
    newAlertCount.attention++;
  }

  return {
    ...prevMetrics,
    emotionCount: newEmotionCount,
    averageConfidence: newAverageConfidence,
    dominantCategory: category,
    alertCount: newAlertCount,
  };
};

/**
 * Increment a specific alert type in the metrics
 */
export const calculateIncrementedAlert = (
  prevMetrics: SessionMetrics,
  alertType: "critical" | "warning" | "attention"
): SessionMetrics => {
  return {
    ...prevMetrics,
    alertCount: {
      ...prevMetrics.alertCount,
      [alertType]: prevMetrics.alertCount[alertType] + 1,
    },
  };
};

/**
 * Create initial empty session metrics
 */
export const createInitialMetrics = (startTime: Date = new Date()): SessionMetrics => ({
  startTime,
  elapsedSeconds: 0,
  emotionCount: 0,
  averageConfidence: 0,
  dominantCategory: null,
  alertCount: {
    critical: 0,
    warning: 0,
    attention: 0,
  },
});
