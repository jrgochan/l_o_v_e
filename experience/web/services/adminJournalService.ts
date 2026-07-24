/**
 * Admin Journal Service — API client for admin-only journal endpoints.
 *
 * Cross-user queries for events, correlations, integrations, and stream health.
 */

import { api } from "@/utils/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AdminEvent {
  id: string;
  user_id: string;
  event_type: string;
  title: string;
  description?: string | null;
  timestamp: string;
  duration_minutes?: number | null;
  source: string;
  tags: string[];
  impact?: number | null;
  is_recurring: boolean;
  created_at: string;
}

export interface EventStats {
  total_events: number;
  events_today: number;
  users_with_events: number;
  by_source: Record<string, number>;
  by_type: Record<string, number>;
}

export interface AdminCorrelation {
  id: string;
  user_id: string;
  emotion_name: string;
  event_type: string;
  event_pattern: string;
  correlation_type: string;
  strength: number;
  direction: string;
  confidence: number;
  lag_seconds?: number | null;
  sample_size: number;
  status: string;
  user_feedback?: string | null;
  first_detected: string;
  last_validated: string;
}

export interface CorrelationStats {
  total: number;
  confirmed: number;
  dismissed: number;
  pending: number;
  avg_strength: number;
  avg_confidence: number;
  by_status: Record<string, number>;
}

export interface AdminIntegration {
  id: string;
  user_id: string;
  adapter_id: string;
  sync_status: string;
  sync_error?: string | null;
  last_sync_at?: string | null;
  created_at: string;
}

export interface AdapterHealth {
  adapter_id: string;
  total_connections: number;
  error_count: number;
  error_rate: number;
}

export interface StreamStatus {
  nats_enabled: boolean;
  connected: boolean;
  stream_name?: string;
  message?: string;
}

export interface EventFilters {
  user_id?: string;
  event_type?: string;
  source?: string;
  since?: string;
  until?: string;
  limit?: number;
  offset?: number;
}

export interface CorrelationFilters {
  user_id?: string;
  status?: string;
  event_type?: string;
  min_strength?: number;
  limit?: number;
  offset?: number;
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const adminJournalApi = {
  // ── Events ──────────────────────────────────────────────────────────────

  async listEvents(
    params: EventFilters = {}
  ): Promise<{ events: AdminEvent[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.user_id) qs.set("user_id", params.user_id);
    if (params.event_type) qs.set("event_type", params.event_type);
    if (params.source) qs.set("source", params.source);
    if (params.since) qs.set("since", params.since);
    if (params.until) qs.set("until", params.until);
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));

    const query = qs.toString();
    const url = query
      ? `/admin/journal/events?${query}`
      : "/admin/journal/events";

    return api.get(url);
  },

  async getEventStats(): Promise<EventStats> {
    return api.get("/admin/journal/events/stats");
  },

  async deleteEvent(id: string): Promise<void> {
    return api.del(`/admin/journal/events/${id}`);
  },

  // ── Correlations ────────────────────────────────────────────────────────

  async listCorrelations(
    params: CorrelationFilters = {}
  ): Promise<{ correlations: AdminCorrelation[]; total: number }> {
    const qs = new URLSearchParams();
    if (params.user_id) qs.set("user_id", params.user_id);
    if (params.status) qs.set("status", params.status);
    if (params.event_type) qs.set("event_type", params.event_type);
    if (params.min_strength !== undefined)
      qs.set("min_strength", String(params.min_strength));
    if (params.limit) qs.set("limit", String(params.limit));
    if (params.offset) qs.set("offset", String(params.offset));

    const query = qs.toString();
    const url = query
      ? `/admin/journal/correlations?${query}`
      : "/admin/journal/correlations";

    return api.get(url);
  },

  async getCorrelationStats(): Promise<CorrelationStats> {
    return api.get("/admin/journal/correlations/stats");
  },

  // ── Integrations ────────────────────────────────────────────────────────

  async listIntegrations(
    adapterId?: string
  ): Promise<{ integrations: AdminIntegration[]; total: number }> {
    const url = adapterId
      ? `/admin/journal/integrations?adapter_id=${adapterId}`
      : "/admin/journal/integrations";
    return api.get(url);
  },

  async getIntegrationHealth(): Promise<{ adapters: AdapterHealth[] }> {
    return api.get("/admin/journal/integrations/health");
  },

  async forceDisconnect(integrationId: string): Promise<void> {
    return api.del(`/admin/journal/integrations/${integrationId}`);
  },

  // ── Stream ──────────────────────────────────────────────────────────────

  async getStreamStatus(): Promise<StreamStatus> {
    return api.get("/admin/journal/stream/status");
  },
};
