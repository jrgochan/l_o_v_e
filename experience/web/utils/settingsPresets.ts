/**
 * Settings Presets
 *
 * Pre-configured settings for common use cases.
 * Users can load these as starting points or share them with team members.
 */

export interface SettingsPreset {
  id: string;
  name: string;
  description: string;
  icon: string;
  settings: string; // JSON string of settings
}

/**
 * Performance Mode
 * Optimized for maximum FPS and responsiveness
 */
const performancePreset: SettingsPreset = {
  id: "performance",
  name: "Performance Mode",
  description: "Reduced animations and effects for maximum speed and battery life",
  icon: "⚡",
  settings: JSON.stringify(
    {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: {
        visual: {
          pathAnimationMode: "subtle",
          emotionDisplayMode: "simple",
          showMotionIndicators: false,
          colorScheme: "category",
          pathOpacity: 0.4,
          emotionSize: 0.8,
          enableAnimations: false,
          dataVisualizationMode: false,
        },
        behavior: {
          computeMode: "manual",
          showAllPaths: false,
          focusMode: true,
        },
        layers: {
          soulSphere: true,
          emotionPoints: true,
          emotionLabels: true,
          transitionPaths: false,
          waypoints: false,
          bridgeHighlight: false,
          legend: true,
        },
        network: {
          mode: "local",
          customEndpoints: false,
          endpoints: {
            observer: "http://localhost:8000",
            listener: "http://localhost:8002",
            versor: "http://localhost:8001",
          },
        },
        chat: {
          defaultToneMode: "warm",
          defaultDeepFeeling: false,
          autoFocusEmotions: true,
        },
        keyboard: {
          enableKeyboardShortcuts: true,
          customKeyBindings: {},
        },
        accessibility: {
          reducedMotion: true,
          highContrast: false,
          fontSize: "medium",
        },
      },
    },
    null,
    2
  ),
};

/**
 * Clinical Mode
 * Professional settings for therapeutic contexts
 */
const clinicalPreset: SettingsPreset = {
  id: "clinical",
  name: "Clinical Mode",
  description: "High contrast, clinical tone, optimized for professional therapeutic work",
  icon: "🏥",
  settings: JSON.stringify(
    {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: {
        visual: {
          pathAnimationMode: "subtle",
          emotionDisplayMode: "data",
          showMotionIndicators: true,
          colorScheme: "valence",
          pathOpacity: 0.7,
          emotionSize: 1.0,
          enableAnimations: true,
          dataVisualizationMode: false,
        },
        behavior: {
          computeMode: "cache-first",
          showAllPaths: true,
          focusMode: false,
        },
        layers: {
          soulSphere: true,
          emotionPoints: true,
          emotionLabels: true,
          transitionPaths: true,
          waypoints: true,
          bridgeHighlight: true,
          legend: true,
        },
        network: {
          mode: "local",
          customEndpoints: false,
          endpoints: {
            observer: "http://localhost:8000",
            listener: "http://localhost:8002",
            versor: "http://localhost:8001",
          },
        },
        chat: {
          defaultToneMode: "clinical",
          defaultDeepFeeling: true,
          autoFocusEmotions: true,
        },
        keyboard: {
          enableKeyboardShortcuts: true,
          customKeyBindings: {},
        },
        accessibility: {
          reducedMotion: false,
          highContrast: true,
          fontSize: "large",
        },
      },
    },
    null,
    2
  ),
};

/**
 * Demo/Presentation Mode
 * Visually impressive settings for demonstrations
 */
const demoPreset: SettingsPreset = {
  id: "demo",
  name: "Demo Mode",
  description: "Beautiful animations and effects for presentations and demonstrations",
  icon: "✨",
  settings: JSON.stringify(
    {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: {
        visual: {
          pathAnimationMode: "mystical",
          emotionDisplayMode: "simple",
          showMotionIndicators: true,
          colorScheme: "category",
          pathOpacity: 0.8,
          emotionSize: 1.3,
          enableAnimations: true,
          dataVisualizationMode: false,
        },
        behavior: {
          computeMode: "always",
          showAllPaths: true,
          focusMode: false,
        },
        layers: {
          soulSphere: true,
          emotionPoints: true,
          emotionLabels: true,
          transitionPaths: true,
          waypoints: true,
          bridgeHighlight: true,
          legend: true,
        },
        network: {
          mode: "local",
          customEndpoints: false,
          endpoints: {
            observer: "http://localhost:8000",
            listener: "http://localhost:8002",
            versor: "http://localhost:8001",
          },
        },
        chat: {
          defaultToneMode: "warm",
          defaultDeepFeeling: false,
          autoFocusEmotions: true,
        },
        keyboard: {
          enableKeyboardShortcuts: true,
          customKeyBindings: {},
        },
        accessibility: {
          reducedMotion: false,
          highContrast: false,
          fontSize: "medium",
        },
      },
    },
    null,
    2
  ),
};

/**
 * Accessibility Mode
 * Maximum accessibility features enabled
 */
const accessibilityPreset: SettingsPreset = {
  id: "accessibility",
  name: "Accessibility Mode",
  description: "Optimized for screen readers, keyboard navigation, and visual clarity",
  icon: "♿",
  settings: JSON.stringify(
    {
      version: "1.0",
      timestamp: new Date().toISOString(),
      settings: {
        visual: {
          pathAnimationMode: "subtle",
          emotionDisplayMode: "simple",
          showMotionIndicators: false,
          colorScheme: "category",
          pathOpacity: 0.8,
          emotionSize: 1.2,
          enableAnimations: false,
          dataVisualizationMode: false,
        },
        behavior: {
          computeMode: "cache-first",
          showAllPaths: false,
          focusMode: true,
        },
        layers: {
          soulSphere: true,
          emotionPoints: true,
          emotionLabels: true,
          transitionPaths: true,
          waypoints: true,
          bridgeHighlight: true,
          legend: true,
        },
        network: {
          mode: "local",
          customEndpoints: false,
          endpoints: {
            observer: "http://localhost:8000",
            listener: "http://localhost:8002",
            versor: "http://localhost:8001",
          },
        },
        chat: {
          defaultToneMode: "warm",
          defaultDeepFeeling: false,
          autoFocusEmotions: true,
        },
        keyboard: {
          enableKeyboardShortcuts: true,
          customKeyBindings: {},
        },
        accessibility: {
          reducedMotion: true,
          highContrast: true,
          fontSize: "large",
        },
      },
    },
    null,
    2
  ),
};

/**
 * All available presets
 */
export const SETTINGS_PRESETS: SettingsPreset[] = [
  performancePreset,
  clinicalPreset,
  demoPreset,
  accessibilityPreset,
];

/**
 * Get a preset by ID
 */
export function getPresetById(id: string): SettingsPreset | undefined {
  return SETTINGS_PRESETS.find((preset) => preset.id === id);
}

/**
 * Get preset names for UI
 */
export function getPresetNames(): Array<{ id: string; name: string; icon: string }> {
  return SETTINGS_PRESETS.map(({ id, name, icon }) => ({ id, name, icon }));
}
