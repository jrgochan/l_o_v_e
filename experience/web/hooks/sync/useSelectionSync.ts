"use client";

import { useEffect } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { type VACVector, getCanonicalEmotion } from "@love/experience-shared";
import { logger } from "@/utils/logger";

export function useSelectionSync() {
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const setTarget = useExperienceStore((state) => state.setTarget);

  useEffect(() => {
    // Get selected emotions with robust matching strategy
    // Strategies: Exact ID -> Name Match -> Case-insensitive ID/Name
    let selectedEmotions: { vac: VACVector }[] = allEmotions.filter((emotion) => {
      if (selectedIds.has(emotion.id)) return true;

      // Fallback matching for potential ID/Name mismatches (common in mocks/dev)
      for (const id of selectedIds) {
        if (id === emotion.name) return true;
        if (id.toLowerCase() === emotion.id.toLowerCase()) return true;
        if (id.toLowerCase() === emotion.name.toLowerCase()) return true;
      }
      return false;
    });

    if (selectedEmotions.length === 0 && selectedIds.size > 0) {
      // Emergency Fallback: Look up in CANONICAL_EMOTIONS directly
      // This saves us if 'allEmotions' is empty or IDs are stale/mismatched

      const fallbacks: { vac: VACVector }[] = [];
      selectedIds.forEach((id) => {
        const canon = getCanonicalEmotion(id);
        if (canon) fallbacks.push({ vac: canon.vac });
      });

      if (fallbacks.length > 0) {
        logger.warn("hooks", "Used Canonical Fallback for VAC calculation", {
          count: fallbacks.length,
        });
        selectedEmotions = fallbacks;
      }
    }

    logger.debug("hooks", "AdminSphereSync Update", {
      selectedCount: selectedIds.size,
      resolvedCount: selectedEmotions.length,
      allEmotionsCount: allEmotions.length,
    });

    // If nothing selected (and no fallback), reset to neutral
    if (selectedEmotions.length === 0) {
      setTarget([0, 0, 0]);
      return;
    }

    // Calculate aggregate VAC (simple average)
    const totalV = selectedEmotions.reduce((sum, e) => sum + e.vac[0], 0);
    const totalA = selectedEmotions.reduce((sum, e) => sum + e.vac[1], 0);
    const totalC = selectedEmotions.reduce((sum, e) => sum + e.vac[2], 0);

    const avgV = totalV / selectedEmotions.length;
    const avgA = totalA / selectedEmotions.length;
    const avgC = totalC / selectedEmotions.length;

    const aggregateVAC: VACVector = [avgV || 0, avgA || 0, avgC || 0]; // Safety check for NaN

    // Update soul sphere target
    setTarget(aggregateVAC);
  }, [selectedIds, allEmotions, setTarget]);
}
