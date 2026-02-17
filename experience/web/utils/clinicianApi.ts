/**
 * Clinician API — Frontend helpers for clinician-scoped endpoints.
 *
 * Wraps the backend /clinician/* routes that are protected by
 * `get_current_clinician` (requires CLINICIAN or ADMIN role).
 */

import { api } from "./api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ClientSummary {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  is_active: boolean;
  assigned_clinician_id?: string;
  created_at: string;
  updated_at: string;
}

export interface ClientSession {
  id: string;
  auth_user_id: string;
  started_at: string;
  ended_at?: string;
  message_count: number;
  tone_preference: string;
  created_at: string;
  updated_at: string;
}

export interface TrajectoryPoint {
  id: string;
  user_id: string;
  session_id?: string;
  timestamp: string;
  emotion_name?: string;
  emotion_category?: string;
  valence?: number;
  arousal?: number;
  connection?: number;
  confidence?: number;
  elasticity?: number;
  context_metadata?: Record<string, unknown>;
}

export interface ClinicalAlertItem {
  id: string;
  session_id: string;
  level: "critical" | "warning" | "attention" | "stable";
  alert_type: string;
  message: string;
  suggestion?: string;
  triggered_by?: Record<string, number>;
  threshold_used?: Record<string, number>;
  version: string;
  timestamp: string;
}

export interface AlertSummary {
  total_clients: number;
  alerts_by_severity: {
    critical: number;
    warning: number;
    attention: number;
    stable: number;
  };
  total_alerts: number;
}

export interface ClinicalNoteItem {
  id: string;
  clinician_id: string;
  client_id: string;
  session_id?: string | null;
  content: string;
  category: string;
  created_at: string;
  updated_at: string;
}

export interface AlertAcknowledgmentItem {
  id: string;
  alert_id: string;
  clinician_id: string;
  action_taken: string;
  response_note?: string | null;
  acknowledged_at: string;
}

// ---------------------------------------------------------------------------
// API Helpers
// ---------------------------------------------------------------------------

export const clinicianApi = {
  /**
   * List all clients assigned to the current clinician.
   * Admins see all users who have an assigned clinician.
   */
  async getClients(): Promise<ClientSummary[]> {
    return api.get<ClientSummary[]>("/clinician/clients");
  },

  /**
   * Get recent chat sessions for an assigned client.
   */
  async getClientSessions(
    clientId: string,
    limit = 20
  ): Promise<ClientSession[]> {
    return api.get<ClientSession[]>(
      `/clinician/clients/${clientId}/sessions?limit=${limit}`
    );
  },

  /**
   * Get emotional trajectory data for an assigned client.
   */
  async getClientTrajectory(
    clientId: string,
    limit = 100
  ): Promise<TrajectoryPoint[]> {
    return api.get<TrajectoryPoint[]>(
      `/clinician/clients/${clientId}/trajectory?limit=${limit}`
    );
  },

  /**
   * List clinical alerts for the clinician's assigned clients.
   */
  async getAlerts(limit = 50): Promise<ClinicalAlertItem[]> {
    return api.get<ClinicalAlertItem[]>(`/clinician/alerts?limit=${limit}`);
  },

  /**
   * Get aggregate alert counts by severity.
   */
  async getAlertSummary(): Promise<AlertSummary> {
    return api.get<AlertSummary>("/clinician/alerts/summary");
  },

  // --- Clinical Notes ---

  /**
   * List clinical notes for a client.
   */
  async getClientNotes(clientId: string): Promise<ClinicalNoteItem[]> {
    return api.get<ClinicalNoteItem[]>(`/clinician/clients/${clientId}/notes`);
  },

  /**
   * Create a clinical note for a client.
   */
  async createClientNote(
    clientId: string,
    content: string,
    category = "general",
    sessionId?: string
  ): Promise<ClinicalNoteItem> {
    const params = new URLSearchParams({ content, category });
    if (sessionId) params.set("session_id", sessionId);
    return api.post<ClinicalNoteItem>(
      `/clinician/clients/${clientId}/notes?${params.toString()}`,
      {}
    );
  },

  /**
   * Update a clinical note.
   */
  async updateNote(
    noteId: string,
    content?: string,
    category?: string
  ): Promise<ClinicalNoteItem> {
    const params = new URLSearchParams();
    if (content !== undefined) params.set("content", content);
    if (category !== undefined) params.set("category", category);
    return api.put<ClinicalNoteItem>(
      `/clinician/notes/${noteId}?${params.toString()}`,
      {}
    );
  },

  /**
   * Delete a clinical note.
   */
  async deleteNote(noteId: string): Promise<void> {
    return api.del<void>(`/clinician/notes/${noteId}`);
  },

  // --- Alert Acknowledgment ---

  /**
   * Acknowledge (review) a clinical alert.
   */
  async acknowledgeAlert(
    alertId: string,
    actionTaken = "reviewed",
    responseNote?: string
  ): Promise<AlertAcknowledgmentItem> {
    const params = new URLSearchParams({ action_taken: actionTaken });
    if (responseNote) params.set("response_note", responseNote);
    return api.post<AlertAcknowledgmentItem>(
      `/clinician/alerts/${alertId}/acknowledge?${params.toString()}`,
      {}
    );
  },
};
