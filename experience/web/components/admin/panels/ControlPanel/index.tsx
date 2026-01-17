/**
 * Control Panel Component
 *
 * Left sidebar with emotion selection, filters, and settings.
 * Uses tabbed interface for better organization: Explore vs View.
 */

"use client";

import { useState, useMemo } from "react";
import { useAtlasAdminStore } from "@/stores/useAtlasAdminStore";
import { useSettingsStore } from "@/stores/useSettingsStore";
import { BRIDGE_EMOTIONS } from "@/types/atlas-admin";
import { useEmotionSearch } from "@/hooks/admin/useEmotionSearch";
import { useCategoryState } from "@/hooks/admin/useCategoryState";
import { EmotionSearch } from "./EmotionSearch";
import { QuickActions } from "./QuickActions";
import { CategoryBrowser } from "./CategoryBrowser";
import { AnimationModeSelector } from "./AnimationModeSelector";
import { LayerControls } from "./LayerControls";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

type TabType = "explore" | "view";

export function ControlPanel() {
  const [activeTab, setActiveTab] = useState<TabType>("explore");
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Store state
  const allEmotions = useAtlasAdminStore((state) => state.allEmotions);
  const selectedIds = useAtlasAdminStore((state) => state.selectedEmotionIds);
  const categoryFilters = useAtlasAdminStore((state) => state.categoryFilters);
  const settings = useAtlasAdminStore((state) => state.settings);
  const layers = useAtlasAdminStore((state) => state.layers);

  // Store actions
  const toggleEmotion = useAtlasAdminStore((state) => state.toggleEmotion);
  const toggleCategory = useAtlasAdminStore((state) => state.toggleCategory);
  const clearSelection = useAtlasAdminStore((state) => state.clearSelection);
  const toggleCategoryFilter = useAtlasAdminStore((state) => state.toggleCategoryFilter);
  const enableAllCategories = useAtlasAdminStore((state) => state.enableAllCategories);
  const disableAllCategories = useAtlasAdminStore((state) => state.disableAllCategories);
  const updateSetting = useAtlasAdminStore((state) => state.updateSetting);
  const toggleLayer = useAtlasAdminStore((state) => state.toggleLayer);

  // Custom hooks
  const { searchQuery, setSearchQuery, filteredEmotions, hasActiveSearch } = useEmotionSearch({
    allEmotions,
  });
  const {
    expandedCategories,
    toggleCategoryExpansion,
    emotionsByCategory,
    getCategorySelectionState,
  } = useCategoryState({ allEmotions, selectedIds });

  // Quick selection function
  const selectBridgeEmotions = () => {
    clearSelection();
    allEmotions
      .filter((e) => (BRIDGE_EMOTIONS as readonly string[]).includes(e.name))
      .forEach((e) => toggleEmotion(e.id));
  };

  // Check if all categories are enabled
  const allCategoriesEnabled = useMemo(() => {
    return Array.from(categoryFilters.values()).every((filter) => filter.enabled);
  }, [categoryFilters]);

  // Toggle all categories
  const toggleAllCategories = () => {
    if (allCategoriesEnabled) {
      disableAllCategories();
    } else {
      enableAllCategories();
    }
  };

  // Theme
  const theme = useAdminTheme();

  return (
    <div
      className={`h-full flex flex-col transition-colors duration-500 ${theme.colors.background} ${theme.effects.backdropBlur} border-r ${theme.colors.border}`}
      style={{ fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined }} // Font fallback logic
    >
      {/* Tab Navigation */}
      <div className={`flex-shrink-0 p-3 border-b ${theme.colors.border} bg-black/20`}>
        <div
          className={`flex gap-1 p-1 ${theme.layout.borderRadius} border ${theme.colors.border} bg-black/20`}
        >
          <button
            onClick={() => setActiveTab("explore")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${theme.layout.borderRadius} ${
              activeTab === "explore"
                ? `${theme.colors.primary} ${theme.effects.glass} shadow-sm`
                : `${theme.colors.text.secondary} hover:${theme.colors.text.primary} hover:bg-white/5`
            }`}
          >
            <span className={theme.typography.tracking}>EXPLORE</span>
          </button>
          <button
            onClick={() => setActiveTab("view")}
            className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${theme.layout.borderRadius} ${
              activeTab === "view"
                ? `${theme.colors.primary} ${theme.effects.glass} shadow-sm`
                : `${theme.colors.text.secondary} hover:${theme.colors.text.primary} hover:bg-white/5`
            }`}
          >
            <span className={theme.typography.tracking}>VIEW</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden min-h-0">
        {activeTab === "explore" ? (
          <div className="h-full flex flex-col p-4 space-y-4">
            {/* Search */}
            <EmotionSearch
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              filteredEmotions={filteredEmotions}
              selectedIds={selectedIds}
              onToggleEmotion={toggleEmotion}
              showResults={hasActiveSearch}
            />

            {/* Quick Actions - only show when not searching */}
            {!hasActiveSearch && (
              <QuickActions
                selectedCount={selectedIds.size}
                onClearSelection={clearSelection}
                onSelectBridgeEmotions={selectBridgeEmotions}
                showRecommendations={showRecommendations}
                onToggleRecommendations={() => setShowRecommendations(!showRecommendations)}
              />
            )}

            {/* Category Browser - only show when not searching */}
            {!hasActiveSearch && (
              <CategoryBrowser
                categoryFilters={categoryFilters}
                emotionsByCategory={emotionsByCategory}
                expandedCategories={expandedCategories}
                selectedIds={selectedIds}
                onToggleCategoryExpansion={toggleCategoryExpansion}
                onToggleCategory={toggleCategory}
                onToggleEmotion={toggleEmotion}
                getCategorySelectionState={getCategorySelectionState}
              />
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col p-4 space-y-6 overflow-y-auto custom-scrollbar">
            {/* Animation Mode Selector */}
            <AnimationModeSelector
              currentMode={settings.pathAnimationMode}
              onModeChange={(mode) =>
                useSettingsStore.getState().updateVisualSetting("pathAnimationMode", mode)
              }
            />

            {/* Layer Controls */}
            <LayerControls
              categoryFilters={categoryFilters}
              layers={layers}
              settings={settings}
              allCategoriesEnabled={allCategoriesEnabled}
              onToggleCategoryFilter={toggleCategoryFilter}
              onToggleAllCategories={toggleAllCategories}
              onUpdateSetting={updateSetting}
              onToggleLayer={toggleLayer}
            />
          </div>
        )}
      </div>
    </div>
  );
}
