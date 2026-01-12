/**
 * Category Browser Component
 *
 * Expandable category list with emotion selection:
 * - Category headers with expand/collapse
 * - Color-coded categories
 * - Selection state indicators (all/some/none)
 * - Individual emotion checkboxes
 * - Bridge emotion highlighting
 */

"use client";

import { isBridgeEmotion } from "@/types/atlas-admin";
import type { AtlasEmotion, CategoryFilter } from "@/types/atlas-admin";

interface CategoryBrowserProps {
  categoryFilters: Map<string, CategoryFilter>;
  emotionsByCategory: Map<string, AtlasEmotion[]>;
  expandedCategories: Set<string>;
  selectedIds: Set<string>;
  onToggleCategoryExpansion: (category: string) => void;
  onToggleCategory: (category: string) => void;
  onToggleEmotion: (id: string) => void;
  getCategorySelectionState: (category: string) => "all" | "some" | "none";
}

/**
 * Renders expandable category browser with emotion lists
 */
export function CategoryBrowser({
  categoryFilters,
  emotionsByCategory,
  expandedCategories,
  selectedIds,
  onToggleCategoryExpansion,
  onToggleCategory,
  onToggleEmotion,
  getCategorySelectionState,
}: CategoryBrowserProps) {
  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          Categories & Emotions
        </h2>
        <span className="text-xs text-gray-600 bg-gray-900 border border-gray-800 px-2 py-0.5 rounded-full">
          {Array.from(categoryFilters.values()).filter((f) => f.enabled).length} Active
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
        {Array.from(categoryFilters.values()).map((filter) => {
          const isExpanded = expandedCategories.has(filter.name);
          const selectionState = getCategorySelectionState(filter.name);
          const categoryEmotions = emotionsByCategory.get(filter.name) || [];

          return (
            <div key={filter.name} className="border border-gray-700 rounded overflow-hidden">
              {/* Category Header */}
              <div className="flex items-center gap-2 px-2 py-2 bg-gray-800 hover:bg-gray-750 transition">
                {/* Expand/Collapse Arrow */}
                <button
                  onClick={() => onToggleCategoryExpansion(filter.name)}
                  className="text-gray-400 hover:text-white transition"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? "▼" : "▶"}
                </button>

                {/* Category Color */}
                <div
                  className="w-3 h-3 rounded flex-shrink-0"
                  style={{ backgroundColor: filter.color }}
                />

                {/* Category Name & Count */}
                <button
                  onClick={() => onToggleCategoryExpansion(filter.name)}
                  className="text-sm text-gray-300 flex-1 text-left"
                  title="Click to expand/collapse"
                >
                  {filter.name}
                </button>

                <span className="text-xs text-gray-500">({filter.emotionCount})</span>

                {/* Add/Remove Category Button */}
                <button
                  onClick={() => onToggleCategory(filter.name)}
                  className={`px-2 py-1 rounded text-xs font-medium transition ${
                    selectionState === "all"
                      ? "bg-cyan-600 text-white hover:bg-cyan-500"
                      : selectionState === "some"
                        ? "bg-cyan-600/50 text-white hover:bg-cyan-500/70"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  }`}
                  title={
                    selectionState === "all"
                      ? "Remove all emotions from category"
                      : selectionState === "some"
                        ? "Complete category selection"
                        : "Add all emotions from category"
                  }
                >
                  {selectionState === "all"
                    ? "✓ All"
                    : selectionState === "some"
                      ? "◐ Some"
                      : "+ Add"}
                </button>
              </div>

              {/* Emotion List (Collapsible) */}
              {isExpanded && (
                <div className="bg-gray-850 border-t border-gray-700">
                  {categoryEmotions.map((emotion) => {
                    const isSelected = selectedIds.has(emotion.id);
                    const isBridge = isBridgeEmotion(emotion.name);

                    return (
                      <button
                        key={emotion.id}
                        onClick={() => onToggleEmotion(emotion.id)}
                        className={`w-full flex items-center gap-2 px-8 py-1.5 text-left text-sm transition ${
                          isSelected
                            ? "bg-cyan-600/20 text-cyan-200 hover:bg-cyan-600/30"
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
                        }`}
                      >
                        <span className="text-xs">{isSelected ? "✓" : "○"}</span>
                        <span className="flex-1">
                          {emotion.name}
                          {isBridge && <span className="ml-1 text-yellow-400">★</span>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
