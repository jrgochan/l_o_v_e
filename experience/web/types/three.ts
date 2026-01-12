/**
 * Three.js & React Three Fiber Types
 *
 * Centralized type definitions for Three.js and R3F usage.
 * Provides consistent event handling and ref types across all 3D components.
 *
 * USAGE:
 * - All components using @react-three/fiber
 * - 3D event handlers (click, hover, etc.)
 * - Mesh/Material refs
 * - Animation types
 */

import type { ThreeEvent as R3FThreeEvent } from "@react-three/fiber";
import * as THREE from "three";

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * Generic Three.js event from React Three Fiber
 *
 * Use this for click, pointer events on 3D objects
 *
 * @example
 * ```tsx
 * const handleClick = (e: ThreeEvent<MouseEvent>) => {
 *   e.stopPropagation();
 *   console.log('Clicked', e.object);
 * };
 * ```
 */
export type ThreeEvent<T extends Event = PointerEvent> = R3FThreeEvent<T>;

/**
 * Pointer event on 3D object
 */
export type ThreePointerEvent = R3FThreeEvent<PointerEvent>;

/**
 * Mouse event on 3D object
 */
export type ThreeMouseEvent = R3FThreeEvent<MouseEvent>;

/**
 * Wheel event on 3D object
 */
export type ThreeWheelEvent = R3FThreeEvent<WheelEvent>;

// ============================================================================
// REF TYPES
// ============================================================================

/**
 * Ref to a Three.js Mesh
 */
export type MeshRef = React.RefObject<THREE.Mesh | null>;

/**
 * Ref to a Three.js MeshStandardMaterial
 */
export type MaterialRef = React.RefObject<THREE.MeshStandardMaterial | null>;

/**
 * Ref to a Three.js Group
 */
export type GroupRef = React.RefObject<THREE.Group | null>;

// ============================================================================
// ANIMATION TYPES
// ============================================================================

/**
 * Breathing animation configuration
 */
export interface BreathingAnimation {
  enabled: boolean;
  rate: number; // Seconds per breath cycle
  amplitude: number; // Scale multiplier (0-1)
}

/**
 * Rotation animation configuration
 */
export interface RotationAnimation {
  enabled: boolean;
  speed: number; // Radians per frame
  axis?: "x" | "y" | "z";
}

/**
 * Glow/pulse animation configuration
 */
export interface GlowAnimation {
  enabled: boolean;
  intensity: number; // Base emissive intensity
  pulseSpeed: number; // Seconds per pulse cycle
}

/**
 * Complete sphere animation configuration
 */
export interface SphereAnimation {
  breathing?: BreathingAnimation;
  rotation?: RotationAnimation;
  glow?: GlowAnimation;
}

// ============================================================================
// MATERIAL TYPES
// ============================================================================

/**
 * Sphere material configuration
 */
export interface SphereMaterial {
  metalness?: number;
  roughness?: number;
  transparent?: boolean;
  opacity?: number;
}

/**
 * Sphere geometry configuration
 */
export interface SphereGeometry {
  widthSegments?: number;
  heightSegments?: number;
}
