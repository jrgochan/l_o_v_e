/**
 * Visual Configuration for Three Emotion Rendering Modes
 *
 * Defines distinct visual identities for:
 * - SUBTLE: Clinical clarity, professional therapeutic
 * - DYNAMIC: Living energy, vibrant and kinetic
 * - MYSTICAL: Cosmic consciousness, ethereal and transcendent
 */

import type { PathAnimationMode } from "@/types/atlas-admin";
import * as THREE from "three";

/**
 * Material configuration for a mode
 */
export interface MaterialConfig {
  metalness: number;
  roughness: number;
  emissiveIntensityBase: number;
  emissiveIntensityRange: [number, number]; // [min, max]
  transparent: boolean;
  opacityBase: number;
  fresnelStrength: number; // For rim lighting effects
}

/**
 * Color configuration for a mode
 */
export interface ColorConfig {
  saturationMultiplier: number; // Applied to category colors
  luminosityMultiplier: number; // Brightness adjustment
  useGradients: boolean; // Enable color gradients
  undertone?: string; // Hex color mixed into all colors
  valenceTempShift: number; // Temperature shift based on valence (0-1)
  arousalBrightnessRange: [number, number]; // [min, max] brightness from arousal
}

/**
 * Lighting configuration for a mode
 */
export interface LightingConfig {
  ambientIntensity: number;
  keyLightIntensity: number;
  keyLightPosition: [number, number, number];
  fillLightIntensity: number;
  fillLightPosition: [number, number, number];
  enableEmotionLights: boolean; // Per-emotion point lights
  emotionLightIntensity: number;
  emotionLightDistance: number;
  castShadows: boolean;
  shadowIntensity: number;
}

/**
 * Animation configuration for a mode
 */
export interface AnimationConfig {
  breathingSpeedMultiplier: number;
  breathingAmplitudeMultiplier: number;
  rotationSpeedMultiplier: number;
  secondaryMotionMultiplier: number;
  easingFunction: string; // CSS easing function name
  floatEnabled: boolean; // Vertical oscillation
  floatAmplitude: number;
  floatSpeed: number;
}

/**
 * Particle configuration for a mode
 */
export interface ParticleConfig {
  enabled: boolean;
  density: number; // Particles per emotion
  particleSize: number;
  speedMultiplier: number;
  maxDistance: number; // How far particles travel
  opacity: number;
  enableTrails: boolean;
  enableBursts: boolean; // On interaction
  enableAuras: boolean; // Floating around emotion
}

/**
 * Post-processing configuration for a mode
 */
export interface PostProcessingConfig {
  bloomEnabled: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  vignetteEnabled: boolean;
  vignetteIntensity: number;
  chromaticAberrationEnabled: boolean;
  chromaticAberrationStrength: number;
}

/**
 * Complete visual configuration for a mode
 */
export interface ModeVisualConfig {
  name: string;
  description: string;
  materials: MaterialConfig;
  colors: ColorConfig;
  lighting: LightingConfig;
  animations: AnimationConfig;
  particles: ParticleConfig;
  postProcessing: PostProcessingConfig;
}

/**
 * SUBTLE MODE: Clinical Clarity
 * Professional, therapeutic, non-distracting
 */
export const SUBTLE_MODE_CONFIG: ModeVisualConfig = {
  name: "Subtle",
  description: "Clinical clarity - Professional therapeutic environment",

  materials: {
    metalness: 0.2,
    roughness: 0.6,
    emissiveIntensityBase: 0.5,
    emissiveIntensityRange: [0.3, 0.8],
    transparent: false,
    opacityBase: 1.0,
    fresnelStrength: 0.2,
  },

  colors: {
    saturationMultiplier: 0.7,
    luminosityMultiplier: 1.0,
    useGradients: false,
    valenceTempShift: 0.15,
    arousalBrightnessRange: [0.85, 1.15],
  },

  lighting: {
    ambientIntensity: 0.6,
    keyLightIntensity: 1.0,
    keyLightPosition: [5, 5, 5],
    fillLightIntensity: 0.5,
    fillLightPosition: [-3, 2, -3],
    enableEmotionLights: false,
    emotionLightIntensity: 0.3,
    emotionLightDistance: 3.0,
    castShadows: true,
    shadowIntensity: 0.2, // Softer shadows for clinical comfort
  },

  animations: {
    breathingSpeedMultiplier: 1.0,
    breathingAmplitudeMultiplier: 0.5, // Reduced from 0.7 for more subtle presence
    rotationSpeedMultiplier: 0.5,
    secondaryMotionMultiplier: 0.7,
    easingFunction: "ease-in-out",
    floatEnabled: false,
    floatAmplitude: 0.0,
    floatSpeed: 0.0,
  },

  particles: {
    enabled: false,
    density: 0,
    particleSize: 0.01,
    speedMultiplier: 0.5,
    maxDistance: 0.5,
    opacity: 0.3,
    enableTrails: false,
    enableBursts: false,
    enableAuras: false,
  },

  postProcessing: {
    bloomEnabled: false,
    bloomStrength: 0.3,
    bloomRadius: 0.5,
    bloomThreshold: 0.85,
    vignetteEnabled: false,
    vignetteIntensity: 0.2,
    chromaticAberrationEnabled: false,
    chromaticAberrationStrength: 0.0,
  },
};

/**
 * DYNAMIC MODE: Living Energy
 * Vibrant, expressive, kinetic
 */
export const DYNAMIC_MODE_CONFIG: ModeVisualConfig = {
  name: "Dynamic",
  description: "Living energy - Vibrant and expressive",

  materials: {
    metalness: 0.7,
    roughness: 0.2,
    emissiveIntensityBase: 1.5,
    emissiveIntensityRange: [1.0, 2.5],
    transparent: true,
    opacityBase: 0.95,
    fresnelStrength: 0.8,
  },

  colors: {
    saturationMultiplier: 1.3,
    luminosityMultiplier: 1.1,
    useGradients: true,
    valenceTempShift: 0.6, // Enhanced from 0.4 for more dramatic color shifts
    arousalBrightnessRange: [0.7, 1.4],
  },

  lighting: {
    ambientIntensity: 0.4,
    keyLightIntensity: 1.5,
    keyLightPosition: [8, 3, 5],
    fillLightIntensity: 0.6,
    fillLightPosition: [-6, -2, -4],
    enableEmotionLights: true,
    emotionLightIntensity: 1.2,
    emotionLightDistance: 5.0,
    castShadows: true,
    shadowIntensity: 0.6,
  },

  animations: {
    breathingSpeedMultiplier: 0.5,
    breathingAmplitudeMultiplier: 1.3,
    rotationSpeedMultiplier: 1.5,
    secondaryMotionMultiplier: 1.3,
    easingFunction: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", // Overshoot for bouncy feel
    floatEnabled: true, // Enable bouncy floating for kinetic energy
    floatAmplitude: 0.12, // Larger amplitude than mystical for bouncy character
    floatSpeed: 0.8, // Faster than mystical for energetic feel
  },

  particles: {
    enabled: true,
    density: 20,
    particleSize: 0.02,
    speedMultiplier: 1.5,
    maxDistance: 1.2,
    opacity: 0.6,
    enableTrails: true,
    enableBursts: true,
    enableAuras: true,
  },

  postProcessing: {
    bloomEnabled: true,
    bloomStrength: 1.2,
    bloomRadius: 0.8,
    bloomThreshold: 0.5,
    vignetteEnabled: true,
    vignetteIntensity: 0.3,
    chromaticAberrationEnabled: true,
    chromaticAberrationStrength: 0.002,
  },
};

/**
 * MYSTICAL MODE: Cosmic Consciousness
 * Ethereal, spiritual, transcendent
 */
export const MYSTICAL_MODE_CONFIG: ModeVisualConfig = {
  name: "Mystical",
  description: "Cosmic consciousness - Ethereal and transcendent",

  materials: {
    metalness: 0.4,
    roughness: 0.3,
    emissiveIntensityBase: 1.2,
    emissiveIntensityRange: [0.8, 1.8],
    transparent: true,
    opacityBase: 0.6,
    fresnelStrength: 0.5,
  },

  colors: {
    saturationMultiplier: 0.8,
    luminosityMultiplier: 1.3,
    useGradients: true,
    undertone: "#4A3B77", // Purple/blue mystical undertone
    valenceTempShift: 0.3,
    arousalBrightnessRange: [0.8, 1.25],
  },

  lighting: {
    ambientIntensity: 0.2,
    keyLightIntensity: 0.6,
    keyLightPosition: [4, 8, 4],
    fillLightIntensity: 0.3,
    fillLightPosition: [-3, -3, -3],
    enableEmotionLights: true,
    emotionLightIntensity: 0.8,
    emotionLightDistance: 4.0,
    castShadows: false,
    shadowIntensity: 0.1,
  },

  animations: {
    breathingSpeedMultiplier: 0.7,
    breathingAmplitudeMultiplier: 1.0,
    rotationSpeedMultiplier: 0.7,
    secondaryMotionMultiplier: 1.0,
    easingFunction: "cubic-bezier(0.4, 0, 0.2, 1)", // Smooth flow
    floatEnabled: true,
    floatAmplitude: 0.08,
    floatSpeed: 0.3,
  },

  particles: {
    enabled: true,
    density: 15,
    particleSize: 0.015,
    speedMultiplier: 0.6,
    maxDistance: 1.0,
    opacity: 0.5,
    enableTrails: true,
    enableBursts: false,
    enableAuras: true,
  },

  postProcessing: {
    bloomEnabled: true,
    bloomStrength: 1.8,
    bloomRadius: 1.2,
    bloomThreshold: 0.3,
    vignetteEnabled: true,
    vignetteIntensity: 0.5,
    chromaticAberrationEnabled: false,
    chromaticAberrationStrength: 0.0,
  },
};

/**
 * Map PathAnimationMode to ModeVisualConfig
 */
export const MODE_CONFIGS: Record<PathAnimationMode, ModeVisualConfig> = {
  subtle: SUBTLE_MODE_CONFIG,
  dynamic: DYNAMIC_MODE_CONFIG,
  mystical: MYSTICAL_MODE_CONFIG,
};

/**
 * Get visual config for a mode
 */
export function getModeConfig(mode: PathAnimationMode): ModeVisualConfig {
  return MODE_CONFIGS[mode];
}

/**
 * Helper: Adjust color based on mode config
 */
export function applyColorConfig(
  baseColor: THREE.Color,
  colorConfig: ColorConfig,
  valence: number,
  arousal: number
): THREE.Color {
  const color = baseColor.clone();

  // Apply saturation multiplier
  const hsl = { h: 0, s: 0, l: 0 };
  color.getHSL(hsl);
  hsl.s *= colorConfig.saturationMultiplier;
  hsl.l *= colorConfig.luminosityMultiplier;

  // Apply arousal brightness
  const arousalFactor = (arousal + 1) / 2; // Normalize to 0-1
  const brightnessMultiplier = THREE.MathUtils.lerp(
    colorConfig.arousalBrightnessRange[0],
    colorConfig.arousalBrightnessRange[1],
    arousalFactor
  );
  hsl.l *= brightnessMultiplier;

  color.setHSL(hsl.h, Math.min(hsl.s, 1), Math.min(hsl.l, 1));

  // Apply temperature shift based on valence
  if (colorConfig.valenceTempShift > 0) {
    const tempColor =
      valence > 0
        ? new THREE.Color("#FFA500") // Warm orange
        : new THREE.Color("#00CED1"); // Cool cyan

    color.lerp(tempColor, Math.abs(valence) * colorConfig.valenceTempShift);
  }

  // Apply undertone if specified
  if (colorConfig.undertone) {
    const undertone = new THREE.Color(colorConfig.undertone);
    color.lerp(undertone, 0.15);
  }

  return color;
}

/**
 * Helper: Calculate emissive intensity based on mode and VAC
 */
export function calculateEmissiveIntensity(
  config: MaterialConfig,
  connection: number,
  glowPulse: number = 1.0
): number {
  const [min, max] = config.emissiveIntensityRange;
  const connectionFactor = (connection + 1) / 2; // Normalize to 0-1
  const baseIntensity = THREE.MathUtils.lerp(min, max, connectionFactor);
  return baseIntensity * glowPulse;
}
