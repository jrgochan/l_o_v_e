/**
 * Settings Sync Hook
 *
 * One-way synchronization from useSettingsStore to useAtlasAdminStore.
 * Settings Page is the source of truth, atlas store reads from it.
 */

"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

export function useSettingsSync() {
  useEffect(() => {
    // One-way sync: Settings Store → Atlas Store (no circular updates!)
    const syncToAtlas = () => {
      const settings = useSettingsStore.getState();

      // Directly update atlas store state (bypass actions to avoid loops)
      useAtlasAdminStore.setState((state) => ({
        settings: {
          ...state.settings,
          pathAnimationMode: settings.pathAnimationMode,
          showMotionIndicators: settings.showMotionIndicators,
          colorScheme: settings.colorScheme,
          pathOpacity: settings.pathOpacity,
          emotionSize: settings.emotionSize,
          enableAnimations: settings.enableAnimations,
          dataVisualizationMode: settings.dataVisualizationMode,
          computeMode: settings.computeMode,
          showAllPaths: settings.showAllPaths,
          focusMode: settings.focusMode,
        },
        layers: settings.layers,
      }));
    };

    // Initial sync on mount
    syncToAtlas();

    // Subscribe to settings store changes
    const unsubscribe = useSettingsStore.subscribe(() => {
      syncToAtlas();
    });

    return unsubscribe;
  }, []);
}
