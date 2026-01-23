/**
 * Shared Type Definitions
 *
 * Re-exports core types for convenience and provides additional
 * shared types for platform-specific implementations.
 */

// Re-export core types
export type { VACVector, Quaternion, HapticMode, CanonicalEmotion } from "../core/vac";

export type { ObserverEmotionResponse, ObserverHistoryResponse, Emotion, EmotionsResponse } from "../api/observer";

/**
 * Store interface types (for platform-specific implementations)
 * These define the shape but let each platform implement with their own state management
 */
export interface EmotionalState {
  targetVAC: [number, number, number];
  targetQuaternion: [number, number, number, number];
  currentVAC: [number, number, number];
  currentQuaternion: [number, number, number, number];
  angularVelocity: number;
  elasticity: number;
  isAnimating: boolean;
}

export interface EmotionalSettings {
  hapticMode: "normal" | "quiet";
  colorblindMode: boolean;
  reducedMotion: boolean;
}

/**
 * Platform detection helper type
 */
export type Platform = "web" | "ios" | "android" | "native";

/**
 * Animation frame callback type
 */
export type AnimationCallback = (deltaTime: number) => void;
