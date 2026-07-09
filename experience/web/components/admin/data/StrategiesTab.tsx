"use client";

import { useEffect, useState, useRef, Fragment, useCallback } from "react";
import { adminApi } from "@/utils/api";
import { TransitionStrategy, StrategyUpdate } from "@/types/admin";
import {
  Loader2,
  Download,
  Upload,
  Save,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
} from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function StrategiesTab() {
  const theme = useAdminTheme();
  const [strategies, setStrategies] = useState<TransitionStrategy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StrategyUpdate>({});
  const [isSaving, setIsSaving] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStrategies = useCallback(async () => {
    try {
      setLoading(true);
      const data = await adminApi.getStrategies();
      setStrategies(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load strategies");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const handleEdit = (strategy: TransitionStrategy) => {
    setEditingId(strategy.id);
    setEditForm({
      description: strategy.description,
      detailed_steps: [...(strategy.detailed_steps || [])],
      time_required: strategy.time_required,
      difficulty_level: strategy.difficulty_level,
      evidence_level: strategy.evidence_level,
      contraindications: strategy.contraindications,
    });
    // Auto expand when editing
    if (!expandedIds.has(strategy.id)) {
      toggleExpand(strategy.id);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      setIsSaving(true);
      const updated = await adminApi.updateStrategy(id, editForm);

      // Update local state
      /* istanbul ignore next */
      setStrategies((prev) => prev.map((s) => (s.id === id ? updated : s)));

      setEditingId(null);
      setEditForm({});
      showSuccess("Strategy updated successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update strategy");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await adminApi.exportStrategies();

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `strategies-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess("Strategies export downloaded successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLoading(true);
      const text = await file.text();
      const json = JSON.parse(text);

      const result = await adminApi.importStrategies(json);

      await fetchStrategies(); // Refresh list
      showSuccess(`Import complete: ${result.updated} updated, ${result.created} created.`);
      if (result.errors && result.errors.length > 0) {
        setError(`Imported with errors: ${result.errors.join(", ")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleAddStep = () => {
    setEditForm((prev) => ({
      ...prev,
      detailed_steps: [.../* istanbul ignore next */ (prev.detailed_steps || []), ""],
    }));
  };

  const handleRemoveStep = (index: number) => {
    setEditForm((prev) => ({
      ...prev,
      detailed_steps: prev.detailed_steps!.filter((_, i) => i !== index),
    }));
  };

  // Helper to update a step at specific index
  const handleStepChange = (index: number, value: string) => {
    setEditForm((prev) => {
      const newSteps = [...prev.detailed_steps!];
      newSteps[index] = value;
      return { ...prev, detailed_steps: newSteps };
    });
  };

  if (loading && strategies.length === 0) {
    return (
      <div className="flex items-center justify-center h-96" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`text-xl font-semibold mb-1 ${theme.colors.text.primary}`}>
            Therapeutic Strategies
          </h2>
          <p className={`text-sm ${theme.colors.text.muted}`}>
            Manage clinical interventions (ACT, CBT, DBT). Used by the AI for recommendations.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
          <button
            onClick={handleImportClick}
            className={`px-4 py-2 rounded flex items-center gap-2 transition text-sm ${theme.colors.background} ${theme.colors.hover} ${theme.colors.text.secondary} border ${theme.colors.border}`}
          >
            <Upload className="w-4 h-4" /> Import
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-cyan-900/40 hover:bg-cyan-900/60 text-cyan-300 rounded border border-cyan-800/50 flex items-center gap-2 transition text-sm"
          >
            <Download className="w-4 h-4" /> Export JSON
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-900/30 border border-red-800 rounded text-red-200">
          <AlertTriangle className="w-4 h-4 inline mr-2" />
          {error}
        </div>
      )}

      {successMessage && (
        <div className="p-4 bg-green-900/30 border border-green-800 rounded text-green-200">
          {successMessage}
        </div>
      )}

      <div
        className={`rounded-lg overflow-hidden ${theme.colors.background} border ${theme.colors.border}`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead
              className={`border-b uppercase text-xs font-semibold ${theme.colors.background} ${theme.colors.border} ${theme.colors.text.muted}`}
            >
              <tr>
                <th className="px-6 py-4 w-10"></th>
                <th className="px-6 py-4 w-64">Strategy Name</th>
                <th className="px-6 py-4 w-40">Type</th>
                <th className="px-6 py-4 w-32">Evidence</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.colors.border}`}>
              {strategies.map((strategy) => {
                const isExpanded = expandedIds.has(strategy.id);
                const isEditing = editingId === strategy.id;

                return (
                  <Fragment key={strategy.id}>
                    <tr
                      className={`${theme.colors.hover} group ${isExpanded ? theme.colors.background : ""}`}
                    >
                      <td className="px-6 py-4">
                        <button
                          onClick={() => toggleExpand(strategy.id)}
                          className={`${theme.colors.text.muted} hover:text-cyan-400 transition`}
                          aria-label={isExpanded ? "Collapse details" : "Expand details"}
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className={`px-6 py-4 font-medium ${theme.colors.text.primary}`}>
                        {strategy.strategy_name}
                      </td>
                      <td className={`px-6 py-4 ${theme.colors.text.secondary}`}>
                        {strategy.strategy_type}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider
                                                    ${
                                                      strategy.evidence_level === "meta_analysis"
                                                        ? "bg-purple-900/50 text-purple-200 border border-purple-800"
                                                        : strategy.evidence_level === "rct"
                                                          ? "bg-green-900/50 text-green-200 border border-green-800"
                                                          : `${theme.colors.background} ${theme.colors.text.muted} border ${theme.colors.border}`
                                                    }`}
                        >
                          {strategy.evidence_level}
                        </span>
                      </td>

                      {isEditing ? (
                        <td className="px-6 py-4">
                          <textarea
                            className={`w-full rounded px-2 py-1 text-xs focus:ring-1 focus:ring-cyan-500 min-h-[60px] ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                            value={editForm.description || ""}
                            onChange={(e) =>
                              setEditForm({ ...editForm, description: e.target.value })
                            }
                          />
                        </td>
                      ) : (
                        <td
                          className={`px-6 py-4 text-sm truncate max-w-xs ${theme.colors.text.muted}`}
                        >
                          {strategy.description}
                        </td>
                      )}

                      <td className="px-6 py-4 text-right">
                        {isEditing ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => handleSave(strategy.id)}
                              className="p-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded transition"
                              title="Save"
                              aria-label="Save"
                              disabled={isSaving}
                            >
                              {isSaving ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className={`p-1.5 rounded transition ${theme.colors.background} ${theme.colors.hover} ${theme.colors.text.secondary}`}
                              title="Cancel"
                              aria-label="Cancel"
                              disabled={isSaving}
                            >
                              ✕
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(strategy)}
                            className={`p-1.5 hover:text-cyan-400 ${theme.colors.hover} rounded transition opacity-0 group-hover:opacity-100 ${theme.colors.text.muted}`}
                            title="Edit"
                            aria-label="Edit"
                          >
                            ✏️
                          </button>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Details Row */}
                    {isExpanded && (
                      <tr className={theme.colors.background}>
                        <td
                          colSpan={6}
                          className={`px-6 py-4 border-t shadow-inner ${theme.colors.border}`}
                        >
                          <div className="grid grid-cols-2 gap-8 pl-12">
                            <div>
                              <h4
                                className={`text-xs font-bold uppercase mb-2 ${theme.colors.text.muted}`}
                              >
                                Detailed Steps
                              </h4>
                              {isEditing ? (
                                <div className="space-y-2">
                                  {editForm.detailed_steps!.map((step, idx) => (
                                    <div key={idx} className="flex gap-2">
                                      <span
                                        className={`text-xs w-4 pt-1 ${theme.colors.text.muted}`}
                                      >
                                        {idx + 1}.
                                      </span>
                                      <input
                                        className={`flex-1 rounded px-2 py-1 text-xs ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                                        value={step}
                                        onChange={(e) => handleStepChange(idx, e.target.value)}
                                        placeholder={`Step ${idx + 1}`}
                                      />
                                      <button
                                        onClick={() => handleRemoveStep(idx)}
                                        className={`p-1 hover:text-red-400 ${theme.colors.hover} rounded transition ${theme.colors.text.muted}`}
                                        title="Remove step"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    onClick={handleAddStep}
                                    className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 mt-2 px-2 py-1 hover:bg-cyan-900/20 rounded transition"
                                  >
                                    <Plus className="w-3 h-3" /> Add Step
                                  </button>
                                </div>
                              ) : (
                                <ol
                                  className={`list-decimal list-outside text-sm space-y-1 ml-4 ${theme.colors.text.secondary}`}
                                >
                                  {(strategy.detailed_steps || []).map((step, idx) => (
                                    <li key={idx} className="pl-1">
                                      {step}
                                    </li>
                                  ))}
                                </ol>
                              )}
                            </div>
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <h4
                                    className={`text-xs font-bold uppercase mb-1 ${theme.colors.text.muted}`}
                                  >
                                    Time Required
                                  </h4>
                                  {isEditing ? (
                                    <input
                                      className={`w-full rounded px-2 py-1 text-xs ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                                      value={editForm.time_required || ""}
                                      onChange={(e) =>
                                        setEditForm({ ...editForm, time_required: e.target.value })
                                      }
                                    />
                                  ) : (
                                    <p className={`text-sm ${theme.colors.text.secondary}`}>
                                      {strategy.time_required || "N/A"}
                                    </p>
                                  )}
                                </div>
                                <div>
                                  <h4
                                    className={`text-xs font-bold uppercase mb-1 ${theme.colors.text.muted}`}
                                  >
                                    Difficulty (1-5)
                                  </h4>
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      min="1"
                                      max="5"
                                      className={`w-full rounded px-2 py-1 text-xs ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                                      value={editForm.difficulty_level || 1}
                                      onChange={(e) =>
                                        setEditForm({
                                          ...editForm,
                                          difficulty_level: parseInt(e.target.value),
                                        })
                                      }
                                    />
                                  ) : (
                                    <div className="flex gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <div
                                          key={star}
                                          className={`w-2 h-2 rounded-full ${
                                            (strategy.difficulty_level || 0) >= star
                                              ? "bg-cyan-500"
                                              : "bg-gray-700"
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div>
                                <h4
                                  className={`text-xs font-bold uppercase mb-1 ${theme.colors.text.muted}`}
                                >
                                  Contraindications
                                </h4>
                                {isEditing ? (
                                  <textarea
                                    className={`w-full rounded px-2 py-1 text-xs ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                                    value={editForm.contraindications || ""}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        contraindications: e.target.value,
                                      })
                                    }
                                  />
                                ) : (
                                  <p className="text-sm text-amber-200/80 italic">
                                    {strategy.contraindications || "None listed"}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
