import { useCallback, useRef, useEffect, useState } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";
import { SphereStateMessage, SyncMode, STALE_THRESHOLD } from "./types";
import type { PathAnimationMode } from "@/types/visualization";

export function useSphereReceiver(
  mode: SyncMode,
  lastMessageTime: number,
  onSync?: (message: SphereStateMessage) => void,
  onStale?: () => void
) {
  const staleCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Local state to track updates for UI
  const [lastUpdate, setLastUpdate] = useState(lastMessageTime);

  const handleMessage = useCallback(
    (message: SphereStateMessage) => {
      setLastUpdate(message.timestamp);

      if (message.type === "sphere_update" && message.vac) {
        useExperienceStore.getState().setTarget(message.vac);
        logger.debug("websocket", "[SYNC] Received sphere update", message.vac);
      }

      if (
        message.type === "path_update" ||
        (message.type === "sphere_update" && message.path !== undefined)
      ) {
        useExperienceStore.getState().setTransitionPath(message.path || null);
        if (message.showPath !== undefined) {
          useExperienceStore.getState().setShowPath(message.showPath);
        }
        logger.debug("websocket", "[SYNC] Received path update", { hasPath: !!message.path });
      }

      // Apply visual settings from Admin broadcaster
      if (message.type === "sphere_update" && message.visualSettings) {
        const vs = message.visualSettings;
        const store = useSettingsStore.getState();
        store.setSphereOpacity(1 - vs.sphereTransparency);
        store.setAnimationSpeed(vs.animationSpeed);
        store.setRenderQuality(vs.renderQuality);
        if (vs.autoRotate !== store.autoRotate) {
          store.toggleAutoRotate();
        }
        store.updateVisualSetting("pathAnimationMode", vs.pathAnimationMode as PathAnimationMode);
        logger.debug("websocket", "[SYNC] Applied visual settings from Admin");
      }

      if (message.type === "heartbeat") {
        logger.debug("websocket", "[SYNC] Received heartbeat");
      }

      onSync?.(message);
    },
    [onSync]
  );

  // Stale check
  useEffect(() => {
    if (mode === "listener") {
      staleCheckRef.current = setInterval(() => {
        const elapsed = Date.now() - (lastUpdate || Date.now()); // Fallback if 0
        if (elapsed > STALE_THRESHOLD && lastUpdate > 0) {
          logger.warn("websocket", `[SYNC] Stale: No updates for ${Math.floor(elapsed / 1000)}s`);
          onStale?.();
        }
      }, 5000);
    }
    return () => {
      if (staleCheckRef.current) clearInterval(staleCheckRef.current);
    };
  }, [mode, lastUpdate, onStale]);

  return { handleMessage, lastUpdate };
}
