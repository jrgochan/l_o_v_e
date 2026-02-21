/**
 * Matrix Header Component
 *
 * Header for path matrix with:
 * - Title and description
 * - View mode toggle (emotions/categories)
 * - Action buttons (load cache, compute all, export)
 * - Progress indicators
 * - Close button
 */

"use client";

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface MatrixHeaderProps {
  viewMode: "emotions" | "categories";
  onViewModeChange: (mode: "emotions" | "categories") => void;
  isComputing: boolean;
  isLoadingCache: boolean;
  progress: { current: number; total: number; percentage: number };
  estimatedTimeRemaining: string;
  stats: {
    computed: number;
    totalPossible: number;
    percentage: string;
  };
  onLoadCache: () => void;
  onComputeAll: () => void;
  onExport: () => void;
  onClose: () => void;
}

/**
 * Renders matrix header with controls and status
 */
export function MatrixHeader({
  viewMode,
  onViewModeChange,
  isComputing,
  isLoadingCache,
  progress,
  estimatedTimeRemaining,
  stats,
  onLoadCache,
  onComputeAll,
  onExport,
  onClose,
}: MatrixHeaderProps) {
  const theme = useAdminTheme();

  return (
    <div
      className={`flex items-center justify-between p-4 border-b ${theme.colors.border} ${theme.colors.background}`}
    >
      <div className="flex items-center gap-4">
        <div>
          <h2 className={`text-xl font-bold ${theme.colors.text.primary}`}>
            Emotion Transition Matrix
          </h2>
          <p className={`text-sm ${theme.colors.text.secondary}`}>
            {viewMode === "emotions"
              ? "Grid showing all possible emotional transitions"
              : "Grid showing category-level transitions"}
          </p>
        </div>

        {/* View Mode Toggle - Enhanced UX */}
        <div className={`flex bg-black/20 rounded-lg p-1 border ${theme.colors.border}`}>
          <button
            onClick={() => onViewModeChange("emotions")}
            className={`px-4 py-2 text-sm rounded transition-all ${
              viewMode === "emotions"
                ? `bg-black/40 ${theme.colors.text.primary} shadow-lg border ${theme.colors.border}`
                : `${theme.colors.text.secondary} hover:${theme.colors.text.primary} ${theme.colors.hover}`
            }`}
          >
            <span className="flex items-center gap-2">
              <span>🎭</span>
              <span>Emotions</span>
            </span>
          </button>
          <button
            onClick={() => onViewModeChange("categories")}
            className={`px-4 py-2 text-sm rounded transition-all ${
              viewMode === "categories"
                ? `bg-black/40 ${theme.colors.text.primary} shadow-lg border ${theme.colors.border}`
                : `${theme.colors.text.secondary} hover:${theme.colors.text.primary} ${theme.colors.hover}`
            }`}
          >
            <span className="flex items-center gap-2">
              <span>📂</span>
              <span>Categories (13×13)</span>
            </span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Computing Progress */}
        {isComputing ? (
          <div className="flex items-center gap-3 bg-cyan-900/30 px-4 py-2 rounded-lg border border-cyan-500/30">
            <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <div className="text-sm">
              <div className="text-cyan-400 font-medium">
                Computing: {progress.current} / {progress.total} ({progress.percentage}%)
              </div>
              <div className="text-gray-400 text-xs">{estimatedTimeRemaining}</div>
            </div>
          </div>
        ) : (
          <>
            {/* Stats Display */}
            <div
              className={`text-sm ${theme.colors.text.secondary} bg-black/20 px-3 py-2 rounded border ${theme.colors.border}`}
            >
              Computed:{" "}
              <span className={`${theme.colors.text.primary} font-mono font-semibold`}>
                {stats.computed}
              </span>{" "}
              / {stats.totalPossible}
              <span className={`ml-2 ${theme.colors.primary}`}>({stats.percentage}%)</span>
            </div>

            {/* Loading Cache Indicator */}
            {isLoadingCache ? (
              <div className="flex items-center gap-2 text-cyan-400 bg-cyan-900/20 px-3 py-2 rounded border border-cyan-500/30">
                <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
                <span className="text-sm">Loading cache...</span>
              </div>
            ) : (
              <>
                {/* Load Cached Button */}
                <button
                  onClick={onLoadCache}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition-all hover:shadow-lg flex items-center gap-2"
                  title="Load pre-computed paths from backend cache"
                >
                  <span>📥</span>
                  <span>Load Cached Paths</span>
                </button>

                {/* Compute All Button */}
                {stats.computed < stats.totalPossible && (
                  <button
                    onClick={onComputeAll}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-sm rounded transition-all hover:shadow-lg flex items-center gap-2"
                    title="Compute all missing paths (may take several minutes)"
                  >
                    <span>🚀</span>
                    <span>Compute All Paths</span>
                  </button>
                )}

                {/* Export Button */}
                {stats.computed > 0 && (
                  <button
                    onClick={onExport}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-all hover:shadow-lg flex items-center gap-2"
                    title="Export matrix data as CSV"
                  >
                    <span>📊</span>
                    <span>Export CSV</span>
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isComputing}
          className={`px-4 py-2 bg-black/40 border ${theme.colors.border} ${theme.colors.hover} disabled:opacity-50 ${theme.colors.text.primary} rounded transition-all hover:shadow-lg`}
          title={isComputing ? "Cannot close while computing" : "Close matrix view"}
        >
          Close
        </button>
      </div>
    </div>
  );
}
