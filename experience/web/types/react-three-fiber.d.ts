/**
 * Type declarations for React Three Fiber
 * Extends JSX to include Three.js elements
 */

import type { ThreeElements } from "@react-three/fiber";

declare global {
  namespace JSX {
    // Extend JSX IntrinsicElements with Three.js components
    // This allows us to use Three.js primitives like <mesh>, <boxGeometry>, etc.

    type IntrinsicElements = ThreeElements;
  }
}
