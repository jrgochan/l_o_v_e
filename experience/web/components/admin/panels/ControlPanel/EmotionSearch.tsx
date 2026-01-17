/**
 * Emotion Search Component
 *
 * Search input and filtered emotion list display.
 * Highlights bridge emotions with star icon.
 */

"use client";

// import { useToast } from "@/hooks/useToast";
import { BRIDGE_EMOTIONS } from "@/types/atlas-admin";
import type { AtlasEmotion } from "@/types/atlas-admin";

interface EmotionSearchProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filteredEmotions: AtlasEmotion[];
  selectedIds: Set<string>;
  onToggleEmotion: (id: string) => void;
}

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

/**
 * Renders search input and filtered emotion list
 */
export function EmotionSearch({
  searchQuery,
  onSearchChange,
  filteredEmotions,
  selectedIds,
  onToggleEmotion,
  showResults = true,
}: EmotionSearchProps & { showResults?: boolean }) {
  const theme = useAdminTheme();

  // const toast = useToast();

  const handleToggle = (emotion: AtlasEmotion) => {
    const isSelected = selectedIds.has(emotion.id);
    onToggleEmotion(emotion.id);

    if (isSelected) {
      // console.log(`[EmotionSearch] Removed ${emotion.name}`);
    } else {
      // console.log(`[EmotionSearch] Selected ${emotion.name}`);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <section>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span
              className={`${theme.colors.text.muted} group-focus-within:${theme.colors.primary} transition-colors`}
            >
              🔍
            </span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emotions..."
            className={`w-full pl-10 pr-4 py-2 bg-black/20 border ${theme.colors.border} ${theme.layout.borderRadius} ${theme.colors.text.primary} text-sm focus:outline-none focus:ring-1 focus:ring-current caret-current transition shadow-sm placeholder-gray-500/50`}
            style={{
              fontFamily: theme.typography.fontFamily === "font-mono" ? "monospace" : undefined,
            }}
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className={`absolute inset-y-0 right-0 pr-3 flex items-center ${theme.colors.text.muted} hover:${theme.colors.text.primary} transition`}
              title="Clear search"
            >
              ✕
            </button>
          )}
        </div>
      </section>

      {/* Emotion List */}
      {showResults && (
        <section className="animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-2">
            <h2
              className={`text-xs font-semibold uppercase tracking-wider ${theme.colors.text.muted}`}
            >
              Results
            </h2>
            <span
              className={`text-xs px-2 py-0.5 rounded-full border ${theme.colors.border} ${theme.colors.text.secondary} bg-black/20`}
            >
              {filteredEmotions.length}
            </span>
          </div>

          <div className="space-y-1">
            {filteredEmotions.length === 0 ? (
              <div
                className={`text-center py-8 text-sm italic border ${theme.colors.border} ${theme.layout.borderRadius} bg-black/10 ${theme.colors.text.muted}`}
              >
                No emotions found matching &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              filteredEmotions.map((emotion) => {
                const isSelected = selectedIds.has(emotion.id);
                const isBridge = (BRIDGE_EMOTIONS as readonly string[]).includes(emotion.name);

                return (
                  <button
                    key={emotion.id}
                    onClick={() => handleToggle(emotion)}
                    className={`w-full px-3 py-2.5 text-left text-sm transition-all border ${theme.layout.borderRadius} ${
                      isSelected
                        ? `${theme.colors.primary} ${theme.effects.glass} border-current shadow-lg`
                        : `border-transparent bg-transparent ${theme.colors.text.secondary} hover:bg-white/5 hover:${theme.colors.text.primary}`
                    }`}
                    style={{
                      fontFamily:
                        theme.typography.fontFamily === "font-mono" ? "monospace" : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? theme.colors.primary.replace("text-", "bg-") : "bg-gray-600"}`}
                        />
                        <span className="font-medium">{emotion.name}</span>
                        {isBridge && (
                          <span className="text-yellow-400 text-xs" title="Bridge Emotion">
                            ★
                          </span>
                        )}
                      </div>
                      {isSelected && <span className="text-xs font-bold opacity-80">SELECTED</span>}
                    </div>
                    <div className={`text-xs mt-1 pl-4 opacity-60`}>{emotion.category}</div>
                  </button>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
}
