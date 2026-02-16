import React, { useEffect, useState } from "react";
import { ModelAssignment } from "@/types/admin";
import { adminApi } from "@/utils/api";
import { RefreshCw, Save, AlertTriangle, Cpu } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export default function AiModelsTab() {
  const theme = useAdminTheme();
  const [models, setModels] = useState<ModelAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingFunction, setEditingFunction] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [saving, setSaving] = useState(false);

  // Recommended models for dropdown (could be dynamic later)
  const RECOMMENDED_MODELS = [
    "llama3.1:8b-instruct-q4_0",
    "llama3.1:70b-instruct-q4_0",
    "mixtral:8x7b-instruct-v0.1",
    "phi-3:mini",
    "mistral:7b",
  ];

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getAiModels();
      setModels(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load AI models");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (assignment: ModelAssignment) => {
    setEditingFunction(assignment.function);
    setEditValue(assignment.ai_model_name);
  };

  const handleSave = async () => {
    /* istanbul ignore next */
    if (!editingFunction) return;

    try {
      setSaving(true);
      const updated = await adminApi.updateAiModel(editingFunction, {
        ai_model_name: editValue,
      });

      setModels((prev) => prev.map((m) => (m.function === editingFunction ? updated : m)));
      setEditingFunction(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update model");
    } finally {
      setSaving(false);
    }
  };

  if (loading && models.length === 0) {
    return (
      <div className={`p-8 text-center ${theme.colors.text.muted}`} role="status">
        Loading AI configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className={`flex justify-between items-center p-4 rounded-lg border ${theme.colors.background} ${theme.colors.border}`}
      >
        <div>
          <h2 className={`text-xl font-bold flex items-center gap-2 ${theme.colors.text.primary}`}>
            <Cpu className="w-5 h-5 text-purple-400" />
            AI Function Assignments
          </h2>
          <p className={`text-sm mt-1 ${theme.colors.text.muted}`}>
            Configure which local LLM handles each intelligence function. Changes apply immediately.
          </p>
        </div>
        <button
          onClick={fetchModels}
          className={`p-2 rounded-full transition-colors ${theme.colors.hover}`}
          title="Refresh Config"
          aria-label="Refresh Config"
        >
          <RefreshCw className={`w-5 h-5 ${theme.colors.text.muted}`} />
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div
        className={`rounded-lg overflow-hidden ${theme.colors.background} border ${theme.colors.border}`}
      >
        <table className="w-full text-left border-collapse">
          <thead>
            <tr
              className={`text-xs uppercase tracking-wider ${theme.colors.background} ${theme.colors.text.muted}`}
            >
              <th className="p-4 font-semibold">Function</th>
              <th className="p-4 font-semibold">Assigned Model</th>
              <th className="p-4 font-semibold text-right">Avg Latency</th>
              <th className="p-4 font-semibold text-right">Invocations</th>
              <th className="p-4 font-semibold text-right">Last Used</th>
              <th className="p-4 font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y ${theme.colors.border}`}>
            {models.map((model) => (
              <tr key={model.function} className={theme.colors.hover}>
                <td className="p-4">
                  <div className="font-mono text-sm text-purple-300">{model.function}</div>
                </td>
                <td className="p-4">
                  {editingFunction === model.function ? (
                    <div className="flex gap-2">
                      <select
                        className={`rounded px-2 py-1 text-sm focus:border-purple-500 outline-none ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                      >
                        <option value={model.ai_model_name}>custom ({model.ai_model_name})</option>
                        {RECOMMENDED_MODELS.map((m) => (
                          <option key={m} value={m}>
                            {m}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-sm px-2 py-1 rounded ${theme.colors.text.secondary} ${theme.colors.background}`}
                      >
                        {model.ai_model_name}
                      </span>
                    </div>
                  )}
                </td>
                <td className={`p-4 text-right font-mono text-sm ${theme.colors.text.muted}`}>
                  {model.avg_latency_ms ? `${Math.round(model.avg_latency_ms)}ms` : "-"}
                </td>
                <td className={`p-4 text-right font-mono text-sm ${theme.colors.text.muted}`}>
                  {model.total_invocations}
                </td>
                <td className={`p-4 text-right text-xs ${theme.colors.text.muted}`}>
                  {model.last_used_at ? new Date(model.last_used_at).toLocaleTimeString() : "-"}
                </td>
                <td className="p-4">
                  {editingFunction === model.function ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="text-green-400 hover:text-green-300 disabled:opacity-50"
                        aria-label="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setEditingFunction(null)}
                        className={`${theme.colors.text.muted} hover:${theme.colors.text.secondary}`}
                        aria-label="Cancel"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(model)}
                      className={`${theme.colors.text.muted} hover:${theme.colors.text.primary} transition-colors`}
                      aria-label={`Edit ${model.function}`}
                    >
                      Edit
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
