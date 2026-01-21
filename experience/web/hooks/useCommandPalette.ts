/**
 * useCommandPalette Hook
 *
 * Manages the CMD+K command palette state and actions.
 * Provides keyboard-driven access to all emotions with modifier key actions.
 *
 * Refactored to use sub-hooks for better maintainability.
 */

import { useEffect } from "react";
import { useCommandPaletteState } from "./command-palette/useCommandPaletteState";
import { useCommandPaletteData } from "./command-palette/useCommandPaletteData";
import { useCommandPaletteActions } from "./command-palette/useCommandPaletteActions";
import { useCommandPaletteNavigation } from "./command-palette/useCommandPaletteNavigation";
import { useCommandPaletteFilter } from "./command-palette/useCommandPaletteFilter";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";

export function useCommandPalette() {
  // 1. State Management
  const {
    isOpen,
    currentPage,
    selectedCategory,
    search,
    open,
    close,
    toggle,
    setPage,
    setCategory,
    setSearch,
  } = useCommandPaletteState();

  const selectedEmotionIds = useAtlasAdminStore((state) => state.selectedEmotionIds);

  // 2. Data & Persistence
  const { recentEmotions, favoriteEmotions, addToRecent, toggleFavorite, isRecent, isFavorite } =
    useCommandPaletteData();

  // 3. Actions
  const { executeAction, executeQuickAction } = useCommandPaletteActions({
    close,
    addToRecent,
    setCurrentPage: setPage,
    setSearch,
  });

  // 4. Filtering Logic
  const { filteredEmotions } = useCommandPaletteFilter({
    search,
    selectedCategory,
    favoriteEmotions,
    recentEmotions,
    selectedEmotionIds,
  });

  // 5. Navigation
  const { selectedIndex, setSelectedIndex, handleKeyDown } = useCommandPaletteNavigation({
    filteredEmotions,
    isOpen,
    search,
  });

  // Global Keyboard Listener for Open/Close
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
      }
      if (e.key === "Escape" && isOpen) {
        close();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [toggle, close, isOpen]);

  // Hook up navigation key listener when open
  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleKeyDown]);

  return {
    // State
    isOpen,
    currentPage,
    search,
    selectedCategory,
    selectedIndex,

    // Data
    filteredEmotions,
    recentEmotions,
    favoriteEmotions,

    // Actions
    open,
    close,
    toggle,
    setSearch,
    setCategory,
    setPage,
    goHome: () => setPage("home"),
    viewCategory: (category: string) => setCategory(category),
    setSelectedIndex,
    executeAction,
    executeQuickAction,
    addToRecent,
    toggleFavorite,
    isRecent,
    isFavorite,
  };
}
