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
        const newVal = !state.layers.emotionLabels;
        state.updateLayer("emotionLabels", newVal);
        const status = newVal ? "ON" : "OFF";
        logger.info("user-interaction", `Labels: ${status}`);
      },
      s: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.layers.soulSphere;
        state.updateLayer("soulSphere", newVal);
        const status = newVal ? "ON" : "OFF";
        logger.info("user-interaction", `Soul Sphere: ${status}`);
      },
      g: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.layers.legend;
        state.updateLayer("legend", newVal);
        const status = newVal ? "ON" : "OFF";
        logger.info("user-interaction", `Legend: ${status}`);
      },
      a: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.showAxisLabels;
        state.updateVisualSetting("showAxisLabels", newVal);
        const status = newVal ? "ON - Showing VAC axes" : "OFF - Hidden";
        logger.info("user-interaction", `Axis Labels & Grids: ${status}`);
      },
      f: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.focusMode;
        state.updateBehaviorSetting("focusMode", newVal);
        const status = newVal ? "ON - Hiding unselected emotions" : "OFF - Showing all";
        logger.info("user-interaction", `Focus mode: ${status}`);
      },
      e: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.layers.emotionPoints;
        state.updateLayer("emotionPoints", newVal);
        const status = newVal ? "ON" : "OFF";
        logger.info("user-interaction", `Emotion Points: ${status}`);
      },
      p: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.layers.transitionPaths;
        state.updateLayer("transitionPaths", newVal);
        const status = newVal ? "ON" : "OFF";
        logger.info("user-interaction", `Paths: ${status}`);
      },
      o: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.showMotionIndicators;
        state.updateVisualSetting("showMotionIndicators", newVal);
        const status = newVal ? "ON - Showing category motion types" : "OFF - Hidden";
        logger.info("user-interaction", `Motion Indicators: ${status}`);
      },
      x: () => {
        const state = useSettingsStore.getState();
        const newVal = !state.dataVisualizationMode;
        state.updateVisualSetting("dataVisualizationMode", newVal);
        const status = newVal
          ? "ON - Showing all emotions with VAC coordinates"
          : "OFF - Normal view";
        logger.info("user-interaction", `Data Visualization Mode: ${status}`);
      },
      v: () => {
        const state = useSettingsStore.getState();
        const modes: Array<
          "subtle" | "dynamic" | "mystical" | "crystalline" | "luminous" | "liquid" | "glitch"
        > = ["subtle", "dynamic", "mystical", "crystalline", "luminous", "liquid", "glitch"];
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
