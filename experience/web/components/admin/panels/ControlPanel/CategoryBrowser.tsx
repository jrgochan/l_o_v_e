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

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

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
  const theme = useAdminTheme();

  return (
    <section className="flex-1 min-h-0 flex flex-col">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.muted}`}>
          Categories & Emotions
        </h2>
        <span className={`text-xs px-2 py-0.5 rounded-full border ${theme.colors.border} ${theme.colors.text.secondary} bg-black/20`}>
          {Array.from(categoryFilters.values()).filter((f) => f.enabled).length} Active
        </span>
      </div>

      <div className="space-y-2 overflow-y-auto pr-2 custom-scrollbar flex-1 pb-4">
        {Array.from(categoryFilters.values()).map((filter) => {
          const isExpanded = expandedCategories.has(filter.name);
          const selectionState = getCategorySelectionState(filter.name);
          const categoryEmotions = emotionsByCategory.get(filter.name) || [];

          return (
            <div
              key={filter.name}
              className={`border ${theme.colors.border} ${theme.layout.borderRadius} overflow-hidden transition-colors duration-300`}
            >
              {/* Category Header */}
              <div
                className={`flex items-center gap-2 px-2 py-2 transition-colors duration-200 ${isExpanded ? "bg-white/5" : "bg-transparent hover:bg-white/5"
                  }`}
              >
                {/* Expand/Collapse Arrow */}
                <button
                  onClick={() => onToggleCategoryExpansion(filter.name)}
                  className={`transition-colors ${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? "▼" : "▶"}
                </button>

                {/* Category Color */}
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: filter.color }}
                />

                {/* Category Name & Count */}
                <button
                  onClick={() => onToggleCategoryExpansion(filter.name)}
                  className={`text-sm flex-1 text-left ${theme.colors.text.secondary} hover:${theme.colors.text.primary}`}
                  title="Click to expand/collapse"
                  style={{ fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined }}
                >
                  {filter.name}
                </button>

                <span className={`text-xs ${theme.colors.text.muted}`}>({filter.emotionCount})</span>

                {/* Add/Remove Category Button */}
                <button
                  onClick={() => onToggleCategory(filter.name)}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${theme.layout.borderRadius} ${selectionState === "all"
                      ? `${theme.colors.primary} bg-white/10`
                      : selectionState === "some"
                        ? `${theme.colors.secondary} bg-white/5`
                        : `${theme.colors.text.muted} hover:${theme.colors.text.primary} hover:bg-white/10`
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
                <div className={`border-t ${theme.colors.border} bg-black/10`}>
                  {categoryEmotions.map((emotion) => {
                    const isSelected = selectedIds.has(emotion.id);
                    const isBridge = isBridgeEmotion(emotion.name);

                    return (
                      <button
                        key={emotion.id}
                        onClick={() => onToggleEmotion(emotion.id)}
                        className={`w-full flex items-center gap-2 px-8 py-1.5 text-left text-sm transition-colors duration-200 ${isSelected
                            ? `${theme.colors.primary} bg-white/5`
                            : `${theme.colors.text.secondary} hover:${theme.colors.text.primary} hover:bg-white/5`
                          }`}
                        style={{ fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined }}
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
