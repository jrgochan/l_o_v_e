/**
 * Emotion Navigation Hook
 *
 * Bridges chat analysis with Soul Sphere visualization
 * Provides actions to focus, select, and explore emotions.
 * Refactored to compose resolution and action logic.
 */

"use client";

import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useEmotionResolution } from "./navigation/useEmotionResolution";
import { useNavigationActions } from "./navigation/useNavigationActions";

interface UseEmotionNavigationOptions {
  onNavigate?: () => void; // Called when user navigates to sphere (for collapsing chat)
}

export function useEmotionNavigation(options: UseEmotionNavigationOptions = {}) {
  const { onNavigate } = options;
  const getSelectedEmotions = useAtlasAdminStore((state) => state.getSelectedEmotions);

  // 1. Resolution Logic (Find by name)
  const { findEmotionByName } = useEmotionResolution();

  // 2. Action Logic (Focus, Select, View)
  const {
    focusEmotion,
    selectEmotionByName,
    viewInSphere,
    addToSelection,
    viewMultipleInSphere,
    autoFocusEmotion,
  } = useNavigationActions({ findEmotionByName, onNavigate });

  return {
    findEmotionByName,
    focusEmotion,
    selectEmotionByName,
    viewInSphere,
    addToSelection,
    viewMultipleInSphere,
    autoFocusEmotion,
    currentSelection: getSelectedEmotions(),
  };
}
