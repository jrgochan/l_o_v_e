/**
 * VAC (Valence-Arousal-Connection) Model
 *
 * Core type definitions and canonical emotional states for the L.O.V.E. Experience module.
 * This is the foundation of the emotional visualization system.
 */

/**
 * VAC Vector: [Valence, Arousal, Connection]
 *
 * Each component ranges from -1.0 to 1.0:
 * - Valence: Negative (unpleasant) to Positive (pleasant)
 * - Arousal: Low (calm) to High (excited/chaotic)
 * - Connection: Disconnected (isolated) to Connected (related)
 */
export type VACVector = [number, number, number];

/**
 * Quaternion: [w, x, y, z]
 *
 * Represents 3D rotation in quaternion form.
 * Used for smooth spherical interpolation (SLERP) of emotional states.
 */
export type Quaternion = [number, number, number, number];

/**
 * Haptic feedback modes
 */
export type HapticMode = "normal" | "quiet";

/**
 * Canonical Emotional State
 *
 * Defines a named emotion with its VAC coordinates
 */
export interface CanonicalEmotion {
  name: string;
  vac: VACVector;
}

/**
 * Initial neutral state
 * Represents emotional equilibrium
 */
export const NEUTRAL_VAC: VACVector = [0, 0, 0];

/**
 * Identity quaternion (no rotation)
 */
export const IDENTITY_QUATERNION: Quaternion = [1, 0, 0, 0];

/**
 * Canonical emotional states for testing and reference
 *
 * These 9 emotions represent key points in the VAC emotional space.
 * They are used for:
 * - Visual testing and calibration
 * - User education about the VAC model
 * - Benchmark comparisons
 * - Debug controls
 */
export const CANONICAL_EMOTIONS: Record<string, CanonicalEmotion> = {
  neutral: {
    name: "Neutral",
    vac: [0, 0, 0],
  },
  joy: {
    name: "Joy",
    vac: [0.9, 0.7, 0.8],
  },
  shame: {
    name: "Shame",
    vac: [-0.9, -0.1, -1.0],
  },
  grief: {
    name: "Grief",
    vac: [-0.9, -0.4, 0.5],
  },
  despair: {
    name: "Despair",
    vac: [-0.9, -0.4, -0.8],
  },
  compassion: {
    name: "Compassion",
    vac: [0.3, 0.2, 0.9],
  },
  pity: {
    name: "Pity",
    vac: [0.3, 0.2, -0.6],
  },
  excitement: {
    name: "Excitement",
    vac: [0.8, 0.9, 0.6],
  },
  calm: {
    name: "Calm",
    vac: [0.5, -0.8, 0.4],
  },
};

/**
 * Get a list of all canonical emotion names
 */
export function getCanonicalEmotionNames(): string[] {
  return Object.keys(CANONICAL_EMOTIONS);
}

/**
 * Get a canonical emotion by name (case-insensitive)
 */
export function getCanonicalEmotion(name: string): CanonicalEmotion | undefined {
  const key = name.toLowerCase();
  return CANONICAL_EMOTIONS[key];
}

/**
 * Validate a VAC vector
 *
 * @param vac - VAC vector to validate
 * @returns true if valid (all components in range [-1, 1])
 */
export function isValidVAC(vac: VACVector): boolean {
  return vac.every((component) => component >= -1 && component <= 1);
}

/**
 * Clamp a VAC vector to valid range
 *
 * @param vac - VAC vector to clamp
 * @returns Clamped VAC vector
 */
export function clampVAC(vac: VACVector): VACVector {
  return vac.map((component) => Math.max(-1, Math.min(1, component))) as VACVector;
}

/**
 * Calculate Euclidean distance between two VAC vectors
 *
 * @param vac1 - First VAC vector
 * @param vac2 - Second VAC vector
 * @returns Distance between vectors
 */
export function vacDistance(vac1: VACVector, vac2: VACVector): number {
  const [v1, a1, c1] = vac1;
  const [v2, a2, c2] = vac2;

  const dv = v2 - v1;
  const da = a2 - a1;
  const dc = c2 - c1;

  return Math.sqrt(dv * dv + da * da + dc * dc);
}

/**
 * Linearly interpolate between two VAC vectors
 *
 * @param vac1 - Start VAC vector
 * @param vac2 - End VAC vector
 * @param t - Interpolation factor [0, 1]
 * @returns Interpolated VAC vector
 */
export function vacLerp(vac1: VACVector, vac2: VACVector, t: number): VACVector {
  const [v1, a1, c1] = vac1;
  const [v2, a2, c2] = vac2;

  return [v1 + (v2 - v1) * t, a1 + (a2 - a1) * t, c1 + (c2 - c1) * t];
}

/**
 * Get the magnitude of a VAC vector
 *
 * @param vac - VAC vector
 * @returns Magnitude (length) of vector
 */
export function vacMagnitude(vac: VACVector): number {
  const [v, a, c] = vac;
  return Math.sqrt(v * v + a * a + c * c);
}

/**
 * Normalize a VAC vector to unit length
 *
 * @param vac - VAC vector to normalize
 * @returns Normalized VAC vector (or neutral if zero-length)
 */
export function vacNormalize(vac: VACVector): VACVector {
  const mag = vacMagnitude(vac);

  if (mag < 0.0001) {
    return NEUTRAL_VAC;
  }

  return vac.map((component) => component / mag) as VACVector;
}
