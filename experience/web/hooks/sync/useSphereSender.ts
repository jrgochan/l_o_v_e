import { useCallback, useEffect, useRef } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";
import { HEARTBEAT_INTERVAL, SphereStateMessage, SyncMode, VisualSettingsPayload } from "./types";

export function useSphereSender(mode: SyncMode, sendMessage: (msg: SphereStateMessage) => void) {
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const broadcastSphereState = useCallback(() => {
    const targetVAC = useExperienceStore.getState().targetVAC;
    const selectedIds = useVisualizationStore.getState().selectedEmotionIds;
    const transitionPath = useExperienceStore.getState().transitionPath;
    const showPath = useExperienceStore.getState().showPath;

    // Capture visual settings for remote sync
    const settingsState = useSettingsStore.getState();
    const visualSettings: VisualSettingsPayload = {
      sphereTransparency: 1 - settingsState.sphereOpacity,
      animationSpeed: settingsState.animationSpeed,
      renderQuality: settingsState.renderQuality,
      autoRotate: settingsState.autoRotate,
      pathAnimationMode: settingsState.pathAnimationMode,
    };

    let safePath = null;
    try {
      if (transitionPath) {
        safePath = JSON.parse(JSON.stringify(transitionPath));
      }
    } catch (e) {
      logger.warn("hooks", "Path serialization failed", e);
    }

    const message: SphereStateMessage = {
      type: "sphere_update",
      vac: targetVAC,
      selectedEmotionIds: Array.from(selectedIds),
      path: safePath,
      showPath: showPath,
      visualSettings,
      timestamp: Date.now(),
    };

    sendMessage(message);
    logger.debug("websocket", "[SYNC] Broadcasted sphere state", { dualChannel: true });
  }, [sendMessage]);

  useEffect(() => {
    if (mode === "broadcaster") {
      heartbeatRef.current = setInterval(broadcastSphereState, HEARTBEAT_INTERVAL);
      setTimeout(broadcastSphereState, 100);

      // Debug Pulse
      setTimeout(() => {
        const testMsg: SphereStateMessage = {
          type: "sphere_update",
          vac: [0.9, 0.5, 0.5],
          timestamp: Date.now(),
          selectedEmotionIds: ["DEBUG_TEST"],
        };
        sendMessage(testMsg);
        logger.debug("websocket", "[SYNC] Sent DEBUG Pulse");
      }, 2000);
    }

    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [mode, broadcastSphereState, sendMessage]);

  return { broadcast: broadcastSphereState };
}
