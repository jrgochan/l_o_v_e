/**
 * Admin Soul Sphere Synchronization Hook
 *
 * Bridges useVisualizationStore (admin selections) with useExperienceStore (soul sphere state).
 * Calculates aggregate VAC from selected emotions and updates the sphere accordingly.
 * Refactored to compose specialized sync hooks.
 */

"use client";

import { useSelectionSync } from "./sync/useSelectionSync";
import { usePathSync } from "./sync/usePathSync";

export function useAdminSphereSync() {
  // Sync selected emotions to camera target
  useSelectionSync();

  // Sync selected path to transition path visualizer
  usePathSync();
}
