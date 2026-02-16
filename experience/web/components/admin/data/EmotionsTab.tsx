"use client";

import { useEffect, useState, useRef } from "react";
import { adminApi } from "@/utils/api";
import { Emotion, EmotionUpdate } from "@/types/admin";
import { Loader2, Download, Upload, Save, AlertTriangle } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function EmotionsTab() {
  const theme = useAdminTheme();
  const [emotions, setEmotions] = useState<Emotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EmotionUpdate>({});
  const [isSaving, setIsSaving] = useState(false);

  // File input ref for import
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchEmotions();
  }, []);

  const fetchEmotions = async () => {
    try {
      setLoading(true);
      const data = await adminApi.getEmotions();
      setEmotions(Array.isArray(data) ? data : []);
      setError(null);
    } catch (err) {
      console.error("Failed to load emotions:", err);
      setError(err instanceof Error ? err.message : "Failed to load atlas data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emotion: Emotion) => {
    setEditingId(emotion.id);
    setEditForm({
      category: emotion.category,
      definition: emotion.definition,
      vac_vector: [...(emotion.vac_vector || [0, 0, 0])],
      haptic_pattern_id: emotion.haptic_pattern_id || "",
      color_hint: emotion.color_hint || "",
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleSave = async (id: string) => {
    try {
      setIsSaving(true);
      const updated = await adminApi.updateEmotion(id, editForm);

      // Update local state
      setEmotions((prev) => prev.map((e) => (e.id === id ? updated : e)));

      setEditingId(null);
      setEditForm({});
      showSuccess("Emotion updated successfully. Vectors recalculated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update emotion");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await adminApi.exportAtlasData();

      // Create blob and download
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `atlas-emotions-export-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      showSuccess("Export downloaded successfully.");
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

      const result = await adminApi.importAtlasData(json);

      await fetchEmotions(); // Refresh list
      showSuccess(`Import complete: ${result.updated} emotions updated.`);
      if (result.errors && result.errors.length > 0) {
        setError(`Imported with errors: ${result.errors.join(", ")}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  const handleVacChange = (index: number, value: string) => {
    const val = parseFloat(value);
    if (isNaN(val)) return;

    setEditForm((prev) => {
      const newVac = [...(prev.vac_vector as number[])] as [number, number, number];
      newVac[index] = val;
      return { ...prev, vac_vector: newVac };
    });
  };

  if (loading && (!emotions || emotions.length === 0)) {
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
            Emotion Definitions
          </h2>
          <p className={`text-sm ${theme.colors.text.muted}`}>
            Manage the canonical emotions. Changes affect the entire platform.
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
                <th className="px-6 py-4 w-32">Emotion</th>
                <th className="px-6 py-4 w-48">Category</th>
                <th className="px-6 py-4 w-[250px]">VAC (V, A, C)</th>
                <th className="px-6 py-4">Definition</th>
                <th className="px-6 py-4 text-right w-24">Actions</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${theme.colors.border}`}>
              {emotions.map((emotion) => (
                <tr key={emotion.id} className={`${theme.colors.hover} group`}>
                  <td className={`px-6 py-4 font-medium ${theme.colors.text.primary}`}>
                    {emotion.emotion_name}
                  </td>

                  {/* Editing State */}
                  {editingId === emotion.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          className={`w-full rounded px-2 py-1 focus:ring-1 focus:ring-cyan-500 ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                          value={editForm.category || ""}
                          onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-1">
                          {[0, 1, 2].map((i) => (
                            <input
                              key={i}
                              type="number"
                              step="0.1"
                              min="-1"
                              max="1"
                              className={`w-16 rounded px-1 py-1 text-center focus:ring-1 focus:ring-cyan-500 ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                              value={editForm.vac_vector?.[i] ?? 0}
                              onChange={(e) => handleVacChange(i, e.target.value)}
                            />
                          ))}
                        </div>
                        <div className="text-[10px] text-cyan-500 mt-1">
                          Quaternion will recalculate
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <textarea
                          className={`w-full rounded px-2 py-1 text-xs focus:ring-1 focus:ring-cyan-500 min-h-[60px] ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
                          value={editForm.definition || ""}
                          onChange={(e) => setEditForm({ ...editForm, definition: e.target.value })}
                        />
                        <div className="text-[10px] text-cyan-500 mt-1">
                          Embedding will recalculate
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => handleSave(emotion.id)}
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
                      </td>
                    </>
                  ) : (
                    /* View State */
                    <>
                      <td className={`px-6 py-4 text-sm ${theme.colors.text.secondary}`}>
                        {emotion.category}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-cyan-300">
                        [{(emotion.vac_vector || [0, 0, 0]).join(", ")}]
                      </td>
                      <td className={`px-6 py-4 text-sm ${theme.colors.text.muted}`}>
                        {emotion.definition}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(emotion)}
                          className={`p-1.5 hover:text-cyan-400 ${theme.colors.hover} rounded transition opacity-0 group-hover:opacity-100 ${theme.colors.text.muted}`}
                          title="Edit"
                          aria-label="Edit"
                        >
                          ✏️
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
