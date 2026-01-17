/**
 * Chat Types - Emotional Chat Interface
 *
 * Complete type system for the emotional analysis chat feature.
 *
 * TYPE INDEX:
 *
 * BASE TYPES:
 * - ToneMode, MessageType, AnalysisExpandState
 * - VAC, ProsodyData, VACAnalysis
 *
 * INSIGHT & ANALYSIS:
 * - InsightData, Recommendation, VoiceContentCorrelation
 *
 * CHAT & SESSION:
 * - ChatMessage, ChatSession, RecordingState
 * - SessionMetrics, VACHistoryPoint, EmotionTimelineEvent
 *
 * WEBSOCKET MESSAGES:
 * - ServerMessage, ClientMessage (union types)
 * - DeepFeelingServerMessage, DeepFeelingClientMessage
 *
 * DEEP FEELING MODE (Multi-Emotion):
 * - DetectedEmotion, EmotionRelationship, AggregateState
 * - MultiEmotionAnalysis, ThreeWayAnalysis
 * - EmotionProminence, RelationshipType, TemporalPattern
 *
 * PROGRESS TRACKING:
 * - ProgressStage (Heartbeat Analyzer)
 *
 * GOALS & PATHS:
 * - EmotionGoal, EmotionPath
 */

// ============================================================================
// BASE CHAT TYPES
// ============================================================================

export type ToneMode = "clinical" | "warm";

export type MessageType = "user_text" | "user_audio" | "system_analysis" | "system_insight";

export type AnalysisExpandState = "normal" | "expanded" | "fullscreen";

export interface VAC {
  valence: number;
  arousal: number;
  connection: number;
}

/**
 * Prosody Features - Acoustic Analysis Metrics
 *
 * Extensible interface for voice prosody features from Parselmouth/Praat analysis.
 * Known fields are strongly typed, with index signature for backend extensibility.
 */
export interface ProsodyFeatures {
  // Voice quality metrics
  jitter?: number; // Voice instability/irregularity
  shimmer?: number; // Amplitude variation
  hnr?: number; // Harmonics-to-noise ratio

  // Temporal metrics
  speaking_rate?: number; // Syllables per second
  pause_count?: number; // Number of pauses
  pause_duration?: number; // Total pause time (seconds)

  // Pitch metrics (extended)
  pitch_variation?: number; // Coefficient of variation
  pitch_slope?: number; // Trend line slope

  // Energy metrics (extended)
  energy_variation?: number;
  energy_slope?: number;

  // Extensible for new features from backend
  [key: string]: number | string | boolean | undefined;
}

/**
 * Clinical Alert Trigger Data
 *
 * Values that triggered a clinical alert. Extensible to support new alert types.
 */
export interface AlertTriggerData {
  // VAC coordinates
  valence?: number;
  arousal?: number;
  connection?: number;

  // Voice quality metrics
  hnr?: number;
  jitter?: number;
  shimmer?: number;
  pitch_range?: number;

  // Analysis quality
  confidence?: number;
  discrepancy?: number;

  // Extensible for new alert triggers
  [key: string]: number | string | boolean | undefined;
}

/**
 * Clinical Alert Threshold Data
 *
 * Threshold values applied when alert was generated. Extensible for new thresholds.
 */
export interface AlertThresholdData {
  // Arousal thresholds
  arousal_critical?: number;
  arousal_warning?: number;
  arousal_attention?: number;

  // Valence thresholds
  valence_critical?: number;
  valence_warning?: number;

  // Voice quality thresholds
  hnr_poor?: number;
  jitter_warning?: number;
  jitter_attention?: number;
  shimmer_warning?: number;
  shimmer_attention?: number;

  // Pitch thresholds
  pitch_range_very_narrow?: number;
  pitch_range_narrow?: number;

  // Discrepancy thresholds
  discrepancy_critical?: number;
  discrepancy_warning?: number;
  discrepancy_attention?: number;

  // Confidence thresholds
  confidence_very_low?: number;
  confidence_low?: number;

  // Extensible for new thresholds
  [key: string]: number | string | boolean | undefined;
}

export interface ProsodyData {
  // Basic pitch metrics
  pitch_mean?: number;
  pitch_std?: number;
  pitch_min?: number;
  pitch_max?: number;
  pitch_range?: number;

  // Energy metrics
  energy?: number;
  energy_std?: number;
  energy_max?: number;

  // Temporal metrics
  rate?: number;
  duration?: number;

  // Voice quality metrics (from Parselmouth/Praat)
  jitter?: number;
  shimmer?: number;
  hnr?: number;
  voice_quality?: "good" | "moderate" | "poor";

  // Interpretations
  interpretation?: Record<string, string>;
  features?: ProsodyFeatures;
}

export interface VACAnalysis {
  valence: {
    value: number;
    interpretation: string;
    percentile: number;
  };
  arousal: {
    value: number;
    interpretation: string;
    percentile: number;
  };
  connection: {
    value: number;
    interpretation: string;
    percentile: number;
  };
  quadrant?: string;
}

export interface VoiceContentCorrelation {
  voice_energy: number;
  content_arousal: number;
  discrepancy: number;
  aligned: boolean;
  interpretation: string;
}

export interface Recommendation {
  type: "similar_emotions" | "journeys";
  title: string;
  items: Array<{
    name?: string;
    category?: string;
    distance?: number;
    from?: string;
    to?: string;
    description?: string;
  }>;
}

export interface InsightData {
  emotion: string;
  category: string;
  vac: VAC;
  confidence: number;
  summary: string;
  vac_analysis: VACAnalysis;
  prosody_analysis?: {
    pitch?: number;
    pitch_variability?: number;
    energy?: number;
    rate?: number;
    energy_interpretation?: string;
    features?: ProsodyFeatures;
  };
  voice_content_correlation?: VoiceContentCorrelation;
  recommendations: Recommendation[];
  guidance: string;
  // NEW: Backend-generated clinical alerts
  clinical_alerts?: Array<{
    id: string;
    session_id: string;
    timestamp: string;
    level: "critical" | "warning" | "attention" | "stable";
    type:
    | "high_arousal"
    | "voice_mismatch"
    | "low_confidence"
    | "pattern_concern"
    | "voice_quality";
    message: string;
    suggestion?: string;
    triggered_by: AlertTriggerData;
    threshold_used: AlertThresholdData;
    version: string;
  }>;
  overall_status?: "critical" | "warning" | "attention" | "stable";
  // NEW: Backend-calculated session analytics
  session_analytics?: {
    id: string;
    session_id: string;
    emotion_count: number;
    average_confidence: number;
    dominant_category: string | null;
    start_time: string;
    last_emotion_time: string | null;
    total_duration_seconds: number;
    alert_counts: {
      critical: number;
      warning: number;
      attention: number;
    };
    category_counts: Record<string, number>;
    vac_stats: Record<string, number>;
    updated_at: string;
  };
}

export interface ChatMessage {
  id: string;
  session_id: string;
  timestamp: string;
  message_type: MessageType;
  content?: string;
  audio_url?: string;
  transcription?: string;
  emotion_id?: string;
  vac_coordinates?: number[];
  confidence?: number;
  tone_mode?: ToneMode;
  prosody?: ProsodyData;
  insights?: InsightData;
  emotion?: {
    id: string;
    name: string;
    category: string;
    definition: string;
    vac: number[];
  };
}

export interface ChatSession {
  id: string;
  user_id: string;
  started_at: string;
  ended_at?: string;
  message_count: number;
  tone_preference: ToneMode;
  created_at: string;
  updated_at: string;
}

// WebSocket message types (client -> server)
export type ClientMessage =
  | {
    type: "user_message";
    content: string;
    tone_preference: ToneMode;
  }
  | {
    type: "user_message";
    audio_data: string;
    tone_preference: ToneMode;
  }
  | {
    type: "ping";
  }
  | {
    type: "update_tone";
    tone_preference: ToneMode;
  };

// WebSocket message types (server -> client)
export type ServerMessage =
  | {
    type: "message_received";
    timestamp: string;
  }
  | {
    type: "user_message_saved";
    message_id: string;
    content: string;
  }
  | {
    type: "transcription";
    text: string;
  }
  | {
    type: "analysis";
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
    reasoning?: string;
    original_emotion?: string;
    match_method?: string;
    match_confidence?: number;
  }
  | {
    type: "prosody";
    data: ProsodyData;
  }
  | {
    type: "insight";
    insights: InsightData;
  }
  | {
    type: "tone_updated";
    tone_preference: ToneMode;
  }
  | {
    type: "error";
    message: string;
  }
  | {
    type: "pong";
  };

// Recording state
export interface RecordingState {
  isRecording: boolean;
  duration: number;
  audioBlob?: Blob;
  audioUrl?: string;
}

// Session metrics for clinical dashboard
export interface SessionMetrics {
  startTime: Date;
  elapsedSeconds: number;
  emotionCount: number;
  averageConfidence: number;
  dominantCategory: string | null;
  alertCount: {
    critical: number;
    warning: number;
    attention: number;
  };
}

// Historical data point for trajectory tracking
export interface VACHistoryPoint {
  timestamp: Date;
  vac: VAC;
  emotion: string;
  confidence: number;
}

// Emotion timeline event
export interface EmotionTimelineEvent {
  timestamp: Date;
  emotion: string;
  category: string;
  vac: VAC;
  confidence: number;
  alertLevel?: "critical" | "warning" | "attention" | "stable";
}

// ============================================================================
// CLINICAL & SESSION TYPES
// ============================================================================

// Clinical alerts (legacy - kept for backward compatibility)
export interface ClinicalAlert {
  level: "critical" | "warning" | "attention" | "stable";
  type: "high_arousal" | "voice_mismatch" | "low_confidence" | "pattern_concern" | "voice_quality";
  message: string;
  timestamp?: Date;
  actionable?: boolean;
  suggestion?: string;
}

// ============================================================================
// DEEP FEELING MODE - Multi-Emotion Analysis Types
// ============================================================================

export type EmotionProminence = "primary" | "secondary" | "underlying";

export type RelationshipType =
  | "complementary"
  | "contradictory"
  | "masking"
  | "amplifying"
  | "sequential";

export type TemporalPattern = "concurrent" | "sequential" | "emerging";

export interface DetectedEmotion {
  id: string;
  emotion_name: string; // Atlas name (mapped)
  original_name?: string; // AI name if mapped
  match_method?: "exact" | "fuzzy" | "vac" | "none";
  match_confidence?: number; // 0-1
  category: string;
  vac: VAC;
  confidence: number;
  prominence: EmotionProminence;
  voice_alignment?: number;
  voice_interpretation_vac?: VAC;
}

export interface EmotionRelationship {
  id: string;
  emotion_a: string;
  emotion_b: string;
  type: RelationshipType;
  strength: number;
  description: string;
}

export interface AggregateState {
  vac: VAC;
  complexity_score: number;
  emotional_clarity: number;
  temporal_pattern: string;
}

// 3-Way Analysis Types (Voice-Content Analysis)
export interface ThreeWayEmotionData {
  emotions: DetectedEmotion[];
  aggregate_vac: VAC;
  complexity_score: number;
  emotional_clarity: number;
  temporal_pattern: string;
  reasoning: string;
}

export interface ThreeWayDiscrepancy {
  content_voice_distance: number;
  content_blended_distance: number;
  voice_blended_distance: number;
  flags: string[];
  interpretation: string;
  content_primary: string;
  voice_primary?: string;
  blended_primary: string;
}

export interface ThreeWayAnalysis {
  content_only: ThreeWayEmotionData;
  voice_only?: ThreeWayEmotionData;
  blended: ThreeWayEmotionData;
  discrepancy: ThreeWayDiscrepancy;
}

export interface MultiEmotionAnalysis {
  id: string;
  message_id: string;
  session_id: string;
  emotions: DetectedEmotion[];
  relationships: EmotionRelationship[];
  aggregate: AggregateState;
  reasoning: string;
  timestamp: Date;
}

export interface ChatEmotionPath {
  id: string;
  type: "direct" | "gradual" | "alchemical";
  steps: string[]; // emotion names
  description: string;
  strategy: string;
  estimated_difficulty?: number;
}

export interface EmotionGoal {
  id: string;
  session_id: string;
  user_id: string;
  goal_emotion_id: string;
  goal_emotion_name?: string;
  priority: number;
  target_date?: string;
  status: "active" | "achieved" | "abandoned";
  created_at: string;
  updated_at: string;
}

// Progress tracking for Heartbeat Analyzer
export interface ProgressStage {
  id: string;
  label: string;
  icon: string;
  status: "pending" | "in_progress" | "complete";
  percentage: number;
  elapsed_ms?: number;
}

export interface ProgressState {
  stages: ProgressStage[];
  currentStage: string;
  overallPercentage: number;
  currentMessage: string;
}

// Extended Server Message types for Deep Feeling mode
export type DeepFeelingServerMessage =
  | ServerMessage
  | {
    type: "multi_emotion";
    emotion: string;
    category: string;
    vac: VAC;
    confidence: number;
    prominence: EmotionProminence;
    original_emotion?: string;
    match_method?: string;
    match_confidence?: number;
  }
  | {
    type: "emotion_relationship";
    emotion_a: string;
    emotion_b: string;
    relationship_type: RelationshipType;
    strength: number;
    description: string;
  }
  | {
    type: "aggregate_state";
    aggregate_vac: VAC;
    complexity_score: number;
    emotional_clarity: number;
    temporal_pattern: TemporalPattern;
  }
  | {
    type: "deep_feeling_updated";
    deep_feeling_enabled: boolean;
  }
  | {
    type: "three_way_analysis";
    data: ThreeWayAnalysis;
  }
  | {
    type: "progress_update";
    stage: string;
    status: "started" | "in_progress" | "complete";
    message: string;
    percentage: number;
    elapsed_ms?: number;
  };

// Extended Client Message types for Deep Feeling mode
export type DeepFeelingClientMessage =
  | ClientMessage
  | {
    type: "user_message";
    content: string;
    tone_preference: ToneMode;
    deep_feeling_enabled: boolean;
  }
  | {
    type: "user_message";
    audio_data: string;
    tone_preference: ToneMode;
    deep_feeling_enabled: boolean;
  }
  | {
    type: "update_deep_feeling";
    deep_feeling_enabled: boolean;
  };

export interface CurrentAnalysis {
  transcription: string | null;
  prosody: ProsodyData | null;
  emotion: string | null;
  category: string | null;
  vac: VAC | null;
  confidence: number | null;
  insights: InsightData | null;
  audioBlob: Blob | null;
}

export interface DisplayMessage {
  id: string;
  type: "user" | "analysis" | "insight" | "transcription" | "multi_emotion";
  content: string;
  timestamp: Date;
  emotion?: string;
  category?: string;
  vac?: VAC;
  confidence?: number;
  insights?: InsightData;
  multiEmotionData?: MultiEmotionAnalysis;
}
