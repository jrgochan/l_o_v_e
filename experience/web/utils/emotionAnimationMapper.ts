/**
 * Emotion Animation Mapper
 *
 * Maps VAC coordinates and emotion categories to animation parameters.
 * Each emotion expresses its unique character through motion.
 */

import type { AtlasEmotion, PathAnimationMode } from "@/types/atlas-admin";
import { BRIDGE_EMOTIONS } from "@/types/atlas-admin";

export interface EmotionAnimationParams {
  // Breathing
  breathingRate: number; // Cycle time in seconds
  breathingAmplitude: number; // Scale variation (0-1 range)

  // Rotation
  rotationSpeed: number; // Radians per frame

  // Glow/Emissive
  glowIntensity: number; // Base emissive intensity
  glowPulseSpeed: number; // Pulse cycle time

  // Secondary Motion
  secondaryMotion: "stable" | "orbital" | "recoil" | "reaching";
  secondaryAmplitude: number; // For orbital/recoil/reaching

  // Color
  colorBoost: number; // Brightness multiplier
}

/**
 * Calculate animation parameters for an emotion based on its VAC and category
 */
export function getEmotionAnimationParams(
  emotion: AtlasEmotion,
  mode: PathAnimationMode
): EmotionAnimationParams {
  const { vac, category, name } = emotion;
  const isBridge = (BRIDGE_EMOTIONS as readonly string[]).includes(name);

  // Destructure VAC tuple [valence, arousal, connection]
  const [valence, arousal, connection] = vac;

  // Base parameters modified by mode
  // Using explicit type declaration to enforce consistency with PathAnimationMode
  const modeMultipliers: Record<
    string,
    { breathingMult: number; speedMult: number; amplitudeMult: number }
  > = {
    subtle: { breathingMult: 1.0, speedMult: 0.5, amplitudeMult: 0.7 },
    dynamic: { breathingMult: 0.5, speedMult: 1.5, amplitudeMult: 1.3 },
    mystical: { breathingMult: 0.7, speedMult: 1.0, amplitudeMult: 1.0 },
    crystalline: { breathingMult: 0.0, speedMult: 0.1, amplitudeMult: 0.0 }, // Static
    luminous: { breathingMult: 2.0, speedMult: 0.0, amplitudeMult: 0.2 }, // Fast pulse, no rotation
    liquid: { breathingMult: 0.8, speedMult: 0.3, amplitudeMult: 1.5 }, // Slow, deep shape change
    glitch: { breathingMult: 10.0, speedMult: 0.0, amplitudeMult: 0.1 }, // Strobe flicker
  };

  const mult = modeMultipliers[mode] || modeMultipliers.subtle; // Fallback to subtle

  // 1. BREATHING RATE from AROUSAL
  // High arousal = faster breathing (agitated, activated)
  // Low arousal = slower breathing (calm, peaceful)
  const baseBreathingRate = mapRange(arousal, -1, 1, 4.0, 1.2);
  const breathingRate = baseBreathingRate * mult.breathingMult;

  // 2. BREATHING AMPLITUDE from AROUSAL + VALENCE
  // High arousal + negative = explosive (can't contain)
  // High arousal + positive = expansive (joyful expression)
  // Low arousal = contained (quiet)
  const arousalFactor = Math.abs(arousal);
  const valenceModifier = valence < -0.3 ? 1.3 : 1.0; // Negative adds intensity
  const baseAmplitude = arousalFactor * 0.15 * valenceModifier;
  const breathingAmplitude = baseAmplitude * mult.amplitudeMult;

  // 3. ROTATION SPEED from AROUSAL + MODE
  const baseRotationSpeed = mapRange(Math.abs(arousal), 0, 1, 0.001, 0.008);
  const rotationSpeed = baseRotationSpeed * mult.speedMult;

  // 4. GLOW from CONNECTION
  // High connection = reaching outward (strong emissive)
  // Low connection = isolated (minimal emissive)
  const baseGlow = mapRange(connection, -1, 1, 0.5, 2.5);
  const glowIntensity = isBridge ? baseGlow * 1.5 : baseGlow; // Bridge emotions glow brighter

  // 5. GLOW PULSE SPEED
  // Fast arousal = fast pulse, slow arousal = slow pulse
  const glowPulseSpeed = mapRange(Math.abs(arousal), 0, 1, 5.0, 1.5);

  // 6. SECONDARY MOTION from CATEGORY
  const secondaryMotion = getCategoryMotionType(category);

  // 7. SECONDARY AMPLITUDE from CONNECTION
  const secondaryAmplitude = Math.abs(connection) * 0.3;

  // 8. COLOR BOOST from VALENCE
  // Positive emotions feel "bright", negative feel "intense"
  const colorBoost = mapRange(valence, -1, 1, 0.9, 1.2);

  return {
    breathingRate,
    breathingAmplitude,
    rotationSpeed,
    glowIntensity,
    glowPulseSpeed,
    secondaryMotion,
    secondaryAmplitude,
    colorBoost,
  };
}

/**
 * Map category to secondary motion type
 */
function getCategoryMotionType(category: string): "stable" | "orbital" | "recoil" | "reaching" {
  // Core emotions - stable, authoritative presence
  if (category.includes("Beyond Us") || category.includes("Good")) {
    return "stable";
  }

  // Social emotions - orbital motion (relational)
  if (
    category.includes("Others") ||
    category.includes("Connection") ||
    category.includes("Heart")
  ) {
    return "orbital";
  }

  // Self-conscious emotions - recoil (self-referential)
  if (
    category.includes("Compare") ||
    category.includes("Fall Short") ||
    category.includes("Self-Assess")
  ) {
    return "recoil";
  }

  // Default - reaching (curiosity, growth)
  return "reaching";
}

/**
 * Utility: Map value from one range to another
 */
function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number
): number {
  const clamped = Math.max(inMin, Math.min(inMax, value));
  return outMin + ((clamped - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/**
 * Get descriptive name for emotion's animation character
 */
export function getEmotionAnimationCharacter(emotion: AtlasEmotion): string {
  const [valence, arousal, connection] = emotion.vac;

  // High arousal + negative
  if (arousal > 0.5 && valence < -0.3) {
    return "Explosive & Agitated";
  }

  // High arousal + positive
  if (arousal > 0.5 && valence > 0.3) {
    return "Expansive & Joyful";
  }

  // Low arousal + positive
  if (arousal < -0.3 && valence > 0.3) {
    return "Peaceful & Content";
  }

  // Low arousal + negative
  if (arousal < -0.3 && valence < -0.3) {
    return "Heavy & Quiet";
  }

  // High connection
  if (connection > 0.5) {
    return "Reaching & Connected";
  }

  // Low connection
  if (connection < -0.5) {
    return "Isolated & Alone";
  }

  return "Balanced";
}
