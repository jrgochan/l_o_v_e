import { useState, useEffect } from "react";
import {
  PromptTemplate,
  PromptTemplateCreate,
  PromptTemplateUpdate,
  PromptTestRequest,
} from "../../../types/admin";
import { adminApi } from "../../../utils/api";
import { Edit, Plus, Save, Play, Check, X, AlertCircle } from "lucide-react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function PromptTemplatesTab() {
  const theme = useAdminTheme();
  const [prompts, setPrompts] = useState<PromptTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFunction, setSelectedFunction] = useState<string>("all");

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [currentPrompt, setCurrentPrompt] = useState<Partial<PromptTemplate>>({});
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  // Filter options
  const functions = [
    "semantic_vac",
    "multi_emotion",
    "content_only",
    "voice_only",
    "insight_generation",
  ];

  useEffect(() => {
    loadPrompts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFunction]);

  const loadPrompts = async () => {
    setLoading(true);
    setError(null);
    try {
      const funcFilter = selectedFunction === "all" ? undefined : selectedFunction;
      const data = await adminApi.getPromptTemplates(funcFilter);
      setPrompts(data);
    } catch (err) {
      setError("Failed to load prompts");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setCurrentPrompt({
      function_name: selectedFunction === "all" ? "semantic_vac" : selectedFunction,
      version: "1.0.0",
      template_content: "",
      input_variables: ["input_text"],
      is_active: false,
    });
    setTestResult(null);
    setIsEditing(true);
  };

  const handleEdit = (prompt: PromptTemplate) => {
    setCurrentPrompt({ ...prompt });
    setTestResult(null);
    setIsEditing(true);
  };

  const handleSave = async () => {
    if (!currentPrompt.function_name || !currentPrompt.version || !currentPrompt.template_content) {
      setError("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      if (currentPrompt.id) {
        // Update
        const update: PromptTemplateUpdate = {
          template_content: currentPrompt.template_content,
          input_variables: currentPrompt.input_variables || [],
          description: currentPrompt.description,
          is_active: currentPrompt.is_active,
        };
        await adminApi.updatePromptTemplate(currentPrompt.id, update);
      } else {
        // Create
        const create: PromptTemplateCreate = {
          function_name: currentPrompt.function_name,
          version: currentPrompt.version,
          template_content: currentPrompt.template_content,
          input_variables: currentPrompt.input_variables!, // Guaranteed by handleCreate init
          description: currentPrompt.description,
          is_active: currentPrompt.is_active,
        };
        await adminApi.createPromptTemplate(create);
      }
      setIsEditing(false);
      loadPrompts();
    } catch {
      setError("Failed to save prompt");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!currentPrompt.template_content) return;

    setTesting(true);
    try {
      // Create dummy vars based on input_variables
      const vars: Record<string, string> = {};
      (currentPrompt.input_variables || []).forEach((v) => {
        vars[v] = `[${v} sample value]`;
      });

      // Allow user to specific test input in future, for illustration use fixed
      if (vars["input_text"]) {
        vars["input_text"] = "I feel really happy today but a bit tired.";
      }

      const req: PromptTestRequest = {
        template_content: currentPrompt.template_content,
        input_variables: vars,
      };

      const res = await adminApi.testPromptTemplate(req);
      setTestResult(res.rendered_content);
    } catch (err) {
      setTestResult(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setTesting(false);
    }
  };

  if (isEditing) {
    return (
      <div className={`rounded-lg p-6 ${theme.colors.background} border ${theme.colors.border}`}>
        <div className="flex justify-between items-center mb-6">
          <h2 className={`text-xl font-semibold ${theme.colors.text.primary}`}>
            {currentPrompt.id ? "Edit Prompt Template" : "New Prompt Template"}
          </h2>
          <button
            onClick={() => setIsEditing(false)}
            className={`${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
            aria-label="Close Editor"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          {error && (
            <div className="col-span-2 bg-red-900/20 border border-red-900 text-red-200 px-4 py-3 rounded flex items-center gap-2 mb-4">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}
          <div>
            <label htmlFor="func-select" className={`block text-sm font-medium mb-1 ${theme.colors.text.muted}`}>
              Function
            </label>
            <select
              id="func-select"
              value={currentPrompt.function_name}
              onChange={(e) =>
                setCurrentPrompt({ ...currentPrompt, function_name: e.target.value })
              }
              disabled={!!currentPrompt.id}
              className={`w-full rounded px-3 py-2 ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
            >
              {functions.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="version-input" className={`block text-sm font-medium mb-1 ${theme.colors.text.muted}`}>
              Version
            </label>
            <input
              id="version-input"
              type="text"
              value={currentPrompt.version}
              onChange={(e) => setCurrentPrompt({ ...currentPrompt, version: e.target.value })}
              disabled={!!currentPrompt.id}
              className={`w-full rounded px-3 py-2 ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
            />
          </div>
        </div>

        <div className="mb-6">
          <label htmlFor="desc-input" className={`block text-sm font-medium mb-1 ${theme.colors.text.muted}`}>
            Description
          </label>
          <input
            id="desc-input"
            type="text"
            value={currentPrompt.description || ""}
            onChange={(e) => setCurrentPrompt({ ...currentPrompt, description: e.target.value })}
            className={`w-full rounded px-3 py-2 ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="content-input" className={`block text-sm font-medium mb-1 ${theme.colors.text.muted}`}>
            Template Content
            <span className={`ml-2 text-xs ${theme.colors.text.muted}`}>(Use {"{variable}"} syntax)</span>
          </label>
          <textarea
            id="content-input"
            value={currentPrompt.template_content}
            onChange={(e) =>
              setCurrentPrompt({ ...currentPrompt, template_content: e.target.value })
            }
            className={`w-full h-96 rounded px-3 py-2 font-mono text-sm ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
          />
        </div>

        <div className="mb-6">
          <label htmlFor="vars-input" className={`block text-sm font-medium mb-1 ${theme.colors.text.muted}`}>
            Input Variables (comma separated)
          </label>
          <input
            id="vars-input"
            type="text"
            value={currentPrompt.input_variables?.join(", ") || ""}
            onChange={(e) =>
              setCurrentPrompt({
                ...currentPrompt,
                input_variables: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className={`w-full rounded px-3 py-2 ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
          />
        </div>

        <div className="flex items-center gap-4 mb-6">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={currentPrompt.is_active}
              onChange={(e) => setCurrentPrompt({ ...currentPrompt, is_active: e.target.checked })}
              className={`rounded border-gray-700 text-purple-500 ${theme.colors.background}`}
            />
            <span className={theme.colors.text.secondary}>Set as Active Version</span>
          </label>
        </div>

        {/* Test Section */}
        <div className={`border-t pt-6 mb-6 ${theme.colors.border}`}>
          <div className="flex items-center gap-2 mb-4">
            <button
              onClick={handleTest}
              disabled={testing}
              className={`px-3 py-1.5 rounded text-sm flex items-center gap-2 ${theme.colors.background} ${theme.colors.hover} ${theme.colors.text.primary}`}
              aria-label="Test Render"
            >
              <Play className="w-4 h-4" />
              {testing ? "Rendering..." : "Test Render"}
            </button>
          </div>
          {testResult && (
            <div className={`p-4 rounded font-mono text-xs whitespace-pre-wrap ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.secondary}`}>
              {testResult}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={() => setIsEditing(false)}
            className={`px-4 py-2 ${theme.colors.text.muted} hover:${theme.colors.text.primary}`}
            aria-label="Cancel"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-2"
            aria-label="Save Template"
          >
            <Save className="w-4 h-4" />
            {loading ? "Saving..." : "Save Template"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className={`text-lg font-medium ${theme.colors.text.primary}`}>Prompt Library</h2>
          <select
            value={selectedFunction}
            onChange={(e) => setSelectedFunction(e.target.value)}
            className={`rounded px-3 py-1.5 text-sm ${theme.colors.background} border ${theme.colors.border} ${theme.colors.text.primary}`}
            aria-label="Filter by Function"
          >
            <option value="all">All Functions</option>
            {functions.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={handleCreate}
          className="px-3 py-1.5 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 flex items-center gap-2"
          aria-label="New Template"
        >
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-900 text-red-200 px-4 py-3 rounded flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {prompts.map((prompt) => (
          <div
            key={prompt.id}
            className={`rounded-lg p-4 transition-colors border ${theme.colors.background} ${
              prompt.is_active ? "border-purple-500/50" : `${theme.colors.border} ${theme.colors.hover}`
            }`}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className={`font-medium ${theme.colors.text.primary}`}>{prompt.function_name}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs ${theme.colors.background} ${theme.colors.text.muted}`}>
                    v{prompt.version}
                  </span>
                  {prompt.is_active && (
                    <span className="px-2 py-0.5 bg-purple-900/30 text-purple-400 rounded text-xs flex items-center gap-1">
                      <Check className="w-3 h-3" /> Active
                    </span>
                  )}
                </div>
                <p className={`text-sm mb-2 ${theme.colors.text.muted}`}>
                  {prompt.description || "No description"}
                </p>
                <div className={`text-xs font-mono ${theme.colors.text.muted}`}>
                  Variables: {(prompt.input_variables || []).join(", ")}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(prompt)}
                  className={`p-2 ${theme.colors.text.muted} hover:${theme.colors.text.primary} ${theme.colors.hover} rounded`}
                  aria-label={`Edit ${prompt.function_name}`}
                  data-testid={`edit-btn-${prompt.id}`}
                >
                  <Edit className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {prompts.length === 0 && !loading && (
          <div className={`text-center py-12 rounded-lg border border-dashed ${theme.colors.text.muted} ${theme.colors.background} ${theme.colors.border}`}>
            No templates found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
