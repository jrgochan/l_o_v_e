/**
 * API Response Types
 *
 * Type definitions for all backend API responses.
 * Serves as the contract between frontend and backend services.
 *
 * SERVICES:
 * - Observer API (emotion atlas, paths, recommendations)
 * - Listener API (audio processing, insights)
 */

// import type { VACVector } from '@love/experience-shared';

// ============================================================================
// OBSERVER API - EMOTION ATLAS
// ============================================================================

/**
 * Observer API response for fetching all emotions
 */
export interface ObserverEmotionResponse {
  total_count: number;
  emotions: Array<{
    id: string;
    name: string;
    category: string;
    definition: string;
    vac: [number, number, number];
    quaternion: [number, number, number, number];
    color_hint?: string;
  }>;
}

// ============================================================================
// OBSERVER API - CACHED PATHS
// ============================================================================

/**
 * Waypoint in a cached path response
 */
export interface CachedPathWaypoint {
  emotion: string;
  vac: [number, number, number];
}

/**
 * Single path in cached paths response
 */
export interface CachedPathData {
  from_emotion: { id: string };
  to_emotion: { id: string };
  waypoints: CachedPathWaypoint[];
  distance: number;
  estimated_time: string;
  difficulty: string;
  requires_bridge: boolean;
}

/**
 * Observer API response for cached paths
 */
export interface CachedPathsResponse {
  total_count: number;
  paths: CachedPathData[];
}

// ============================================================================
// OBSERVER API - SMART RECOMMENDATIONS
// ============================================================================

/**
 * Curated therapeutic journey
 */
export interface CuratedJourney {
  id: string;
  name: string;
  description: string;
  icon: string;
  difficulty: "easy" | "moderate" | "difficult";
  emotion_ids: string[];
  emotion_count: number;
  estimated_time: string;
  research: string;
}

/**
 * Complementary emotion suggestion
 */
export interface ComplementarySuggestion {
  id: string;
  name: string;
  type: string;
  reason: string;
}

/**
 * Problematic/difficult transition
 */
export interface ProblematicTransition {
  from_id: string;
  to_id: string;
  from_name: string;
  to_name: string;
  distance: string;
  waypoint_count: number;
  requires_bridge: boolean;
}

/**
 * Observer API recommendations response
 */
export interface RecommendationsResponse {
  context: "exploration" | "healing" | "growth";
  recommendations: {
    curated_journeys?: CuratedJourney[];
    complementary_suggestions?: ComplementarySuggestion[];
    problematic_transitions?: ProblematicTransition[];
  };
}

// ============================================================================
// OBSERVER API - USER JOURNEYS
// ============================================================================

/**
 * User journey response
 */
export interface UserJourneyResponse {
  total_journeys: number;
  completed: number;
  abandoned: number;
  in_progress: number;
  success_rate: number;
  journeys: Array<{
    id: string;
    goal_emotion: string;
    status: string;
    started_at: string;
    completed_at?: string;
    waypoints?: Array<{
      emotion: string;
      vac: [number, number, number];
      strategies?: Array<{ name: string }>;
    }>;
    current_waypoint?: number;
  }>;
}

// Note: Types are exported above and available via barrel export in types/index.ts
