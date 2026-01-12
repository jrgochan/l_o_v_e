import {
  calculateUpdatedMetrics,
  calculateIncrementedAlert,
  createInitialMetrics,
} from "@/hooks/chat/metrics/metricsUtils";
import { SessionMetrics } from "@/types/chat";

describe("metricsUtils", () => {
  const mockMetrics: SessionMetrics = {
    startTime: new Date(),
    elapsedSeconds: 10,
    emotionCount: 5,
    averageConfidence: 0.8,
    dominantCategory: "joy",
    alertCount: { critical: 0, warning: 0, attention: 0 },
  };

  describe("calculateUpdatedMetrics", () => {
    it("should calculate new average confidence", () => {
      const updated = calculateUpdatedMetrics(
        mockMetrics,
        "joy",
        "happiness",
        { valence: 0.8, arousal: 0.5, connection: 0.5 },
        0.9
      );

      // Previous: 5 * 0.8 = 4.0 total
      // New: 4.0 + 0.9 = 4.9 total / 6 items = 0.8166...
      expect(updated.emotionCount).toBe(6);
      expect(updated.averageConfidence).toBeCloseTo(0.8166);
    });

    it("should trigger critical alert on high arousal/low valence", () => {
      const updated = calculateUpdatedMetrics(
        mockMetrics,
        "fear",
        "fear",
        { valence: -0.8, arousal: 0.9, connection: 0.5 }, // Trigger critical
        0.9
      );

      expect(updated.alertCount.critical).toBe(1);
    });

    it("should trigger attention alert on low confidence", () => {
      const updated = calculateUpdatedMetrics(
        mockMetrics,
        "neutral",
        "neutral",
        { valence: 0, arousal: 0, connection: 0 },
        0.4 // Low confidence
      );

      expect(updated.alertCount.attention).toBe(1);
    });
  });

  describe("calculateIncrementedAlert", () => {
    it("should increment specified alert", () => {
      const updated = calculateIncrementedAlert(mockMetrics, "warning");
      expect(updated.alertCount.warning).toBe(1);
      expect(updated.alertCount.critical).toBe(0);
    });
  });

  describe("createInitialMetrics", () => {
    it("should return default empty metrics", () => {
      const metrics = createInitialMetrics();
      expect(metrics.emotionCount).toBe(0);
      expect(metrics.alertCount.critical).toBe(0);
      expect(metrics.startTime).toBeInstanceOf(Date);
    });

    it("should accept custom start time", () => {
      const date = new Date("2020-01-01");
      const metrics = createInitialMetrics(date);
      expect(metrics.startTime).toEqual(date);
    });
  });
});
