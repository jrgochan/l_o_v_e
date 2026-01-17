/**
 * Unified Settings Store
 *
 * Centralized state management for all user preferences and configuration.
 * Uses Zustand with localStorage persistence for cross-session settings.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PathAnimationMode, PathComputeMode } from "@/types/atlas-admin";
import type { LogLevel, LogCategory } from "@/utils/logger";
import { logger } from "@/utils/logger";

export type ApiService = "observer" | "listener" | "versor";

/**
 * Layer visibility settings
 */
export interface LayerVisibility {
  soulSphere: boolean;
  emotionPoints: boolean;
  emotionLabels: boolean;
  transitionPaths: boolean;
  waypoints: boolean;
  bridgeHighlight: boolean;
  legend: boolean;
  cinematicOverlay: boolean;
  viewerShortcuts: boolean;
  vacDisplay: boolean;
}

/**
 * Network mode configuration
 */
export interface NetworkConfig {
  mode: "local" | "network";
  customEndpoints: boolean;
  endpoints: {
    observer: string;
    listener: string;
    versor: string;
  };
}

/**
 * Connection status for a service
 */
export interface ServiceStatus {
  connected: boolean;
  latency?: number;
  error?: string;
}

/**
 * Complete connection status
 */
export interface ConnectionStatus {
  observer: ServiceStatus;
  listener: ServiceStatus;
  versor: ServiceStatus;
}

/**
 * Development/Logging Settings
 */
export interface DevelopmentSettings {
  enabled: boolean; // Master toggle
  frontendLogLevel: LogLevel;
  frontendCategories: Record<LogCategory, boolean>;
  backendLogLevel: "ERROR" | "WARNING" | "INFO" | "DEBUG";
}

/**
 * Complete settings state
 */
interface SettingsState {
  // === VISUAL SETTINGS ===
  pathAnimationMode: PathAnimationMode;
  emotionDisplayMode: "simple" | "data"; // Future expansion
  showMotionIndicators: boolean;
  showAxisLabels: boolean;
  colorScheme: "category" | "valence" | "arousal" | "connection";
  pathOpacity: number; // 0-1
  emotionSize: number; // 0.5-2.0
  enableAnimations: boolean;
  dataVisualizationMode: boolean;

  // === BEHAVIOR SETTINGS ===
  computeMode: PathComputeMode;
  showAllPaths: boolean;
  focusMode: boolean;

  // === LAYER VISIBILITY ===
  layers: LayerVisibility;

  // === NETWORK SETTINGS ===
  network: NetworkConfig;

  // === CHAT PREFERENCES ===
  defaultToneMode: "warm" | "clinical";
  defaultDeepFeeling: boolean;
  autoFocusEmotions: boolean;

  // === KEYBOARD SHORTCUTS ===
  enableKeyboardShortcuts: boolean;
  customKeyBindings: Record<string, string>; // Future

  // === ACCESSIBILITY ===
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";

  // === DEVELOPMENT/LOGGING ===
  development: DevelopmentSettings;

  // === POLLING ===
  pollingEnabled: boolean;
  pollingInterval: number;
  userId: string;

  // === VISUAL EXTRAS ===
  autoRotate: boolean;
  renderQuality: "low" | "medium" | "high";
  sphereOpacity: number;
  showDebugInfo: boolean;
  showTransitionPath: boolean;
  animationSpeed: number;

  // === ACTIONS ===
  setApiUrl: (service: ApiService, url: string) => void;
  setPollingEnabled: (enabled: boolean) => void;
  setPollingInterval: (ms: number) => void;
  setUserId: (id: string) => void;
  toggleAutoRotate: () => void;
  setRenderQuality: (quality: "low" | "medium" | "high") => void;
  setSphereOpacity: (opacity: number) => void;
  toggleDebugInfo: () => void;
  setShowTransitionPath: (show: boolean) => void;
  setAnimationSpeed: (speed: number) => void;

  // === ACTIONS ===
  updateVisualSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  updateBehaviorSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  updateNetworkSetting: (config: Partial<NetworkConfig>) => void;
  updateChatSetting: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
  updateLayer: (layer: keyof LayerVisibility, value: boolean) => void;
  updateAccessibilitySetting: <K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => void;

  // Accessibility Helpers
  setReducedMotion: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
  toggleScreenReaderMode: () => void;
  screenReaderMode: boolean; // State

  updateDevelopmentSetting: (config: Partial<DevelopmentSettings>) => void;
  updateDevelopmentCategory: (category: LogCategory, enabled: boolean) => void;

  clearAllData: () => void;

  resetToDefaults: () => void;
  exportSettings: () => string;
  importSettings: (json: string) => boolean;

  testConnection: () => Promise<ConnectionStatus>;
  switchNetworkMode: (mode: "local" | "network") => void;
}

/**
 * Default values
 */
const DEFAULT_VALUES = {
  // Visual
  pathAnimationMode: "subtle" as PathAnimationMode,
  emotionDisplayMode: "simple" as const,
  showMotionIndicators: true,
  showAxisLabels: true,
  colorScheme: "category" as const,
  pathOpacity: 0.6,
  emotionSize: 1.0,
  enableAnimations: true,
  dataVisualizationMode: false,

  // Behavior
  computeMode: "cache-first" as PathComputeMode,
  showAllPaths: true,
  focusMode: false,

  // Layers
  layers: {
    soulSphere: true,
    emotionPoints: true,
    emotionLabels: true,
    transitionPaths: true,
    waypoints: true,
    bridgeHighlight: true,
    legend: false,
    cinematicOverlay: true,
    viewerShortcuts: true,
    vacDisplay: true,
  },

  // Network
  network: {
    mode: "local" as const,
    customEndpoints: false,
    endpoints: {
      observer: "http://localhost:8000",
      listener: "http://localhost:8002",
      versor: "http://localhost:8001",
    },
  },

  // Chat
  defaultToneMode: "warm" as const,
  defaultDeepFeeling: false,
  autoFocusEmotions: true,

  // Keyboard
  enableKeyboardShortcuts: true,
  customKeyBindings: {},

  // Accessibility
  reducedMotion: false,
  highContrast: false,
  fontSize: "medium" as const,
  screenReaderMode: false,

  // Polling
  pollingEnabled: true,
  pollingInterval: 3000,
  userId: "web-user",

  // Visual Extras
  autoRotate: true,
  renderQuality: "medium" as const,
  sphereOpacity: 0.9,
  showDebugInfo: false,
  showTransitionPath: true,
  animationSpeed: 1.0,

  // Development (OFF by default for clean console)
  development: {
    enabled: false,
    frontendLogLevel: "info" as LogLevel,
    frontendCategories: {
      websocket: false,
      api: false,
      hooks: false,
      rendering: false,
      state: false,
      "user-interaction": true, // Keep user interactions visible when enabled
      general: false,
    },
    backendLogLevel: "WARNING" as const,
  },
};

/**
 * Unified Settings Store with localStorage persistence
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      // Initialize with defaults
      ...DEFAULT_VALUES,

      // === ACTIONS ===

      // === ACTIONS ===

      setApiUrl: (service, url) => {
        set((state) => ({
          network: {
            ...state.network,
            endpoints: { ...state.network.endpoints, [service]: url },
          },
        }));
      },

      setPollingEnabled: (enabled) => set({ pollingEnabled: enabled }),
      setPollingInterval: (ms) => set({ pollingInterval: ms }),
      setUserId: (id) => set({ userId: id }),

      toggleAutoRotate: () => set((state) => ({ autoRotate: !state.autoRotate })),
      setRenderQuality: (quality) => set({ renderQuality: quality }),
      setSphereOpacity: (opacity) => set({ sphereOpacity: opacity }),
      toggleDebugInfo: () => set((state) => ({ showDebugInfo: !state.showDebugInfo })),

      setShowTransitionPath: (show) =>
        set((state) => ({
          showTransitionPath: show,
          layers: { ...state.layers, transitionPaths: show }, // Sync with layers
        })),

      setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

      updateVisualSetting: (key, value) => {
        set({ [key]: value });
      },

      updateBehaviorSetting: (key, value) => {
        set({ [key]: value });
      },

      updateNetworkSetting: (config) => {
        set((state) => ({
          network: { ...state.network, ...config },
        }));
      },

      updateChatSetting: (key, value) => {
        set({ [key]: value });
      },

      updateLayer: (layer, value) => {
        set((state) => ({
          layers: { ...state.layers, [layer]: value },
        }));
      },

      updateAccessibilitySetting: (key, value) => {
        set({ [key]: value });
      },

      setReducedMotion: (enabled) => set({ reducedMotion: enabled }),
      setHighContrast: (enabled) => set({ highContrast: enabled }),
      toggleScreenReaderMode: () => set((state) => ({ screenReaderMode: !state.screenReaderMode })),

      clearAllData: () => {
        set(DEFAULT_VALUES);
        localStorage.clear();
        logger.info("state", "All data cleared");
        window.location.reload(); // Force reload to clear all state
      },

      updateDevelopmentSetting: (config) => {
        set((state) => {
          const newDevelopment = { ...state.development, ...config };

          // Sync with logger
          logger.setEnabled(newDevelopment.enabled);
          logger.setLevel(newDevelopment.frontendLogLevel);

          // Update categories in logger
          Object.entries(newDevelopment.frontendCategories).forEach(([category, enabled]) => {
            logger.setCategory(category as LogCategory, enabled);
          });

          return { development: newDevelopment };
        });
      },

      updateDevelopmentCategory: (category, enabled) => {
        set((state) => {
          const newCategories = { ...state.development.frontendCategories, [category]: enabled };
          logger.setCategory(category, enabled);

          return {
            development: {
              ...state.development,
              frontendCategories: newCategories,
            },
          };
        });
      },

      resetToDefaults: () => {
        set(DEFAULT_VALUES);
      },

      exportSettings: () => {
        const state = get();
        const exportData = {
          version: "1.0",
          timestamp: new Date().toISOString(),
          settings: {
            visual: {
              pathAnimationMode: state.pathAnimationMode,
              emotionDisplayMode: state.emotionDisplayMode,
              showMotionIndicators: state.showMotionIndicators,
              showAxisLabels: state.showAxisLabels,
              colorScheme: state.colorScheme,
              pathOpacity: state.pathOpacity,
              emotionSize: state.emotionSize,
              enableAnimations: state.enableAnimations,
              dataVisualizationMode: state.dataVisualizationMode,
            },
            behavior: {
              computeMode: state.computeMode,
              showAllPaths: state.showAllPaths,
              focusMode: state.focusMode,
            },
            layers: state.layers,
            network: state.network,
            chat: {
              defaultToneMode: state.defaultToneMode,
              defaultDeepFeeling: state.defaultDeepFeeling,
              autoFocusEmotions: state.autoFocusEmotions,
            },
            keyboard: {
              enableKeyboardShortcuts: state.enableKeyboardShortcuts,
              customKeyBindings: state.customKeyBindings,
            },
            accessibility: {
              reducedMotion: state.reducedMotion,
              highContrast: state.highContrast,
              fontSize: state.fontSize,
            },
          },
        };
        return JSON.stringify(exportData, null, 2);
      },

      importSettings: (json) => {
        try {
          const imported = JSON.parse(json);

          // Validate structure
          if (!imported.settings || !imported.version) {
            logger.error("state", "Invalid settings format: missing required fields");
            return false;
          }

          // Validate version compatibility
          if (imported.version !== "1.0") {
            logger.warn(
              "state",
              `Settings version mismatch: expected 1.0, got ${imported.version}`
            );
            // For now, proceed anyway - could add migration logic here
          }

          // Validate required sections exist
          const { settings } = imported;
          const requiredSections = [
            "visual",
            "behavior",
            "layers",
            "network",
            "chat",
            "keyboard",
            "accessibility",
          ];
          for (const section of requiredSections) {
            if (!settings[section]) {
              logger.error("state", `Invalid settings format: missing section '${section}'`);
              return false;
            }
          }

          // Validate data types for critical settings
          if (
            typeof settings.visual.pathOpacity !== "number" ||
            settings.visual.pathOpacity < 0 ||
            settings.visual.pathOpacity > 1
          ) {
            logger.error("state", "Invalid pathOpacity value");
            return false;
          }

          if (
            typeof settings.visual.emotionSize !== "number" ||
            settings.visual.emotionSize < 0.5 ||
            settings.visual.emotionSize > 2.0
          ) {
            logger.error("state", "Invalid emotionSize value");
            return false;
          }

          // Apply settings
          set({
            ...settings.visual,
            ...settings.behavior,
            layers: settings.layers,
            network: settings.network,
            ...settings.chat,
            ...settings.keyboard,
            ...settings.accessibility,
          });

          logger.info("state", "Settings imported successfully");
          return true;
        } catch (error) {
          logger.error("state", "Failed to import settings", error);
          return false;
        }
      },

      testConnection: async () => {
        const { network } = get();
        const results: ConnectionStatus = {
          observer: { connected: false },
          listener: { connected: false },
          versor: { connected: false },
        };

        // Test each service
        const services = [
          { name: "observer" as const, url: network.endpoints.observer },
          { name: "listener" as const, url: network.endpoints.listener },
          { name: "versor" as const, url: network.endpoints.versor },
        ];

        await Promise.all(
          services.map(async ({ name, url }) => {
            try {
              const start = Date.now();
              const response = await fetch(`${url}/health`, {
                method: "GET",
                headers: { Accept: "application/json" },
              });
              const latency = Date.now() - start;

              if (response.ok) {
                results[name] = { connected: true, latency };
              } else {
                results[name] = {
                  connected: false,
                  error: `HTTP ${response.status}`,
                };
              }
            } catch (error) {
              results[name] = {
                connected: false,
                error: error instanceof Error ? error.message : "Connection failed",
              };
            }
          })
        );

        return results;
      },

      switchNetworkMode: (mode) => {
        set((state) => {
          const newEndpoints =
            mode === "local"
              ? {
                  observer: "http://localhost:8000",
                  listener: "http://localhost:8002",
                  versor: "http://localhost:8001",
                }
              : {
                  observer:
                    process.env.NEXT_PUBLIC_OBSERVER_URL ||
                    "https://api.love-platform.com/observer",
                  listener:
                    process.env.NEXT_PUBLIC_LISTENER_URL ||
                    "https://api.love-platform.com/listener",
                  versor:
                    process.env.NEXT_PUBLIC_VERSOR_URL || "https://api.love-platform.com/versor",
                };

          return {
            network: {
              ...state.network,
              mode,
              endpoints: state.network.customEndpoints ? state.network.endpoints : newEndpoints,
            },
          };
        });
      },
    }),
    {
      name: "love-settings", // localStorage key
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist user-configurable settings
        pathAnimationMode: state.pathAnimationMode,
        emotionDisplayMode: state.emotionDisplayMode,
        showMotionIndicators: state.showMotionIndicators,
        showAxisLabels: state.showAxisLabels,
        colorScheme: state.colorScheme,
        pathOpacity: state.pathOpacity,
        emotionSize: state.emotionSize,
        enableAnimations: state.enableAnimations,
        dataVisualizationMode: state.dataVisualizationMode,
        computeMode: state.computeMode,
        showAllPaths: state.showAllPaths,
        focusMode: state.focusMode,
        layers: state.layers,
        network: state.network,
        defaultToneMode: state.defaultToneMode,
        defaultDeepFeeling: state.defaultDeepFeeling,
        autoFocusEmotions: state.autoFocusEmotions,
        enableKeyboardShortcuts: state.enableKeyboardShortcuts,
        customKeyBindings: state.customKeyBindings,
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
        fontSize: state.fontSize,
        development: state.development,
        pollingEnabled: state.pollingEnabled,
        pollingInterval: state.pollingInterval,
        userId: state.userId,
        autoRotate: state.autoRotate,
        renderQuality: state.renderQuality,
        sphereOpacity: state.sphereOpacity,
        showDebugInfo: state.showDebugInfo,
        showTransitionPath: state.showTransitionPath,
        animationSpeed: state.animationSpeed,
        screenReaderMode: state.screenReaderMode,
      }),
      merge: mergeSettingsState,
    }
  )
);

/**
 * Merge function for hydration
 * Exported for testing
 */
export function mergeSettingsState(
  persistedState: unknown,
  currentState: SettingsState
): SettingsState {
  const saved = persistedState as Partial<SettingsState>;
  // Deep merge layers to ensure new keys are picked up
  return {
    ...currentState,
    ...saved,
    layers: {
      ...currentState.layers,
      ...(saved.layers || {}),
    },
  };
}
