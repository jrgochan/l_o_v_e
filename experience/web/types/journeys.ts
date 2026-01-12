/**
 * Journey & Waypoint Types
 *
 * Type definitions for emotional transition journeys and waypoints.
 * Consolidates journey-related types to prevent duplication.
 *
 * USAGE:
 * - TransitionPathRenderer component
 * - Scene component
 * - WaypointTooltip component
 * - Journey tracking features
 */

// ============================================================================
// WAYPOINT TYPES
// ============================================================================

/**
 * Complete waypoint data for rendering and tooltips
 *
 * Used in:
 * - TransitionPathRenderer (3D path rendering)
 * - Scene (tooltip management)
 * - WaypointTooltip (tooltip display)
 */
export interface WaypointData {
  index: number;
  emotion: string;
  reasoning: string;
  estimated_time: string;
  difficulty: string;
  vac: [number, number, number];
  state: "start" | "goal" | "reached" | "current" | "locked" | "waypoint";
}

/**
 * Waypoint state for visual styling
 */
export type WaypointState = "start" | "goal" | "reached" | "current" | "locked" | "waypoint";

// ============================================================================
// JOURNEY TYPES
// ============================================================================

/**
 * Active journey progress data
 */
export interface ActiveJourney {
  current_waypoint: number;
  waypoints_reached: number[];
  status: string;
}

/**
 * Journey with full metadata
 */
export interface Journey {
  id: string;
  goal_emotion: string;
  status: "active" | "completed" | "abandoned";
  started_at: string;
  completed_at?: string;
  waypoints?: Array<{
    emotion: string;
    vac: [number, number, number];
    strategies?: Array<{ name: string; time_required?: string }>;
  }>;
  current_waypoint?: number;
}

/**
 * Journey history data for analytics
 */
export interface JourneyHistoryData {
  total_journeys: number;
  completed: number;
  abandoned: number;
  in_progress: number;
  success_rate: number;
  journeys: Journey[];
}
