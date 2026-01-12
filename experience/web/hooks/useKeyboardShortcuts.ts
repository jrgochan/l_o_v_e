/**
 * useKeyboardShortcuts Hook
 *
 * Provides keyboard shortcuts for power users.
 * Refactored to use sub-hooks for better maintainability.
 */

import { useLayerShortcuts } from "./shortcuts/useLayerShortcuts";
import { useNavigationShortcuts } from "./shortcuts/useNavigationShortcuts";
import { useSiteShortcuts } from "./shortcuts/useSiteShortcuts";

export function useKeyboardShortcuts() {
  // 1. Layer Toggles (Space, L, S, G, A, O, E, P, X)
  useLayerShortcuts();

  // 2. Navigation (Arrows, Numbers)
  useNavigationShortcuts();

  // 3. Site Actions (CMD+K, Esc, Settings, Help, Flight, Zen, Audio)
  useSiteShortcuts();
}
