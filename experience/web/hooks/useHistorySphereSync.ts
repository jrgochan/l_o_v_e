/**
 * History-Sphere Synchronization Hook
 *
 * Keeps emotion history visibility state in sync with Soul Sphere selections.
 * When user toggles visibility in history, updates the atlas selection.
 */

"use client";

import { useEffect, useRef } from "react";
import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { logger } from "@/utils/logger";

export function useHistorySphereSync() {
  const entries = useEmotionHistoryStore((state) => state.entries);
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const selectEmotion = useAtlasAdminStore((state) => state.selectEmotion);
  const deselectEmotion = useAtlasAdminStore((state) => state.deselectEmotion);
  const setVisibility = useEmotionHistoryStore((state) => state.setVisibility);

  // Track which emotions we're currently syncing to prevent circular updates
  const syncingEmotionsRef = useRef<Set<string>>(new Set());

  // Track previous state to determine sync direction
  const prevEntriesRef = useRef(entries);
  const prevSelectedIdsRef = useRef(selectedIds);

  useEffect(() => {
    const entriesChanged = entries !== prevEntriesRef.current;
    const selectionChanged = selectedIds !== prevSelectedIdsRef.current;

    // 1. History -> Sphere Sync (Only if History entries keys/values changed)
    if (entriesChanged) {
      entries.forEach((entry) => {
        const atlasEmotion = allEmotions.find((e) => e.name === entry.emotion);
        if (!atlasEmotion) return;

        const isSelectedInSphere = selectedIds.has(atlasEmotion.id);

        if (entry.isVisibleInSphere && !isSelectedInSphere) {
          // History says Show, Sphere says Hide -> Show in Sphere
          logger.debug("state", `Adding ${entry.emotion} to sphere from history`, {
            entryId: entry.id,
          });
          syncingEmotionsRef.current.add(entry.id);
          selectEmotion(atlasEmotion.id);
          setTimeout(() => syncingEmotionsRef.current.delete(entry.id), 100);
        } else if (!entry.isVisibleInSphere && isSelectedInSphere) {
          // History says Hide, Sphere says Show -> Hide in Sphere (if no other history entries keep it visible)
          const otherVisibleEntries = entries.filter(
            (e) => e.emotion === entry.emotion && e.id !== entry.id && e.isVisibleInSphere
          );

          if (otherVisibleEntries.length === 0) {
            logger.debug("state", `Removing ${entry.emotion} from sphere (no visible history)`, {
              entryId: entry.id,
            });
            syncingEmotionsRef.current.add(entry.id);
            deselectEmotion(atlasEmotion.id);
            setTimeout(() => syncingEmotionsRef.current.delete(entry.id), 100);
          }
        }
      });
    }

    // 2. Sphere -> History Sync (Only if Selection changed)
    if (selectionChanged) {
      entries.forEach((entry) => {
        // Skip if we are currently syncing this entry (initiated by History change)
        if (syncingEmotionsRef.current.has(entry.id)) return;

        const atlasEmotion = allEmotions.find((e) => e.name === entry.emotion);
        if (!atlasEmotion) return;

        const isSelectedInSphere = selectedIds.has(atlasEmotion.id);

        // If Sphere matches history, nothing to do.
        // If Sphere mismatches history, update history to match Sphere
        if (isSelectedInSphere && !entry.isVisibleInSphere) {
          logger.debug("state", `Syncing ${entry.emotion} visibility to true from sphere`, {
            entryId: entry.id,
          });
          setVisibility(entry.id, true);
        } else if (!isSelectedInSphere && entry.isVisibleInSphere) {
          logger.debug("state", `Syncing ${entry.emotion} visibility to false from sphere`, {
            entryId: entry.id,
          });
          setVisibility(entry.id, false);
        }
      });
    }

    // Update refs
    prevEntriesRef.current = entries;
    prevSelectedIdsRef.current = selectedIds;
  }, [entries, selectedIds, allEmotions, selectEmotion, deselectEmotion, setVisibility]);
}
