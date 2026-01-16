/**
 * Emotion History Panel Component
 *
 * Left sidebar in chat panel showing chronological list of analyzed emotions.
 * Allows bulk operations and view mode toggling.
 */

"use client";

import { useEmotionHistoryStore } from "@/stores/useEmotionHistoryStore";
import { EmotionHistoryCard } from "../state-display/EmotionHistoryCard";
import { EmotionTimeline } from "../visualizations/EmotionTimeline";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function EmotionHistoryPanel() {
  const theme = useAdminTheme();
  const entries = useEmotionHistoryStore((state) => state.entries);
  const viewMode = useEmotionHistoryStore((state) => state.viewMode);
  const isCollapsed = useEmotionHistoryStore((state) => state.isCollapsed);

  const toggleVisibility = useEmotionHistoryStore((state) => state.toggleVisibility);
  const removeEntry = useEmotionHistoryStore((state) => state.removeEntry);
  const toggleViewMode = useEmotionHistoryStore((state) => state.toggleViewMode);
  const toggleCollapsed = useEmotionHistoryStore((state) => state.toggleCollapsed);
  const clearHistory = useEmotionHistoryStore((state) => state.clearHistory);
  const selectAllForSphere = useEmotionHistoryStore((state) => state.selectAllForSphere);
  const deselectAllFromSphere = useEmotionHistoryStore((state) => state.deselectAllFromSphere);
  const exportHistory = useEmotionHistoryStore((state) => state.exportHistory);

  const visibleCount = entries.filter((e) => e.isVisibleInSphere).length;

  // Collapsed state - just icon bar
  if (isCollapsed) {
    return (
      <div className={`w-10 ${theme.colors.background}/80 border-r ${theme.colors.border} flex flex-col items-center py-4`}>
        <button
          onClick={toggleCollapsed}
          className="text-gray-400 hover:text-white transition rotate-180"
          title="Expand history"
        >
          ▶
        </button>
        {entries.length > 0 && (
          <div className="mt-4">
            <div className="w-6 h-6 bg-cyan-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
              {entries.length}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`w-72 ${theme.colors.background}/80 border-r ${theme.colors.border} flex flex-col`}>
      {/* Header */}
      <div className={`p-3 border-b ${theme.colors.border} space-y-2`}>
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            📊 History
            {entries.length > 0 && (
              <span className="px-2 py-0.5 bg-cyan-600 rounded-full text-xs">{entries.length}</span>
            )}
          </h3>
          <button
            onClick={toggleCollapsed}
            className="text-gray-400 hover:text-white transition"
            title="Collapse history"
          >
            ◀
          </button>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleViewMode}
            className={`flex-1 px-2 py-1 rounded text-xs transition ${viewMode === "list"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            📋 List
          </button>
          <button
            onClick={toggleViewMode}
            className={`flex-1 px-2 py-1 rounded text-xs transition ${viewMode === "timeline"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
              }`}
          >
            📊 Timeline
          </button>
        </div>

        {/* Visible Count */}
        {visibleCount > 0 && (
          <div className="text-xs text-gray-400">{visibleCount} visible in sphere</div>
        )}
      </div>

      {/* Empty State */}
      {entries.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center text-gray-500 text-sm">
            <p className="mb-2">No emotions yet</p>
            <p className="text-xs">Start chatting to build your emotion history</p>
          </div>
        </div>
      )}

      {/* List View */}
      {entries.length > 0 && viewMode === "list" && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {entries
            .slice()
            .reverse()
            .map((entry) => (
              <EmotionHistoryCard
                key={entry.id}
                entry={entry}
                onToggleVisibility={toggleVisibility}
                onRemove={removeEntry}
              />
            ))}
        </div>
      )}

      {/* Timeline View */}
      {entries.length > 0 && viewMode === "timeline" && (
        <div className="flex-1 overflow-y-auto p-3">
          <EmotionTimeline entries={entries} onToggleVisibility={toggleVisibility} />
        </div>
      )}

      {/* Bulk Actions Footer */}
      {entries.length > 0 && (
        <div className={`p-3 border-t ${theme.colors.border} space-y-2`}>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={selectAllForSphere}
              className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white text-xs rounded transition"
              title="Show all in sphere"
            >
              ☑ All
            </button>
            <button
              onClick={deselectAllFromSphere}
              className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white text-xs rounded transition"
              title="Hide all from sphere"
            >
              ☐ None
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={exportHistory}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 text-white text-xs rounded transition"
              title="Export as JSON"
            >
              💾 Export
            </button>
            <button
              onClick={clearHistory}
              className="px-3 py-1.5 bg-red-700 hover:bg-red-600 text-white text-xs rounded transition"
              title="Clear all history"
            >
              🗑️ Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
