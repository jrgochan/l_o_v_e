import { useCallback } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";

export function useLayerActionMap() {
  const settings = useSettingsStore();
  // const { shouldExecuteShortcut } = useShortcutGuards();

  const getActions = useCallback(() => {
    const actions: Record<string, () => void> = {
      l: () => {
        settings.updateLayer("emotionLabels", !settings.layers.emotionLabels);
        logger.info("user-interaction", `Labels: ${!settings.layers.emotionLabels ? "ON" : "OFF"}`);
      },
      s: () => {
        settings.updateLayer("soulSphere", !settings.layers.soulSphere);
        logger.info(
          "user-interaction",
          `Soul Sphere: ${!settings.layers.soulSphere ? "ON" : "OFF"}`
        );
      },
      g: () => {
        settings.updateLayer("legend", !settings.layers.legend);
        logger.info("user-interaction", `Legend: ${!settings.layers.legend ? "ON" : "OFF"}`);
      },
      a: () => {
        settings.updateVisualSetting("showAxisLabels", !settings.showAxisLabels);
        logger.info(
          "user-interaction",
          `Axis Labels & Grids: ${!settings.showAxisLabels ? "ON - Showing VAC axes" : "OFF - Hidden"}`
        );
      },
      f: () => {
        settings.updateBehaviorSetting("focusMode", !settings.focusMode);
        logger.info(
          "user-interaction",
          `Focus mode: ${!settings.focusMode ? "ON - Hiding unselected emotions" : "OFF - Showing all"}`
        );
      },
      e: () => {
        settings.updateLayer("emotionPoints", !settings.layers.emotionPoints);
        logger.info(
          "user-interaction",
          `Emotion Points: ${!settings.layers.emotionPoints ? "ON" : "OFF"}`
        );
      },
      p: () => {
        settings.updateLayer("transitionPaths", !settings.layers.transitionPaths);
        logger.info(
          "user-interaction",
          `Paths: ${!settings.layers.transitionPaths ? "ON" : "OFF"}`
        );
      },
      o: () => {
        settings.updateVisualSetting("showMotionIndicators", !settings.showMotionIndicators);
        logger.info(
          "user-interaction",
          `Motion Indicators: ${!settings.showMotionIndicators ? "ON - Showing category motion types" : "OFF - Hidden"}`
        );
      },
      x: () => {
        settings.updateVisualSetting("dataVisualizationMode", !settings.dataVisualizationMode);
        logger.info(
          "user-interaction",
          `Data Visualization Mode: ${!settings.dataVisualizationMode ? "ON - Showing all 87 emotions with VAC coordinates" : "OFF - Normal view"}`
        );
      },
      v: () => {
        const modes: Array<"subtle" | "dynamic" | "mystical"> = ["subtle", "dynamic", "mystical"];
        const currentIndex = modes.indexOf(settings.pathAnimationMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];
        settings.updateVisualSetting("pathAnimationMode", nextMode);

        const modeNames = {
          subtle: "😌 Subtle Elegant (Therapeutic calm)",
          dynamic: "😊 Dynamic Playful (Engaging flow)",
          mystical: "🔮 Mystical Ethereal (Quantum dreams)",
        };
        logger.info("user-interaction", `Path Animation Mode: ${modeNames[nextMode]}`);
      },
    };

    return actions;
  }, [settings]);

  return { getActions };
}
