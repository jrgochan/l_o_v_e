/**
 * AI Models Settings Component - Enhanced
 *
 * Comprehensive UI for managing Ollama models and function assignments
 * with detailed model cards, performance metrics, and recommendations.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { useOllamaModels } from "@/hooks/useOllamaModels";
import { useModelAssignments } from "@/hooks/useModelAssignments";
import { PullModelDialog } from "./PullModelDialog";
import { ModelCard } from "./ModelCard";
import { PerformancePanel } from "./PerformancePanel";
import { RecommendationsPanel } from "./RecommendationsPanel";
import { ConfirmDialog } from "./ConfirmDialog";
import { MODEL_PRESETS } from "@/utils/modelPresets";

type ViewMode = "models" | "performance" | "recommendations";

export function AIModelsSettings() {
  const {
    localModels,
    loading: modelsLoading,
    error: modelsError,
    pulling,
    fetchLocalModels,
    pullModel,
    deleteModel,
    checkOllamaHealth,
  } = useOllamaModels();

  const {
    assignments,
    functions,
    recommendations,
    performance,
    loading: assignmentsLoading,
    error: assignmentsError,
    fetchAssignments,
    assignModel,
    fetchFunctions,
    fetchRecommendations,
    fetchPerformance,
  } = useModelAssignments();

  const [ollamaHealthy, setOllamaHealthy] = useState(false);
  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("models");
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    variant?: "danger" | "warning" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => { },
  });
  const [assignDialogState, setAssignDialogState] = useState<{
    isOpen: boolean;
    modelName: string;
  }>({ isOpen: false, modelName: "" });
  const [searchQuery, setSearchQuery] = useState("");
  const [familyFilter, setFamilyFilter] = useState<string | null>(null);

  useEffect(() => {
    // Load initial data
    const init = async () => {
      const healthy = await checkOllamaHealth();
      setOllamaHealthy(healthy);
      if (healthy) {
        fetchLocalModels();
        fetchAssignments();
        fetchFunctions();
        fetchRecommendations();
        fetchPerformance();
      }
    };
    init();
  }, [
    checkOllamaHealth,
    fetchLocalModels,
    fetchAssignments,
    fetchFunctions,
    fetchRecommendations,
    fetchPerformance,
  ]);

  // Computed values for Phase 4 features
  const totalDiskUsage = useMemo(
    () => localModels.reduce((sum, model) => sum + model.size, 0),
    [localModels]
  );

  const uniqueFamilies = useMemo(
    () => [...new Set(localModels.map((m) => m.family))].sort(),
    [localModels]
  );

  const filteredModels = useMemo(
    () =>
      localModels.filter((model) => {
        const matchesSearch = model.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFamily = !familyFilter || model.family === familyFilter;
        return matchesSearch && matchesFamily;
      }),
    [localModels, searchQuery, familyFilter]
  );

  const formatDiskUsage = (bytes: number) => {
    const gb = bytes / 1024 ** 3;
    return `${gb.toFixed(1)} GB`;
  };

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const applyPreset = async (presetKey: string) => {
    const preset = MODEL_PRESETS[presetKey];

    // Check if model exists
    const modelExists = localModels.some((m) => m.name === preset.model);
    if (!modelExists) {
      showNotification("error", `${preset.model} not installed. Pull it first.`);
      return;
    }

    // Apply to all functions
    let successCount = 0;
    for (const [funcName, modelName] of Object.entries(preset.assignments)) {
      const success = await assignModel(funcName, modelName);
      if (success) successCount++;
    }

    if (successCount === 4) {
      showNotification("success", `✓ Applied ${preset.name} preset`);
    } else {
      showNotification("error", `Applied ${successCount}/4 assignments`);
    }
  };

  const handleBulkAssign = async (modelName: string) => {
    let successCount = 0;
    for (const func of functions) {
      const success = await assignModel(func.name, modelName);
      if (success) successCount++;
    }
    if (successCount > 0) {
      fetchRecommendations();
      fetchPerformance();
    }
    showNotification(
      "success",
      `✓ Assigned to ${successCount} function${successCount > 1 ? "s" : ""}`
    );
    setAssignDialogState({ isOpen: false, modelName: "" });
  };

  const handleAssignFromCard = (modelName: string) => {
    setAssignDialogState({ isOpen: true, modelName });
  };

  const handleAssignToFunction = async (functionName: string, modelName: string) => {
    const success = await assignModel(functionName, modelName);
    if (success) {
      showNotification("success", `✓ Assigned ${modelName} to ${functionName}`);
      fetchRecommendations();
      fetchPerformance();
    } else {
      showNotification("error", "✗ Failed to assign model");
    }
    return success;
  };

  const handleDeleteConfirm = (modelName: string) => {
    // Check if model is in use
    const usedBy = assignments
      ? Object.entries(assignments)
        .filter(([, model]) => model === modelName)
        .map(([func]) => func)
      : [];

    setConfirmDialog({
      isOpen: true,
      title: "Delete Model?",
      message:
        usedBy.length > 0
          ? `This model is currently assigned to ${usedBy.length} function(s). Deleting it may cause errors. Are you sure you want to delete ${modelName}?`
          : `Are you sure you want to delete ${modelName}? This action cannot be undone.`,
      variant: usedBy.length > 0 ? "warning" : "danger",
      onConfirm: () => {
        deleteModel(modelName);
        showNotification("success", `🗑️ Deleted ${modelName}`);
        setConfirmDialog({ ...confirmDialog, isOpen: false });
      },
    });
  };

  const getModelUsage = (modelName: string): string[] => {
    if (!assignments) return [];
    return Object.entries(assignments)
      .filter(([, model]) => model === modelName)
      .map(([func]) => func);
  };

  if (!ollamaHealthy) {
    return (
      <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-red-300 mb-2">⚠️ Ollama Not Running</h3>
        <p className="text-gray-300 mb-4">
          Ollama must be running to manage models. Please start it:
        </p>
        <code className="bg-gray-800 px-3 py-2 rounded text-sm block">ollama serve</code>
        <button
          onClick={async () => {
            const healthy = await checkOllamaHealth();
            setOllamaHealthy(healthy);
            if (healthy) {
              fetchLocalModels();
              fetchAssignments();
            }
          }}
          className="mt-4 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  const isLoading = modelsLoading || assignmentsLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">🤖 AI Models Management</h2>
        <p className="text-gray-400 text-sm">
          Manage Ollama models and optimize AI function assignments for your workflow.
        </p>
      </div>

      {/* View Tabs */}
      <div className="flex gap-2 border-b border-gray-700 pb-px">
        <button
          onClick={() => setViewMode("models")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${viewMode === "models"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
        >
          Models ({localModels.length})
        </button>
        <button
          onClick={() => setViewMode("performance")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${viewMode === "performance"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
        >
          Performance
        </button>
        <button
          onClick={() => setViewMode("recommendations")}
          className={`px-4 py-2 text-sm font-medium transition border-b-2 ${viewMode === "recommendations"
              ? "border-cyan-500 text-cyan-400"
              : "border-transparent text-gray-400 hover:text-gray-300"
            }`}
        >
          Recommendations
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-cyan-500 border-t-transparent"></div>
          <p className="text-gray-400 text-sm mt-3">Loading...</p>
        </div>
      )}

      {/* Error Display */}
      {(modelsError || assignmentsError) && (
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4">
          <p className="text-red-300 text-sm">❌ Error: {modelsError || assignmentsError}</p>
        </div>
      )}

      {/* Models View */}
      {!isLoading && viewMode === "models" && (
        <div>
          {/* Header with Disk Usage */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-white">
                Local Models ({localModels.length})
              </h3>
              {localModels.length > 0 && (
                <span className="text-sm text-gray-400">
                  💾 Total: {formatDiskUsage(totalDiskUsage)}
                </span>
              )}
            </div>
            <button
              onClick={() => setShowPullDialog(true)}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition font-medium flex items-center gap-2"
            >
              <span>⬇️</span>
              <span>Pull New Model</span>
            </button>
          </div>

          {/* Quick Presets */}
          {localModels.length > 0 && (
            <div className="mb-4 p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <h4 className="text-sm font-semibold text-white mb-3">⚡ Quick Presets</h4>
              <div className="flex gap-2 flex-wrap">
                {Object.entries(MODEL_PRESETS).map(([key, preset]) => (
                  <button
                    key={key}
                    onClick={() => applyPreset(key)}
                    className="px-4 py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-cyan-500/50 rounded transition group"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{preset.icon}</span>
                      <div className="text-left">
                        <div className="font-medium text-white text-sm group-hover:text-cyan-400 transition">
                          {preset.name}
                        </div>
                        <div className="text-xs text-gray-400">{preset.description}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                One-click configuration for common use cases
              </p>
            </div>
          )}

          {/* Search and Filter */}
          {localModels.length > 0 && (
            <div className="mb-4 space-y-3">
              <input
                type="text"
                placeholder="🔍 Search models..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-600 focus:border-cyan-500 rounded text-white placeholder-gray-500 focus:outline-none transition"
              />
              {uniqueFamilies.length > 1 && (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFamilyFilter(null)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition ${familyFilter === null
                        ? "bg-cyan-600 text-white"
                        : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                      }`}
                  >
                    All
                  </button>
                  {uniqueFamilies.map((family) => (
                    <button
                      key={family}
                      onClick={() => setFamilyFilter(family)}
                      className={`px-3 py-1.5 text-xs font-medium rounded transition ${familyFilter === family
                          ? "bg-cyan-600 text-white"
                          : "bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700"
                        }`}
                    >
                      {family}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {localModels.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 text-center">
              <p className="text-gray-400 mb-4">No models installed yet.</p>
              <button
                onClick={() => setShowPullDialog(true)}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm rounded transition"
              >
                Pull Your First Model
              </button>
            </div>
          ) : filteredModels.length === 0 ? (
            <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 text-center">
              <p className="text-gray-400 mb-2">No models match your search</p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFamilyFilter(null);
                }}
                className="text-cyan-400 hover:text-cyan-300 text-sm transition"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredModels.map((model) => (
                <ModelCard
                  key={model.name}
                  model={model}
                  usedByFunctions={getModelUsage(model.name)}
                  onDelete={handleDeleteConfirm}
                  onAssign={handleAssignFromCard}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Performance View */}
      {!isLoading && viewMode === "performance" && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">Function Performance Metrics</h3>
            <p className="text-sm text-gray-400">
              Real-time performance data for AI functions based on actual usage.
            </p>
          </div>
          <PerformancePanel
            performance={performance}
            assignments={assignments as unknown as Record<string, string>}
          />
        </div>
      )}

      {/* Recommendations View */}
      {!isLoading && viewMode === "recommendations" && (
        <div>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-white mb-2">💡 Smart Recommendations</h3>
            <p className="text-sm text-gray-400">
              AI-powered suggestions to optimize model assignments for your use case.
            </p>
          </div>
          <RecommendationsPanel
            recommendations={recommendations}
            currentAssignments={assignments as unknown as Record<string, string>}
            onApplyRecommendation={handleAssignToFunction}
          />
        </div>
      )}

      {/* Info Panel */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <h3 className="text-sm font-semibold text-blue-300 mb-1">Dynamic Model Assignment</h3>
            <p className="text-sm text-gray-300">
              Different AI functions can use different models optimized for their specific task.
              Changes take effect immediately on the next analysis.
            </p>
          </div>
        </div>
      </div>

      {/* Pull Model Dialog */}
      <PullModelDialog
        isOpen={showPullDialog}
        onClose={() => setShowPullDialog(false)}
        onPull={pullModel}
        pullProgress={pulling}
        localModels={localModels}
      />

      {/* Assign Model Dialog */}
      {assignDialogState.isOpen && (
        <div
          data-testid="assign-dialog"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm"
        >
          <div className="bg-gray-900 rounded-lg p-6 max-w-md w-full mx-4 border border-cyan-500/50">
            <h3 className="text-lg font-bold text-white mb-4">
              Assign {assignDialogState.modelName}
            </h3>
            <p className="text-sm text-gray-300 mb-4">
              Select which function should use this model:
            </p>

            {/* Bulk Assign Button */}
            <button
              onClick={() => handleBulkAssign(assignDialogState.modelName)}
              className="w-full mb-3 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 border-2 border-cyan-400 rounded transition"
            >
              <div className="font-bold text-white">✨ ASSIGN TO ALL FUNCTIONS</div>
              <div className="text-xs text-cyan-200 mt-1">
                Use {assignDialogState.modelName} for everything
              </div>
            </button>

            <div className="border-t border-gray-700 pt-3 mb-2">
              <p className="text-xs text-gray-400 mb-2">Or assign individually:</p>
            </div>

            <div className="space-y-2 mb-4">
              {functions.map((func) => (
                <button
                  key={func.name}
                  onClick={() => {
                    handleAssignToFunction(func.name, assignDialogState.modelName);
                    setAssignDialogState({ isOpen: false, modelName: "" });
                  }}
                  className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 hover:border-cyan-500/50 rounded transition"
                >
                  <div className="font-medium text-white text-sm">
                    {func.name.replace("_", " ").toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{func.description}</div>
                  {assignments &&
                    assignments[func.name as keyof typeof assignments] ===
                    assignDialogState.modelName && (
                      <div className="text-xs text-green-400 mt-1">✓ Currently assigned</div>
                    )}
                </button>
              ))}
            </div>
            <button
              onClick={() => setAssignDialogState({ isOpen: false, modelName: "" })}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        variant={confirmDialog.variant}
        confirmLabel="Delete"
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog({ ...confirmDialog, isOpen: false })}
      />

      {/* Notification Toast */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-slide-up">
          <div
            className={`px-6 py-3 rounded-lg border shadow-lg ${notification.type === "success"
                ? "bg-green-900/95 border-green-500 text-green-100"
                : "bg-red-900/95 border-red-500 text-red-100"
              }`}
          >
            <div className="font-medium">{notification.message}</div>
          </div>
        </div>
      )}
    </div>
  );
}
