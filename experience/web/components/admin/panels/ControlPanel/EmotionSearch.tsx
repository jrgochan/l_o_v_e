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
            <span className="text-gray-500 group-focus-within:text-cyan-500 transition">🔍</span>
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search emotions..."
            className="w-full pl-10 pr-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition shadow-sm placeholder-gray-500"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-white transition"
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
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Results
            </h2>
            <span className="text-xs text-gray-600 bg-gray-800 px-2 py-0.5 rounded-full">
              {filteredEmotions.length}
            </span>
          </div>

          <div className="space-y-1">
            {filteredEmotions.length === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm italic border border-gray-800 rounded-lg bg-gray-900/50">
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
                    className={`w-full px-3 py-2.5 rounded-lg text-left text-sm transition-all border ${
                      isSelected
                        ? "bg-cyan-900/40 border-cyan-700/50 text-cyan-100 shadow-[0_0_10px_rgba(34,211,238,0.1)]"
                        : "bg-gray-800/50 border-gray-700/50 text-gray-300 hover:bg-gray-800 hover:border-gray-600"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${isSelected ? "bg-cyan-400" : "bg-gray-600"}`}
                        />
                        <span className="font-medium">{emotion.name}</span>
                        {isBridge && (
                          <span className="text-yellow-400 text-xs" title="Bridge Emotion">
                            ★
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <span className="text-cyan-400 text-xs font-bold">SELECTED</span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 pl-4">{emotion.category}</div>
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
