import { useCallback, useRef, useEffect, useState } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { logger } from "@/utils/logger";
import { SphereStateMessage, SyncMode, STALE_THRESHOLD } from "./types";

export function useSphereReceiver(
  mode: SyncMode,
  lastMessageTime: number,
  onSync?: (message: SphereStateMessage) => void,
  onStale?: () => void
) {
  const staleCheckRef = useRef<NodeJS.Timeout | null>(null);

  // Local state to track updates for UI
  const [lastUpdate, setLastUpdate] = useState(0);

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

  // Also update lastUpdate when lastMessageTime from prop changes (transport update)
  useEffect(() => {
    if (lastMessageTime > 0) setLastUpdate(lastMessageTime);
  }, [lastMessageTime]);

  return { handleMessage, lastUpdate };
}
