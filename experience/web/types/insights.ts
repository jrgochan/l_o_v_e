/**
 * Insight Types - Extended Insight System
 *
 * Extended type definitions for structured therapeutic insights.
 * These types extend the base InsightData from chat.ts to provide
 * rich, mode-specific (warm vs clinical) insight rendering.
 *
 * USAGE:
 * - InsightCard component (warm/clinical modes)
 * - Backend insight generation
 * - Therapeutic guidance display
 */

import type { InsightData } from "./chat";

export type { InsightData };

// ============================================================================
// WARM MODE INSIGHT TYPES
// ============================================================================

/**
 * VAC interpretation for warm, compassionate mode
 */
export interface VACInterpretation {
  energy_state?: string;
  emotional_tone?: string;
  connection_quality?: string;
}

/**
 * Gentle invitation for self-reflection or action
 */
export interface GentleInvitation {
  type: "reflection" | "action" | "exploration";
  text: string;
}

// ============================================================================
// CLINICAL MODE INSIGHT TYPES
// ============================================================================

/**
 * VAC coordinate with clinical interpretation
 */
export interface VACCoordinate {
  value: number;
  label: string;
}

/**
 * Comprehensive VAC assessment for clinical mode
 */
export interface VACAssessment {
  coordinates: {
    valence: VACCoordinate;
    arousal: VACCoordinate;
    connection: VACCoordinate;
  };
  quadrant: string;
  clinical_note: string;
  risk_indicators?: string[];
}

/**
 * Voice prosody metric with clinical interpretation
 */
export interface VoiceMetric {
  label: string;
  value: string;
  interpretation: string;
  status: "critical" | "warning" | "attention" | "stable";
}

/**
 * Clinical recommendation (intervention or observation)
 */
export interface ClinicalRecommendation {
  type: "intervention" | "observation";
  title: string;
  description: string;
}

// ============================================================================
// STRUCTURED INSIGHT DATA
// ============================================================================

/**
 * Extended insight data with structured warm/clinical mode support
 *
 * Extends base InsightData with mode-specific fields for rich rendering.
 */
export interface StructuredInsightData extends InsightData {
  /** Flag indicating this is a structured insight */
  structured?: boolean;

  // Warm mode fields
  opening?: string;
  voice_observations?: string[];
  emotion_understanding?: string;
  vac_interpretation?: VACInterpretation;
  gentle_invitations?: GentleInvitation[];

  // Clinical mode fields
  emotion_definition?: string;
  vac_assessment?: VACAssessment;
  voice_metrics?: VoiceMetric[];
  clinical_recommendations?: ClinicalRecommendation[];
  analysis_reasoning?: string;
}
