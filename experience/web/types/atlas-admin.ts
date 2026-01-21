/**
 * Type Definitions for Atlas Admin Interface
 *
 * Comprehensive types for the Soul Sphere admin visualization tool.
 */

import type { VACVector, Quaternion, EmotionCollection } from "@love/experience-shared";
export type { EmotionCollection };

/**
 * Complete emotion definition from Observer API
 */
export interface AtlasEmotion {
  id: string;
  collection_id?: string;
  name: string;
  category: string;
  definition: string;
  movement_pattern?: string | null;
  vac: [number, number, number]; // [Valence, Arousal, Connection];
  quaternion: Quaternion;
  color_hint?: string;
  is_bridge?: boolean;
}

/**
 * Computed path between two emotions
 */
export interface EmotionPath {
  id: string; // "${fromId}-${toId}"
  from: AtlasEmotion;
  to: AtlasEmotion;
  waypoints: PathWaypoint[];
  total_distance: number;
  estimated_time: string;
  difficulty: "easy" | "moderate" | "difficult";
  requires_bridge?: boolean;
  bridge_emotions?: string[]; // Bridge emotion names
}

/**
 * VAC dimensional shift analysis
 */
export interface VACShiftAnalysis {
  delta: number;
  direction: string;
  interpretation: string;
  psychological_meaning: string;
}

/**
 * Emotion context (previous or next)
 */
export interface EmotionContext {
  from_emotion?: string;
  to_emotion?: string;
  what_changed?: string[];
  why_necessary?: string;
  what_this_enables?: string[];
  preparation?: string;
  research?: ResearchCitation | null;
}

/**
 * Research citation
 */
export interface ResearchCitation {
  author: string;
  year: number;
  work: string;
  publisher?: string;
  journal?: string;
  key_finding: string;
  quote?: string;
}

/**
 * Comprehensive waypoint explanation
 */
export interface WaypointExplanation {
  psychological_purpose: string;
  vac_analysis: {
    valence_shift: VACShiftAnalysis;
    arousal_shift: VACShiftAnalysis;
    connection_shift: VACShiftAnalysis;
  };
  previous_context: EmotionContext;
  next_context: EmotionContext;
  readiness_signs: string[];
  warning_signs: string[];
  research_citations: ResearchCitation[];
}

/**
 * Waypoint along a path
 */
export interface PathWaypoint {
  emotion: string;
  vac: VACVector;
  reasoning: string;
  estimated_time?: string;
  difficulty?: string;
  strategies?: TransitionStrategy[];
  explanation?: WaypointExplanation; // NEW: Rich backend explanation
}

/**
 * Transition strategy for a path
 */
export interface TransitionStrategy {
  id: string;
  name: string;
  description: string;
  category: string;
  evidence_level?: string;
  time_commitment?: string;
}

/**
 * Path computation result from Observer API
 */
export interface PathComputationResult {
  current_state: {
    emotion: string;
    vac: VACVector;
  };
  goal_state: {
    emotion: string;
    vac: VACVector;
  };
  waypoints: PathWaypoint[];
  path_metrics: {
    total_distance: number;
    total_estimated_time: string;
    overall_difficulty: string;
    success_probability?: number;
    requires_external_support?: boolean;
    requires_bridge: boolean;
    bridge_emotions: string[];
  };
  visualization_data?: Record<string, unknown>;
  personalization_notes?: string[];
}

/**
 * Category filter state
 */
export interface CategoryFilter {
  name: string;
  enabled: boolean;
  color: string;
  emotionCount: number;
}

/**
 * Display layer toggles
 */
export interface LayerVisibility {
  soulSphere: boolean;
  emotionPoints: boolean;
  emotionLabels: boolean;
  transitionPaths: boolean;
  waypoints: boolean;
  bridgeHighlight: boolean;
  legend: boolean;
  cinematicOverlay: boolean;
  viewerShortcuts: boolean;
  vacDisplay: boolean;
}

/**
 * Path animation mode - visual style for path rendering
 */
export type PathAnimationMode =
  | "subtle"
  | "dynamic"
  | "mystical"
  | "crystalline"
  | "luminous"
  | "liquid"
  | "glitch";

/**
 * Path computation mode - how paths are calculated
 */
export type PathComputeMode = "always" | "cache-first" | "manual";

/**
 * Cache status tracking
 */
export interface CacheStatus {
  loaded: boolean;
  count: number;
  lastLoadTime: number | null;
}

/**
 * Admin interface settings
 */
export interface AtlasAdminSettings {
  computeMode: PathComputeMode;
  showAllPaths: boolean; // vs. show only selected pairs
  pathOpacity: number;
  emotionSize: number;
  enableAnimations: boolean;
  colorScheme: "category" | "valence" | "arousal" | "connection";
  focusMode: boolean; // Hide unselected emotions for clarity
  pathAnimationMode: PathAnimationMode; // Visual style for paths and sphere
  showMotionIndicators: boolean; // Show orbital/reaching/recoil/stable rings
  dataVisualizationMode: boolean; // Show all emotions as mini spheres with VAC visualization
}

/**
 * Selection state
 */
export interface SelectionState {
  selectedEmotionIds: Set<string>;
  hoveredEmotionId: string | null;
  hoveredPathId: string | null;
  focusedEmotionId: string | null;
}

/**
 * Path display mode
 */
export type PathDisplayMode = "auto" | "manual" | "matrix";

/**
 * Difficulty color mapping
 */
export const DIFFICULTY_COLORS = {
  easy: "#00FFC8", // Cyan
  moderate: "#FFC800", // Yellow
  difficult: "#FF0096", // Magenta
} as const;

/**
 * Bridge emotions list (the 6 critical gateway emotions)
 */
export const BRIDGE_EMOTIONS = [
  "Vulnerability",
  "Awe",
  "Compassion",
  "Curiosity",
  "Acceptance",
  "Gratitude",
] as const;

/**
 * Type representing valid bridge emotion names
 */
export type BridgeEmotion = (typeof BRIDGE_EMOTIONS)[number];

/**
 * Type guard to check if an emotion name is a bridge emotion
 *
 * @param name - Emotion name to check
 * @returns True if the name is one of the 6 bridge emotions
 */
export function isBridgeEmotion(name: string): name is BridgeEmotion {
  return (BRIDGE_EMOTIONS as readonly string[]).includes(name);
}

/**
 * Category color palette (13 categories from Brené Brown's Atlas)
 */
export const CATEGORY_COLORS: Record<string, string> = {
  "Places We Go With Others": "#88FF44", // Green
  "When It's Beyond Us": "#FF8844", // Orange
  "When Life Is Good": "#FFFF44", // Yellow
  "When the Heart Is Open": "#FF44CC", // Pink
  "When Things Are Uncertain or Too Much": "#CCFF44", // Yellow-Green
  "When Things Aren't What They Seem": "#8844FF", // Purple
  "When Things Don't Go As Planned": "#FF44CC", // Magenta
  "When We Compare": "#44CCFF", // Cyan
  "When We Fall Short": "#FF4444", // Red
  "When We Feel Wronged": "#CC44FF", // Violet
  "When We Search for Connection": "#FFCC44", // Gold
  "When We Self-Assess": "#44FFCC", // Turquoise
  "When We're Hurting": "#4488FF", // Blue
};

/**
 * Default settings
 */
export const DEFAULT_SETTINGS: AtlasAdminSettings = {
  computeMode: "cache-first",
  showAllPaths: true,
  pathOpacity: 0.6,
  emotionSize: 1.0,
  enableAnimations: true,
  colorScheme: "category",
  focusMode: false,
  pathAnimationMode: "subtle", // Default: therapeutic calm
  showMotionIndicators: true, // Show orbital/reaching/recoil/stable rings
  dataVisualizationMode: false, // Data visualization overlay disabled by default
};

/**
 * Default layer visibility
 */
export const DEFAULT_LAYERS: LayerVisibility = {
  soulSphere: true,
  emotionPoints: true,
  emotionLabels: true,
  transitionPaths: true,
  waypoints: true,
  bridgeHighlight: true,
  legend: false,
  cinematicOverlay: true,
  viewerShortcuts: true,
  vacDisplay: true,
};

/**
 * Matrix visualization statistics
 */
export interface CategoryStats {
  avgDistance: number;
  difficulty: "easy" | "moderate" | "difficult";
  pathCount: number;
}

export interface MatrixStats {
  totalPossible: number;
  computed: number;
  percentage: string;
  byDifficulty: {
    easy: number;
    moderate: number;
    difficult: number;
  };
}
