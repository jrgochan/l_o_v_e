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
  return (
    <div className="flex items-center justify-between p-4 border-b border-gray-700 bg-gray-900/50">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Emotion Transition Matrix</h2>
          <p className="text-sm text-gray-400">
            {viewMode === "emotions"
              ? "Grid showing all possible emotional transitions"
              : "Grid showing category-level transitions"}
          </p>
        </div>

        {/* View Mode Toggle - Enhanced UX */}
        <div className="flex bg-gray-800 rounded-lg p-1 border border-gray-700">
          <button
            onClick={() => onViewModeChange("emotions")}
            className={`px-4 py-2 text-sm rounded transition-all ${
              viewMode === "emotions"
                ? "bg-cyan-600 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
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
                ? "bg-cyan-600 text-white shadow-lg"
                : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
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
            <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-2 rounded border border-gray-700">
              Computed: <span className="text-white font-mono font-semibold">{stats.computed}</span>{" "}
              / {stats.totalPossible}
              <span className="ml-2 text-cyan-400">({stats.percentage}%)</span>
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
          className="px-4 py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded transition-all hover:shadow-lg"
          title={isComputing ? "Cannot close while computing" : "Close matrix view"}
        >
          Close
        </button>
      </div>
    </div>
  );
}
