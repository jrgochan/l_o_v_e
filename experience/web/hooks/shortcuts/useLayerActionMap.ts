import { useCallback } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { logger } from "@/utils/logger";

export function useLayerActionMap() {
  // Use getState() to access latest state without triggering re-renders/re-binding
  // This ensures the event listener remains stable
  const getActions = useCallback(() => {
    const actions: Record<string, (e?: KeyboardEvent) => void> = {
      l: () => {
        const state = useSettingsStore.getState();
        state.updateLayer("emotionLabels", !state.layers.emotionLabels);
        logger.info(
          "user-interaction",
          `Labels: ${!state.layers.emotionLabels ? "ON" : "OFF"}`
        );
      },
      s: () => {
        const state = useSettingsStore.getState();
        state.updateLayer("soulSphere", !state.layers.soulSphere);
        logger.info(
          "user-interaction",
          `Soul Sphere: ${!state.layers.soulSphere ? "ON" : "OFF"}`
        );
      },
      g: () => {
        const state = useSettingsStore.getState();
        state.updateLayer("legend", !state.layers.legend);
        logger.info("user-interaction", `Legend: ${!state.layers.legend ? "ON" : "OFF"}`);
      },
      a: () => {
        const state = useSettingsStore.getState();
        state.updateVisualSetting("showAxisLabels", !state.showAxisLabels);
        logger.info(
          "user-interaction",
          `Axis Labels & Grids: ${!state.showAxisLabels ? "ON - Showing VAC axes" : "OFF - Hidden"
          }`
        );
      },
      f: () => {
        const state = useSettingsStore.getState();
        state.updateBehaviorSetting("focusMode", !state.focusMode);
        logger.info(
          "user-interaction",
          `Focus mode: ${!state.focusMode ? "ON - Hiding unselected emotions" : "OFF - Showing all"
          }`
        );
      },
      e: () => {
        const state = useSettingsStore.getState();
        state.updateLayer("emotionPoints", !state.layers.emotionPoints);
        logger.info(
          "user-interaction",
          `Emotion Points: ${!state.layers.emotionPoints ? "ON" : "OFF"}`
        );
      },
      p: () => {
        const state = useSettingsStore.getState();
        state.updateLayer("transitionPaths", !state.layers.transitionPaths);
        logger.info(
          "user-interaction",
          `Paths: ${!state.layers.transitionPaths ? "ON" : "OFF"}`
        );
      },
      o: () => {
        const state = useSettingsStore.getState();
        state.updateVisualSetting("showMotionIndicators", !state.showMotionIndicators);
        logger.info(
          "user-interaction",
          `Motion Indicators: ${!state.showMotionIndicators ? "ON - Showing category motion types" : "OFF - Hidden"
          }`
        );
      },
      x: () => {
        const state = useSettingsStore.getState();
        state.updateVisualSetting("dataVisualizationMode", !state.dataVisualizationMode);
        logger.info(
          "user-interaction",
          `Data Visualization Mode: ${!state.dataVisualizationMode
            ? "ON - Showing all 87 emotions with VAC coordinates"
            : "OFF - Normal view"
          }`
        );
      },
      v: () => {
        const state = useSettingsStore.getState();
        const modes: Array<"subtle" | "dynamic" | "mystical" | "crystalline" | "luminous" | "liquid" | "glitch"> = [
          "subtle",
          "dynamic",
          "mystical",
          "crystalline",
          "luminous",
          "liquid",
          "glitch",
        ];
        const currentIndex = modes.indexOf(state.pathAnimationMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        const nextMode = modes[nextIndex];
        state.updateVisualSetting("pathAnimationMode", nextMode);

        const modeNames = {
          subtle: "😌 Subtle Elegant (Therapeutic calm)",
          dynamic: "😊 Dynamic Playful (Engaging flow)",
          mystical: "🔮 Mystical Ethereal (Quantum dreams)",
          crystalline: "💎 Crystalline (Structural Clarity)",
          luminous: "✨ Luminous (Energetic Spirit)",
          liquid: "🌊 Liquid (Deep Immersion)",
          glitch: "👾 Glitch (Digital Reality)",
        };
        logger.info("user-interaction", `Path Animation Mode: ${modeNames[nextMode]}`);
      },
    };

    return actions;
  }, []);

  return { getActions };
}
