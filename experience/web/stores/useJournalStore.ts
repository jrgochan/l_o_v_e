/**
 * Journal Store — Zustand state management for Life Journal.
 *
 * Manages the journal panel UI state, event/correlation data, and
 * integration status. Follows the same patterns as useExperienceStore.
 */

import { create } from "zustand";
import { journalService } from "@/services/journalService";

import type {
  LifeEvent,
  CreateLifeEvent,
  EventFilters,
  Correlation,
  CorrelationFilters,
  AnalysisResult,
  ActiveIntegration,
  IntegrationAdapter,
  JournalTab,
} from "@/types/journal";

interface JournalStore {
  // ---------------------------------------------------------------------------
  // Panel UI State
  // ---------------------------------------------------------------------------
  isPanelOpen: boolean;
  activeTab: JournalTab;

  // ---------------------------------------------------------------------------
  // Data
  // ---------------------------------------------------------------------------
  events: LifeEvent[];
  eventsTotal: number;
  correlations: Correlation[];
  activeIntegrations: ActiveIntegration[];
  availableAdapters: IntegrationAdapter[];

  // ---------------------------------------------------------------------------
  // Loading / Error
  // ---------------------------------------------------------------------------
  isLoading: boolean;
  isAnalyzing: boolean;
  error: string | null;
  lastAnalysis: AnalysisResult | null;

  // ---------------------------------------------------------------------------
  // Panel Actions
  // ---------------------------------------------------------------------------
  togglePanel: () => void;
  openPanel: (tab?: JournalTab) => void;
  closePanel: () => void;
  setActiveTab: (tab: JournalTab) => void;

  // ---------------------------------------------------------------------------
  // Event Actions
  // ---------------------------------------------------------------------------
  fetchEvents: (params?: EventFilters) => Promise<void>;
  createEvent: (event: CreateLifeEvent) => Promise<LifeEvent | null>;
  deleteEvent: (id: string) => Promise<void>;

  // ---------------------------------------------------------------------------
  // Correlation Actions
  // ---------------------------------------------------------------------------
  fetchCorrelations: (params?: CorrelationFilters) => Promise<void>;
  runAnalysis: () => Promise<AnalysisResult | null>;
  submitFeedback: (
    id: string,
    feedback: "confirmed" | "dismissed"
  ) => Promise<void>;

  // ---------------------------------------------------------------------------
  // Integration Actions
  // ---------------------------------------------------------------------------
  fetchIntegrations: () => Promise<void>;
  fetchAvailableAdapters: () => Promise<void>;
  connectIntegration: (
    adapterId: string,
    credentials: Record<string, unknown>,
    settings?: Record<string, unknown>
  ) => Promise<void>;
  disconnectIntegration: (adapterId: string) => Promise<void>;
  syncIntegration: (adapterId: string) => Promise<void>;
  importFile: (file: File) => Promise<void>;
}

export const useJournalStore = create<JournalStore>((set, get) => ({
  // ---------------------------------------------------------------------------
  // Initial State
  // ---------------------------------------------------------------------------
  isPanelOpen: false,
  activeTab: "timeline",
  events: [],
  eventsTotal: 0,
  correlations: [],
  activeIntegrations: [],
  availableAdapters: [],
  isLoading: false,
  isAnalyzing: false,
  error: null,
  lastAnalysis: null,

  // ---------------------------------------------------------------------------
  // Panel Actions
  // ---------------------------------------------------------------------------

  togglePanel: () => {
    const { isPanelOpen } = get();
    if (!isPanelOpen) {
      // Fetch data when opening
      get().fetchEvents();
      get().fetchCorrelations();
    }
    set({ isPanelOpen: !isPanelOpen });
  },

  openPanel: (tab?: JournalTab) => {
    set({ isPanelOpen: true, ...(tab ? { activeTab: tab } : {}) });
    get().fetchEvents();
    get().fetchCorrelations();
  },

  closePanel: () => set({ isPanelOpen: false }),

  setActiveTab: (tab: JournalTab) => {
    set({ activeTab: tab });
    // Fetch tab-specific data
    if (tab === "integrations" && get().availableAdapters.length === 0) {
      get().fetchAvailableAdapters();
      get().fetchIntegrations();
    }
  },

  // ---------------------------------------------------------------------------
  // Event Actions
  // ---------------------------------------------------------------------------

  fetchEvents: async (params: EventFilters = { limit: 50 }) => {
    set({ isLoading: true, error: null });
    try {
      const result = await journalService.listEvents(params);
      set({ events: result.events, eventsTotal: result.total });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to load events" });
    } finally {
      set({ isLoading: false });
    }
  },

  createEvent: async (event: CreateLifeEvent) => {
    set({ isLoading: true, error: null });
    try {
      const created = await journalService.createEvent(event);
      // Prepend to events list
      set((state) => ({
        events: [created, ...state.events],
        eventsTotal: state.eventsTotal + 1,
      }));
      return created;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to create event" });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  deleteEvent: async (id: string) => {
    try {
      await journalService.deleteEvent(id);
      set((state) => ({
        events: state.events.filter((e) => e.id !== id),
        eventsTotal: state.eventsTotal - 1,
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Failed to delete event" });
    }
  },

  // ---------------------------------------------------------------------------
  // Correlation Actions
  // ---------------------------------------------------------------------------

  fetchCorrelations: async (params: CorrelationFilters = {}) => {
    try {
      const result = await journalService.listCorrelations(params);
      set({ correlations: result.correlations });
    } catch (err) {
      // Silent fail — correlations are supplementary
      console.warn("Failed to fetch correlations:", err);
    }
  },

  runAnalysis: async () => {
    set({ isAnalyzing: true, error: null });
    try {
      const result = await journalService.analyzeCorrelations();
      set({ lastAnalysis: result });
      // Refresh correlations list
      await get().fetchCorrelations();
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Analysis failed" });
      return null;
    } finally {
      set({ isAnalyzing: false });
    }
  },

  submitFeedback: async (id: string, feedback: "confirmed" | "dismissed") => {
    try {
      const updated = await journalService.submitFeedback(id, feedback);
      set((state) => ({
        correlations: state.correlations.map((c) =>
          c.id === id ? { ...c, ...updated } : c
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Feedback failed" });
    }
  },

  // ---------------------------------------------------------------------------
  // Integration Actions
  // ---------------------------------------------------------------------------

  fetchIntegrations: async () => {
    try {
      const result = await journalService.listActive();
      set({ activeIntegrations: result.integrations });
    } catch (err) {
      console.warn("Failed to fetch integrations:", err);
    }
  },

  fetchAvailableAdapters: async () => {
    try {
      const result = await journalService.listAvailable();
      set({ availableAdapters: result.adapters });
    } catch (err) {
      console.warn("Failed to fetch adapters:", err);
    }
  },

  connectIntegration: async (adapterId, credentials, settings) => {
    set({ isLoading: true, error: null });
    try {
      await journalService.connect(adapterId, credentials, settings);
      await get().fetchIntegrations();
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Connection failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  disconnectIntegration: async (adapterId: string) => {
    try {
      await journalService.disconnect(adapterId);
      set((state) => ({
        activeIntegrations: state.activeIntegrations.filter(
          (i) => i.adapter_id !== adapterId
        ),
      }));
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Disconnect failed" });
    }
  },

  syncIntegration: async (adapterId: string) => {
    set({ isLoading: true });
    try {
      await journalService.sync(adapterId);
      await get().fetchIntegrations();
      await get().fetchEvents(); // Refresh events after sync
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Sync failed" });
    } finally {
      set({ isLoading: false });
    }
  },

  importFile: async (file: File) => {
    set({ isLoading: true, error: null });
    try {
      await journalService.importFile(file);
      await get().fetchEvents(); // Refresh events after import
    } catch (err) {
      set({ error: err instanceof Error ? err.message : "Import failed" });
    } finally {
      set({ isLoading: false });
    }
  },
}));
