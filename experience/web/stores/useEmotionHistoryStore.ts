/**
 * Emotion History Store
 *
 * Tracks all analyzed emotions from chat sessions.
 * Manages visibility in Soul Sphere and provides export functionality.
 */

import { create } from "zustand";
import type { VAC, InsightData } from "@/types/chat";

export interface EmotionHistoryEntry {
  id: string;
  emotion: string;
  category: string;
  vac: VAC;
  confidence: number;
  timestamp: Date;
  isVisibleInSphere: boolean;
  messageId: string;
  transcription?: string;
  insights?: InsightData;
}

interface EmotionHistoryState {
  entries: EmotionHistoryEntry[];
  viewMode: "list" | "timeline";
  isCollapsed: boolean;

  // Actions
  addEntry: (entry: Omit<EmotionHistoryEntry, "id">) => void;
  removeEntry: (id: string) => void;
  toggleVisibility: (id: string) => void;
  setVisibility: (id: string, visible: boolean) => void;
  toggleViewMode: () => void;
  toggleCollapsed: () => void;
  clearHistory: () => void;
  selectAllForSphere: () => void;
  deselectAllFromSphere: () => void;
  exportHistory: () => void;

  // Derived state
  getVisibleEntries: () => EmotionHistoryEntry[];
  getEntryCount: () => number;
}

export const useEmotionHistoryStore = create<EmotionHistoryState>((set, get) => ({
  entries: [],
  viewMode: "list",
  isCollapsed: false,

  // Add new emotion to history
  addEntry: (entry) => {
    const newEntry: EmotionHistoryEntry = {
      ...entry,
      id: `history-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    set((state) => {
      // Limit history to 50
      const updatedEntries = [...state.entries, newEntry];
      if (updatedEntries.length > 50) {
        return { entries: updatedEntries.slice(updatedEntries.length - 50) };
      }
      return { entries: updatedEntries };
    });
  },

  // Remove entry from history
  removeEntry: (id) => {
    set((state) => ({
      entries: state.entries.filter((e) => e.id !== id),
    }));
  },

  // Toggle sphere visibility for an entry
  toggleVisibility: (id) => {
    set((state) => ({
      entries: state.entries.map((e) =>
        e.id === id ? { ...e, isVisibleInSphere: !e.isVisibleInSphere } : e
      ),
    }));
  },

  // Set specific visibility state
  setVisibility: (id, visible) => {
    set((state) => ({
      entries: state.entries.map((e) => (e.id === id ? { ...e, isVisibleInSphere: visible } : e)),
    }));
  },

  // Toggle between list and timeline view
  toggleViewMode: () => {
    set((state) => ({
      viewMode: state.viewMode === "list" ? "timeline" : "list",
    }));
  },

  // Toggle collapsed state
  toggleCollapsed: () => {
    set((state) => ({
      isCollapsed: !state.isCollapsed,
    }));
  },

  // Clear all history
  clearHistory: () => {
    set({ entries: [] });
  },

  // Make all entries visible in sphere
  selectAllForSphere: () => {
    set((state) => ({
      entries: state.entries.map((e) => ({ ...e, isVisibleInSphere: true })),
    }));
  },

  // Hide all entries from sphere
  deselectAllFromSphere: () => {
    set((state) => ({
      entries: state.entries.map((e) => ({ ...e, isVisibleInSphere: false })),
    }));
  },

  // Export history as JSON
  exportHistory: () => {
    const state = get();
    const data = {
      exported_at: new Date().toISOString(),
      entry_count: state.entries.length,
      entries: state.entries.map((e) => ({
        ...e,
        timestamp: e.timestamp.toISOString(),
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `emotion-history-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Get entries visible in sphere
  getVisibleEntries: () => {
    return get().entries.filter((e) => e.isVisibleInSphere);
  },

  // Get total count
  getEntryCount: () => {
    return get().entries.length;
  },
}));
