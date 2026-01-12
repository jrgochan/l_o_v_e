import React, { useEffect, useState } from "react";
import { ModelAssignment } from "@/types/admin";
import { adminApi } from "@/utils/api";
import { RefreshCw, Save, AlertTriangle, Cpu } from "lucide-react";

export default function AiModelsTab() {
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
      <div className="p-8 text-center text-gray-500" role="status">
        Loading AI configuration...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-gray-900/50 p-4 rounded-lg border border-gray-800">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-purple-400" />
            AI Function Assignments
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Configure which local LLM handles each intelligence function. Changes apply immediately.
          </p>
        </div>
        <button
          onClick={fetchModels}
          className="p-2 hover:bg-gray-800 rounded-full transition-colors"
          title="Refresh Config"
          aria-label="Refresh Config"
        >
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-200 p-4 rounded flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-800 text-gray-400 text-xs uppercase tracking-wider">
              <th className="p-4 font-semibold">Function</th>
              <th className="p-4 font-semibold">Assigned Model</th>
              <th className="p-4 font-semibold text-right">Avg Latency</th>
              <th className="p-4 font-semibold text-right">Invocations</th>
              <th className="p-4 font-semibold text-right">Last Used</th>
              <th className="p-4 font-semibold w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {models.map((model) => (
              <tr key={model.function} className="hover:bg-gray-800/50">
                <td className="p-4">
                  <div className="font-mono text-sm text-purple-300">{model.function}</div>
                </td>
                <td className="p-4">
                  {editingFunction === model.function ? (
                    <div className="flex gap-2">
                      <select
                        className="bg-gray-800 border border-gray-600 rounded px-2 py-1 text-sm text-white focus:border-purple-500 outline-none"
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
                      <span className="text-gray-300 text-sm bg-gray-800 px-2 py-1 rounded">
                        {model.ai_model_name}
                      </span>
                    </div>
                  )}
                </td>
                <td className="p-4 text-right font-mono text-sm text-gray-400">
                  {model.avg_latency_ms ? `${Math.round(model.avg_latency_ms)}ms` : "-"}
                </td>
                <td className="p-4 text-right font-mono text-sm text-gray-400">
                  {model.total_invocations}
                </td>
                <td className="p-4 text-right text-xs text-gray-500">
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
                        className="text-gray-500 hover:text-gray-300"
                        aria-label="Cancel"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleEdit(model)}
                      className="text-gray-500 hover:text-white transition-colors"
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
