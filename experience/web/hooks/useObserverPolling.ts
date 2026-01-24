/**
 * Observer Polling Hook
 *
 * Automatically polls the Observer API for emotional state updates
 * and updates the Soul Sphere in real-time.
 */

"use client";

import { useEffect, useRef } from "react";
import {
  createPollingManager,
  ObserverEmotionResponse,
  convertQuaternion,
  convertVAC,
  ObserverPollingManager,
} from "@love/experience-shared";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";
import { OBSERVER_URL } from "@/config/environment";

interface UseObserverPollingOptions {
  userId: string;
  enabled?: boolean;
  baseUrl?: string;
  intervalMs?: number;
}

export function useObserverPolling({
  userId,
  enabled = false,
  baseUrl = OBSERVER_URL,
  intervalMs = 5000,
}: UseObserverPollingOptions) {
  const managerRef = useRef<ObserverPollingManager | null>(null);
  const setTarget = useExperienceStore((state) => state.setTarget);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    // Create polling manager
    const manager = createPollingManager({
      baseUrl,
      pollingInterval: intervalMs,
    });

    // Start polling
    manager.start(
      userId,
      (data: ObserverEmotionResponse) => {
        // Convert API response to local format
        const vac = convertVAC(data.vac_vector);
        const quaternion = convertQuaternion(data.quaternion);

        // Update Soul Sphere target state
        setTarget(vac, quaternion);

        logger.info("api", `Observer update: ${data.dominant_emotion.name}`, { vac });
      },
      (error) => {
        logger.error("api", "Observer polling error", error);
      },
      intervalMs
    );

    managerRef.current = manager;

    // Cleanup on unmount or dependency change
    return () => {
      if (managerRef.current) {
        managerRef.current.stop();
        managerRef.current = null;
      }
    };
  }, [userId, enabled, baseUrl, intervalMs, setTarget]);

  return {
    isPolling: enabled,
    stop: () => {
      if (managerRef.current) {
        managerRef.current.stop();
      }
    },
  };
}
