/**
 * Quaternion Utilities
 *
 * Provides quaternion math operations for the Experience module.
 * While the Versor API provides authoritative quaternions, these utilities
 * allow for local calculations and SLERP interpolation.
 */

import { VACVector, Quaternion } from "./vac";

/**
 * Convert VAC vector to quaternion representation
 *
 * This is a simplified local implementation. For production, the Versor API
 * provides the authoritative conversion with proper mathematical rigor.
 *
 * @param vac [valence, arousal, connection]
 * @returns [w, x, y, z] quaternion
 */
export function vacToQuaternion(vac: VACVector): Quaternion {
  const [valence, arousal, connection] = vac;

  // Normalize to ensure we're working with unit vectors
  const magnitude = Math.sqrt(valence * valence + arousal * arousal + connection * connection);

  // Handle zero vector (neutral state)
  if (magnitude < 0.0001) {
    return [1, 0, 0, 0]; // Identity quaternion
  }

  const normalizedV = valence / magnitude;
  const normalizedA = arousal / magnitude;
  const normalizedC = connection / magnitude;

  // Convert to axis-angle representation
  // The axis is the normalized VAC vector
  // The angle is proportional to the magnitude
  const angle = (magnitude * Math.PI) / 2; // Scale to reasonable rotation
  const halfAngle = angle / 2;

  const sinHalfAngle = Math.sin(halfAngle);
  const cosHalfAngle = Math.cos(halfAngle);

  // Construct quaternion from axis-angle
  const w = cosHalfAngle;
  const x = normalizedV * sinHalfAngle;
  const y = normalizedA * sinHalfAngle;
  const z = normalizedC * sinHalfAngle;

  return [w, x, y, z];
}

/**
 * Calculate the angular distance between two quaternions
 *
 * @param q1 First quaternion
 * @param q2 Second quaternion
 * @returns Angular distance in radians
 */
export function angularDistance(q1: Quaternion, q2: Quaternion): number {
  // Compute dot product
  const dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];

  // Clamp to avoid numerical errors in acos
  const clampedDot = Math.max(-1, Math.min(1, Math.abs(dot)));

  // Angular distance is 2 * arccos(|dot|)
  return 2 * Math.acos(clampedDot);
}

/**
 * Spherical Linear Interpolation (SLERP) between two quaternions
 *
 * @param q1 Start quaternion
 * @param q2 End quaternion
 * @param t Interpolation parameter [0, 1]
 * @returns Interpolated quaternion
 */
export function slerp(q1: Quaternion, q2: Quaternion, t: number): Quaternion {
  // Calculate dot product
  let dot = q1[0] * q2[0] + q1[1] * q2[1] + q1[2] * q2[2] + q1[3] * q2[3];

  // If dot product is negative, negate one quaternion to take shorter path
  let q2Adjusted: Quaternion = [...q2];
  if (dot < 0) {
    q2Adjusted = [-q2[0], -q2[1], -q2[2], -q2[3]];
    dot = -dot;
  }

  // Clamp dot product
  dot = Math.max(-1, Math.min(1, dot));

  // If quaternions are very close, use linear interpolation
  if (dot > 0.9995) {
    return normalize([
      q1[0] + t * (q2Adjusted[0] - q1[0]),
      q1[1] + t * (q2Adjusted[1] - q1[1]),
      q1[2] + t * (q2Adjusted[2] - q1[2]),
      q1[3] + t * (q2Adjusted[3] - q1[3]),
    ]);
  }

  // Calculate angle between quaternions
  const theta = Math.acos(dot);
  const sinTheta = Math.sin(theta);

  // Calculate interpolation coefficients
  const coeff1 = Math.sin((1 - t) * theta) / sinTheta;
  const coeff2 = Math.sin(t * theta) / sinTheta;

  // Perform spherical linear interpolation
  return [
    coeff1 * q1[0] + coeff2 * q2Adjusted[0],
    coeff1 * q1[1] + coeff2 * q2Adjusted[1],
    coeff1 * q1[2] + coeff2 * q2Adjusted[2],
    coeff1 * q1[3] + coeff2 * q2Adjusted[3],
  ];
}

/**
 * Normalize a quaternion to unit length
 *
 * @param q Quaternion to normalize
 * @returns Normalized quaternion
 */
export function normalize(q: Quaternion): Quaternion {
  const magnitude = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);

  if (magnitude < 0.0001) {
    return [1, 0, 0, 0]; // Return identity if near zero
  }

  return [q[0] / magnitude, q[1] / magnitude, q[2] / magnitude, q[3] / magnitude];
}

/**
 * Multiply two quaternions
 *
 * @param q1 First quaternion
 * @param q2 Second quaternion
 * @returns Product quaternion
 */
export function multiply(q1: Quaternion, q2: Quaternion): Quaternion {
  const [w1, x1, y1, z1] = q1;
  const [w2, x2, y2, z2] = q2;

  return [
    w1 * w2 - x1 * x2 - y1 * y2 - z1 * z2,
    w1 * x2 + x1 * w2 + y1 * z2 - z1 * y2,
    w1 * y2 - x1 * z2 + y1 * w2 + z1 * x2,
    w1 * z2 + x1 * y2 - y1 * x2 + z1 * w2,
  ];
}

/**
 * Calculate the conjugate of a quaternion
 *
 * @param q Quaternion
 * @returns Conjugate quaternion
 */
export function conjugate(q: Quaternion): Quaternion {
  return [q[0], -q[1], -q[2], -q[3]];
}

/**
 * Calculate angular velocity from two quaternions and time delta
 *
 * @param q1 Previous quaternion
 * @param q2 Current quaternion
 * @param deltaTime Time difference in seconds
 * @returns Angular velocity in radians per second
 */
export function angularVelocity(q1: Quaternion, q2: Quaternion, deltaTime: number): number {
  const distance = angularDistance(q1, q2);
  return distance / deltaTime;
}

/**
 * Check if a quaternion is valid (approximately unit length)
 *
 * @param q Quaternion to validate
 * @param tolerance Tolerance for unit length check
 * @returns true if valid
 */
export function isValid(q: Quaternion, tolerance: number = 0.01): boolean {
  const magnitudeSquared = q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3];
  return Math.abs(magnitudeSquared - 1.0) < tolerance;
}

/**
 * Identity quaternion (no rotation)
 */
export const IDENTITY: Quaternion = [1, 0, 0, 0];

/**
 * Generate a sequence of quaternions for smooth animation
 *
 * @param start Starting quaternion
 * @param end Ending quaternion
 * @param steps Number of interpolation steps
 * @returns Array of interpolated quaternions
 */
export function generateSlerpPath(
  start: Quaternion,
  end: Quaternion,
  steps: number = 60
): Quaternion[] {
  const path: Quaternion[] = [];

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    path.push(slerp(start, end, t));
  }

  return path;
}
