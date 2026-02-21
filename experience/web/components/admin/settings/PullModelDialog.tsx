/**
 * Pull Model Dialog - Enhanced UX
 *
 * Beautiful UI for downloading Ollama models with:
 * - Pre-check for existing models
 * - Smart status mapping
 * - Auto-close on quick success
 * - Timeout handling
 */

"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import type { PullProgress } from "@/hooks/useOllamaModels";
import type { ModelInfo } from "@/hooks/useOllamaModels";
import { searchOllamaModels } from "@/utils/ollamaModels";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface PullModelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPull: (modelName: string) => Promise<void>;
  pullProgress: Record<string, PullProgress>;
  localModels: ModelInfo[];
}

export function PullModelDialog({
  isOpen,
  onClose,
  onPull,
  pullProgress,
  localModels,
}: PullModelDialogProps) {
  const theme = useAdminTheme();
  const [modelName, setModelName] = useState("");
  const [isPulling, setIsPulling] = useState(false);
  const [pullStartTime, setPullStartTime] = useState<number | null>(null);
  const [showTimeout, setShowTimeout] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleClose = useCallback(() => {
    setModelName("");
    setIsPulling(false);
    setPullStartTime(null);
    setShowTimeout(false);
    setShowSuggestions(false);
    onClose();
  }, [onClose]);

  const handleSelectSuggestion = (name: string) => {
    setModelName(name);
    setShowSuggestions(false);
  };

  const currentPull = pullProgress[modelName];

  // Search suggestions based on user input
  const suggestions = useMemo(() => {
    return searchOllamaModels(modelName);
  }, [modelName]);

  // Get display status - ignore "unknown" if we've seen a better status
  const getDisplayStatus = (progress: PullProgress | undefined): string | undefined => {
    if (!progress) return undefined;

    // Don't show "unknown" if we have progress data or percent
    if (progress.status === "unknown" && (progress.total || progress.percent)) {
      return "downloading"; // We have download data, so we're downloading
    }

    // If status is "unknown" but we've seen "pulling manifest" before, keep showing "pulling manifest"
    if (progress.status === "unknown") {
      return "pulling manifest"; // Ollama is working, just being weird
    }

    return progress.status;
  };

  const displayStatus = getDisplayStatus(currentPull);

  useEffect(() => {
    // Auto-close on success or already_installed
    if (
      (currentPull?.status === "success" || currentPull?.status === "already_installed") &&
      pullStartTime
    ) {
      const elapsed = Date.now() - pullStartTime;
      if (elapsed < 3000) {
        // Quick success - auto-close after showing message briefly
        setTimeout(() => {
          handleClose();
        }, 1500);
      }
    }
  }, [currentPull?.status, pullStartTime, handleClose]);

  useEffect(() => {
    // Timeout detection - if stuck on unknown/connecting for >5s
    let interval: NodeJS.Timeout;

    if (currentPull && (currentPull.status === "unknown" || !currentPull.status) && pullStartTime) {
      interval = setInterval(() => {
        const elapsed = Date.now() - pullStartTime;
        if (elapsed > 5000) {
          setShowTimeout(true);
        }
      }, 1000);
    } else {
      setShowTimeout(false);
    }

    return () => clearInterval(interval);
  }, [currentPull, currentPull?.status, pullStartTime]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelName.trim()) return;

    // Pre-check: Is model already installed?
    const exists = localModels.some((m) => m.name === modelName.trim());

    if (exists) {
      // Model already exists - show message and auto-close
      setIsPulling(true);
      setPullStartTime(Date.now());

      // Simulate quick "already installed" flow
      setTimeout(() => {
        handleClose();
      }, 1500);
      return;
    }

    // Start the pull
    setIsPulling(true);
    setPullStartTime(Date.now());

    try {
      await onPull(modelName.trim());
    } finally {
      // Keep dialog open to show progress
    }
  };

  const isDownloading =
    currentPull && currentPull.status !== "success" && currentPull.status !== "error";
  const modelExists = localModels.some((m) => m.name === modelName.trim());

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
  };

  // Enhanced status mapping with icons
  const getStatusDisplayInfo = (status: string | undefined) => {
    const statusMap: Record<string, { icon: string; text: string; color: string }> = {
      unknown: { icon: "⏳", text: "Connecting to Ollama...", color: "text-gray-400" },
      "pulling manifest": { icon: "🔍", text: "Checking model...", color: "text-cyan-400" },
      downloading: { icon: "⬇️", text: "Downloading", color: "text-blue-400" },
      "verifying sha256": { icon: "✓", text: "Verifying integrity...", color: "text-purple-400" },
      "writing manifest": { icon: "💾", text: "Installing...", color: "text-green-400" },
      success: { icon: "✅", text: "Complete!", color: "text-green-400" },
      already_installed: { icon: "✅", text: "Already Installed!", color: "text-green-400" },
      error: { icon: "❌", text: "Failed", color: "text-red-400" },
    };

    const mapped = statusMap[status || "unknown"] || statusMap["unknown"];
    return mapped;
  };

  const statusDisplay = currentPull ? getStatusDisplayInfo(displayStatus) : null;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center ${theme.effects.backdropBlur} ${theme.effects.glass}`}
    >
      <div
        className={`${theme.colors.background} ${theme.layout.borderRadius} p-6 max-w-lg w-full mx-4 border ${theme.colors.border}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-xl font-bold ${theme.colors.text.primary}`}>Pull New Model</h2>
          <button
            onClick={handleClose}
            className={`${theme.colors.text.muted} hover:${theme.colors.text.primary} transition`}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <label className={`block text-sm font-medium ${theme.colors.text.secondary} mb-2`}>
              Model Name
            </label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => {
                setModelName(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay to allow click on suggestion
                setTimeout(() => setShowSuggestions(false), 200);
              }}
              placeholder="Type to search models (e.g., mix, phi, llama)..."
              className={`w-full bg-black/20 border ${theme.colors.border} focus:border-cyan-500 rounded px-3 py-2 ${theme.colors.text.primary} text-sm`}
              disabled={isDownloading}
            />

            {/* Autocomplete Dropdown */}
            {showSuggestions && suggestions.length > 0 && !isDownloading && (
              <div
                className={`absolute z-10 w-full mt-1 ${theme.colors.background} border ${theme.colors.border} rounded-lg shadow-lg max-h-64 overflow-y-auto`}
              >
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent onBlur from hiding dropdown
                      handleSelectSuggestion(suggestion.name);
                    }}
                    className={`w-full text-left px-4 py-3 hover:bg-black/20 transition border-b ${theme.colors.border} last:border-b-0`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className={`font-mono ${theme.colors.primary} text-sm mb-0.5`}>
                          {suggestion.name}
                        </div>
                        <div className={`text-xs ${theme.colors.text.secondary} line-clamp-1`}>
                          {suggestion.description}
                        </div>
                        {suggestion.recommended_for && suggestion.recommended_for.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1.5">
                            {suggestion.recommended_for.map((func) => (
                              <span
                                key={func}
                                className="text-xs px-1.5 py-0.5 bg-green-900/30 text-green-400 rounded"
                              >
                                {func}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div
                        className={`text-xs ${theme.colors.text.muted} whitespace-nowrap flex-shrink-0`}
                      >
                        {suggestion.size}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <p className={`text-xs ${theme.colors.text.muted} mt-1`}>
              💡 Start typing to see suggestions, or enter any Ollama model name
            </p>
          </div>

          {/* Already Installed Warning */}
          {modelName.trim() && modelExists && !isPulling && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
              <p className="text-sm text-green-300 flex items-center gap-2">
                <span>✅</span>
                <span>This model is already installed</span>
              </p>
            </div>
          )}

          {/* Progress Display */}
          {(currentPull || (isPulling && modelExists)) && (
            <div className={`bg-black/20 rounded-lg p-4 border ${theme.colors.border}`}>
              {/* Model already installed path */}
              {isPulling && modelExists && !currentPull && (
                <div>
                  <div className="text-center py-3">
                    <div className="text-3xl mb-2">✅</div>
                    <div className="text-green-400 font-medium mb-1">Already Installed!</div>
                    <div className={`text-sm ${theme.colors.text.secondary}`}>
                      {modelName} is ready to use
                    </div>
                  </div>
                </div>
              )}

              {/* WebSocket progress path */}
              {currentPull && (
                <>
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-2">
                      {statusDisplay && (
                        <span
                          className={`font-medium flex items-center gap-2 ${statusDisplay.color}`}
                        >
                          <span
                            className={
                              displayStatus === "unknown" || displayStatus === "downloading"
                                ? "inline-block animate-pulse"
                                : ""
                            }
                          >
                            {statusDisplay.icon}
                          </span>
                          <span>{statusDisplay.text}</span>
                        </span>
                      )}
                      {currentPull.percent !== undefined &&
                        currentPull.percent !== null &&
                        currentPull.percent > 0 && (
                          <span className="text-cyan-400 font-bold">
                            {currentPull.percent.toFixed(1)}%
                          </span>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {currentPull.total &&
                      currentPull.completed !== undefined &&
                      currentPull.percent &&
                      currentPull.percent > 0 && (
                        <div className={`w-full bg-black/40 rounded-full h-2.5 overflow-hidden`}>
                          <div
                            className={`h-full transition-all duration-500 ease-out bg-cyan-500`}
                            style={{ width: `${currentPull.percent}%` }}
                          />
                        </div>
                      )}
                  </div>

                  {/* Details */}
                  {currentPull.total &&
                    currentPull.completed !== undefined &&
                    currentPull.completed > 0 && (
                      <div className={`text-xs ${theme.colors.text.secondary} space-y-1 mb-3`}>
                        <div className="flex justify-between">
                          <span>Downloaded:</span>
                          <span className="font-mono">
                            {formatBytes(currentPull.completed)} / {formatBytes(currentPull.total)}
                          </span>
                        </div>
                        {currentPull.digest && (
                          <div
                            className="font-mono text-gray-500 truncate"
                            title={currentPull.digest}
                          >
                            Digest: {currentPull.digest.substring(0, 20)}...
                          </div>
                        )}
                      </div>
                    )}

                  {/* Success State */}
                  {currentPull.status === "success" && (
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded">
                      <div className="text-center">
                        <div className="text-2xl mb-1">✅</div>
                        <div className="text-green-400 font-medium text-sm">Model ready!</div>
                        <div className={`text-xs ${theme.colors.text.secondary} mt-1`}>
                          Closing automatically...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Already Installed State */}
                  {currentPull.status === "already_installed" && (
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded">
                      <div className="text-center">
                        <div className="text-3xl mb-2">✅</div>
                        <div className="text-green-400 font-medium text-sm mb-1">
                          Already Installed!
                        </div>
                        <div className={`text-xs ${theme.colors.text.secondary}`}>ready to use</div>
                        <div className={`text-xs ${theme.colors.text.muted} mt-2`}>
                          Closing automatically...
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Error State */}
                  {currentPull.status === "error" && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded">
                      <div className="text-red-400 font-medium text-sm flex items-center gap-2">
                        <span>❌</span>
                        <span>Download failed. Please try again.</span>
                      </div>
                    </div>
                  )}

                  {/* Timeout Message */}
                  {showTimeout && (
                    <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
                      <div className="text-yellow-300 text-xs">
                        <div className="font-medium mb-1">⚠️ Taking longer than expected</div>
                        <div className={theme.colors.text.secondary}>
                          The connection might be slow. You can close this dialog and check back
                          later.
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Warning for large models */}
          {modelName.includes("70b") && !isPulling && (
            <div className="bg-yellow-900/20 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-xs text-yellow-200">
                ⚠️ Warning: 70B models are very large (~40GB) and require significant RAM (48GB+).
                Download may take 30+ minutes depending on your connection.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!isPulling && (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  className={`flex-1 px-4 py-2 bg-black/40 hover:bg-black/60 ${theme.colors.text.primary} rounded transition border ${theme.colors.border}`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!modelName.trim()}
                  className="flex-1 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {modelExists ? "Verify & Install" : "Start Download"}
                </button>
              </>
            )}
            {isPulling && currentPull?.status !== "success" && currentPull?.status !== "error" && (
              <button
                type="button"
                onClick={handleClose}
                className={`flex-1 px-4 py-2 bg-black/40 hover:bg-black/60 ${theme.colors.text.primary} rounded transition border ${theme.colors.border}`}
              >
                Close
              </button>
            )}
            {(currentPull?.status === "success" || currentPull?.status === "error") && (
              <button
                type="button"
                onClick={handleClose}
                className={`flex-1 px-4 py-2 text-white rounded transition font-medium ${
                  currentPull.status === "success"
                    ? "bg-green-600 hover:bg-green-500"
                    : "bg-red-600 hover:bg-red-500"
                }`}
              >
                {currentPull.status === "success" ? "Done" : "Close"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
