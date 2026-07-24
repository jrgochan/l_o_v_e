/**
 * Life Journal Types
 *
 * TypeScript interfaces mirroring the Observer API's journal endpoints.
 * Used by journalService, useJournalStore, and all journal components.
 */

// ---------------------------------------------------------------------------
// Life Events
// ---------------------------------------------------------------------------

export interface LifeEvent {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  description?: string | null;
  timestamp: string;
  duration_minutes?: number | null;
  mood_before?: [number, number, number] | null;
  mood_after?: [number, number, number] | null;
  tags: string[];
  source: string;
  impact?: number | null;
  predictability?: number | null;
  controllability?: number | null;
  is_recurring: boolean;
  recurrence_pattern?: string | null;
  event_data: Record<string, unknown>;
  created_at: string;
}

export interface CreateLifeEvent {
  event_type: string;
  title: string;
  description?: string;
  timestamp?: string;
  duration_minutes?: number;
  mood_before?: [number, number, number];
  mood_after?: [number, number, number];
  tags?: string[];
  impact?: number;
  is_recurring?: boolean;
  event_data?: Record<string, unknown>;
}

export interface EventFilters {
  event_type?: string;
  since?: string;
  until?: string;
  source?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface DailySummary {
  date: string;
  event_count: number;
  events_by_type: Record<string, number>;
  events: LifeEvent[];
  dominant_mood?: [number, number, number];
}

// ---------------------------------------------------------------------------
// Correlations
// ---------------------------------------------------------------------------

export interface Correlation {
  id: string;
  emotion_name: string;
  emotion_category?: string;
  event_type: string;
  event_pattern: string;
  correlation_type: string;
  strength: number;
  direction: string;
  confidence: number;
  lag_seconds?: number;
  sample_size: number;
  evidence: Record<string, unknown>;
  status: string;
  first_detected: string;
  last_validated: string;
  user_feedback?: string | null;
}

export interface CorrelationFilters {
  status?: string;
  min_strength?: number;
  event_type?: string;
  emotion_name?: string;
}

export interface AnalysisResult {
  user_id: string;
  algorithms_run: string[];
  correlations_found: number;
  correlations_created: number;
  correlations_updated: number;
}

// ---------------------------------------------------------------------------
// Integrations
// ---------------------------------------------------------------------------

export interface IntegrationAdapter {
  adapter_id: string;
  display_name: string;
  category: string;
  auth_type: string;
  description: string;
}

export interface ActiveIntegration {
  id: string;
  adapter_id: string;
  display_name?: string;
  category?: string;
  sync_status: string;
  sync_error?: string | null;
  last_sync_at?: string | null;
  settings: Record<string, unknown>;
  created_at: string;
}

export interface SyncResult {
  events_imported: number;
  events_updated: number;
  events_skipped: number;
  errors: string[];
  success: boolean;
}

export interface StreamStatus {
  nats_enabled: boolean;
  connected: boolean;
  stream_name?: string;
  message?: string;
}

// ---------------------------------------------------------------------------
// Event Type Ontology (for UI dropdowns/icons)
// ---------------------------------------------------------------------------

export const EVENT_DOMAINS = [
  { value: "wellness", label: "Wellness", icon: "Heart" },
  { value: "work", label: "Work", icon: "Briefcase" },
  { value: "relationship", label: "Relationships", icon: "Users" },
  { value: "mental", label: "Mental Health", icon: "Brain" },
  { value: "environment", label: "Environment", icon: "Cloud" },
  { value: "growth", label: "Growth", icon: "TrendingUp" },
  { value: "financial", label: "Financial", icon: "DollarSign" },
  { value: "calendar", label: "Calendar", icon: "Calendar" },
  { value: "context", label: "Context", icon: "Thermometer" },
] as const;

export const COMMON_EVENT_TYPES = [
  { value: "wellness.exercise", label: "Exercise", domain: "wellness" },
  { value: "wellness.sleep", label: "Sleep", domain: "wellness" },
  { value: "wellness.meal", label: "Meal", domain: "wellness" },
  { value: "wellness.medication", label: "Medication", domain: "wellness" },
  { value: "wellness.substance", label: "Substance", domain: "wellness" },
  { value: "work.meeting", label: "Meeting", domain: "work" },
  { value: "work.deadline", label: "Deadline", domain: "work" },
  { value: "work.achievement", label: "Achievement", domain: "work" },
  { value: "relationship.social_event", label: "Social Event", domain: "relationship" },
  { value: "relationship.conflict", label: "Conflict", domain: "relationship" },
  { value: "mental.therapy_session", label: "Therapy", domain: "mental" },
  { value: "mental.meditation", label: "Meditation", domain: "mental" },
  { value: "growth.learning", label: "Learning", domain: "growth" },
  { value: "environment.travel", label: "Travel", domain: "environment" },
] as const;

export type JournalTab = "timeline" | "insights" | "integrations" | "log";
