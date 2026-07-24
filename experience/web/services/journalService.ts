/**
 * Journal Service — API client for Life Journal endpoints.
 *
 * Follows the same pattern as therapeuticService.ts, using the shared
 * ApiClient for auth token handling and error management.
 */

import { logger } from "@/utils/logger";
import { API_BASE_URL } from "@/utils/api";

import type {
  LifeEvent,
  CreateLifeEvent,
  EventFilters,
  DailySummary,
  Correlation,
  CorrelationFilters,
  AnalysisResult,
  IntegrationAdapter,
  ActiveIntegration,
  SyncResult,
  StreamStatus,
} from "@/types/journal";

import { useAuthStore } from "@/stores/authStore";

const JOURNAL_URL = `${API_BASE_URL}/journal`;

/** Get auth headers for authenticated requests. */
function authHeaders(): HeadersInit {
  const token = useAuthStore.getState().token;
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

/** Shared fetch with auth + error handling. */
async function authFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers || {}) },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Journal API error: ${response.statusText}`);
  }

  if (response.status === 204) return null as T;
  return response.json();
}

export const journalService = {
  // =======================================================================
  // Life Events
  // =======================================================================

  /** Create a new life event. */
  async createEvent(body: CreateLifeEvent): Promise<LifeEvent> {
    try {
      return await authFetch<LifeEvent>(`${JOURNAL_URL}/events`, {
        method: "POST",
        body: JSON.stringify(body),
      });
    } catch (err) {
      logger.error("api", "Failed to create event", err);
      throw err;
    }
  },

  /** List life events with optional filters. */
  async listEvents(
    params: EventFilters = {}
  ): Promise<{ events: LifeEvent[]; total: number }> {
    try {
      const qs = new URLSearchParams();
      if (params.event_type) qs.set("event_type", params.event_type);
      if (params.since) qs.set("since", params.since);
      if (params.until) qs.set("until", params.until);
      if (params.source) qs.set("source", params.source);
      if (params.limit) qs.set("limit", String(params.limit));
      if (params.offset) qs.set("offset", String(params.offset));

      const query = qs.toString();
      const url = query
        ? `${JOURNAL_URL}/events?${query}`
        : `${JOURNAL_URL}/events`;

      return await authFetch(url);
    } catch (err) {
      logger.error("api", "Failed to list events", err);
      throw err;
    }
  },

  /** Get a single event by ID. */
  async getEvent(id: string): Promise<LifeEvent> {
    return authFetch(`${JOURNAL_URL}/events/${id}`);
  },

  /** Delete a life event. */
  async deleteEvent(id: string): Promise<void> {
    return authFetch(`${JOURNAL_URL}/events/${id}`, { method: "DELETE" });
  },

  /** Get a daily summary. */
  async getDailySummary(date: string): Promise<DailySummary> {
    return authFetch(`${JOURNAL_URL}/summary/daily?date=${date}`);
  },

  // =======================================================================
  // Correlations
  // =======================================================================

  /** Trigger correlation analysis. */
  async analyzeCorrelations(): Promise<AnalysisResult> {
    try {
      return await authFetch<AnalysisResult>(
        `${JOURNAL_URL}/correlations/analyze`,
        { method: "POST" }
      );
    } catch (err) {
      logger.error("api", "Failed to analyze correlations", err);
      throw err;
    }
  },

  /** List discovered correlations. */
  async listCorrelations(
    params: CorrelationFilters = {}
  ): Promise<{ correlations: Correlation[]; total: number }> {
    try {
      const qs = new URLSearchParams();
      if (params.status) qs.set("status", params.status);
      if (params.min_strength !== undefined)
        qs.set("min_strength", String(params.min_strength));
      if (params.event_type) qs.set("event_type", params.event_type);
      if (params.emotion_name) qs.set("emotion_name", params.emotion_name);

      const query = qs.toString();
      const url = query
        ? `${JOURNAL_URL}/correlations?${query}`
        : `${JOURNAL_URL}/correlations`;

      return await authFetch(url);
    } catch (err) {
      logger.error("api", "Failed to list correlations", err);
      throw err;
    }
  },

  /** Submit user feedback on a correlation. */
  async submitFeedback(
    id: string,
    feedback: "confirmed" | "dismissed"
  ): Promise<Correlation> {
    return authFetch(`${JOURNAL_URL}/correlations/${id}/feedback`, {
      method: "PUT",
      body: JSON.stringify({ feedback }),
    });
  },

  // =======================================================================
  // Integrations
  // =======================================================================

  /** List all available integration adapters. */
  async listAvailable(): Promise<{
    adapters: IntegrationAdapter[];
    total: number;
  }> {
    return authFetch(`${JOURNAL_URL}/integrations/available`);
  },

  /** List user's active integrations. */
  async listActive(): Promise<{
    integrations: ActiveIntegration[];
    total: number;
  }> {
    return authFetch(`${JOURNAL_URL}/integrations`);
  },

  /** Connect an integration. */
  async connect(
    adapterId: string,
    credentials: Record<string, unknown>,
    settings?: Record<string, unknown>
  ): Promise<{ status: string; adapter_id: string }> {
    return authFetch(`${JOURNAL_URL}/integrations/${adapterId}/connect`, {
      method: "POST",
      body: JSON.stringify({ credentials, settings }),
    });
  },

  /** Disconnect an integration. */
  async disconnect(adapterId: string): Promise<void> {
    return authFetch(`${JOURNAL_URL}/integrations/${adapterId}/disconnect`, {
      method: "DELETE",
    });
  },

  /** Manually trigger a sync. */
  async sync(adapterId: string): Promise<SyncResult> {
    return authFetch(`${JOURNAL_URL}/integrations/${adapterId}/sync`, {
      method: "POST",
    });
  },

  /** Upload a file (iCal, etc.). */
  async importFile(file: File, adapterId = "ical_import"): Promise<SyncResult> {
    const token = useAuthStore.getState().token;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("adapter_id", adapterId);

    const response = await fetch(`${JOURNAL_URL}/integrations/import`, {
      method: "POST",
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: formData,
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || "File import failed");
    }

    return response.json();
  },

  // =======================================================================
  // Stream Status
  // =======================================================================

  /** Get NATS stream status. */
  async getStreamStatus(): Promise<StreamStatus> {
    return authFetch(`${JOURNAL_URL}/stream/status`);
  },
};
