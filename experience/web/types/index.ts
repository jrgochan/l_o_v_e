/**
 * Type System - Central Export Hub
 *
 * Single entry point for all type imports across the application.
 * Simplifies import statements and provides clear type organization.
 *
 * USAGE:
 * ```typescript
 * // Instead of:
 * import type { VAC } from '@/types/chat';
 * import type { Emotion } from '@/types/visualization';
 * import type { WaypointData } from '@/types/journeys';
 *
 * // Simply:
 * import type { VAC, Emotion, WaypointData } from '@/types';
 * ```
 */

// ============================================================================
// DOMAIN TYPES
// ============================================================================

// Chat & Emotional Analysis
export * from "./chat";

// Atlas Admin & Emotion Visualization
export * from "./visualization";

// Extended Insights System
export * from "./insights";

// Journeys & Waypoints
export * from "./journeys";

// Backend API Responses
export * from "./api-responses";

// Three.js & React Three Fiber
export * from "./three";

// ============================================================================
// UTILITIES & HELPERS
// ============================================================================

// Type utilities
export * from "./utils";

// Command palette
export * from "./command-palette";

// Browser API extensions
export * from "./browser-extensions";

// UI event handlers
export * from "./ui-events";

// ============================================================================
// NOTE: All types are now available via barrel exports above
// ============================================================================

// Example usage:
// import type { VAC, Emotion, WaypointData, CachedPathData } from '@/types';
