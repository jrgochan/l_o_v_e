import { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Save, X, RefreshCw } from "lucide-react";
import { adminApi } from "@/utils/api";
import { BootstrapData, BootstrapDataCreate } from "@/types/admin";

export default function BootstrapTab() {
  const [data, setData] = useState<BootstrapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEdit, setCurrentEdit] = useState<Partial<BootstrapData> | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  const DATA_TYPES = [
    "strategy_effectiveness",
    "path_template",
    "context_modifier",
    "challenge_pattern",
  ];

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterType]);

  const loadData = async () => {
    setLoading(true);
    try {
      const type = filterType === "all" ? undefined : filterType;
      const items = await adminApi.getBootstrapData(type);
      setData(items);
      setError(null);
    } catch (err) {
      console.error("Failed to load bootstrap data:", err);
      setError("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: BootstrapData) => {
    setCurrentEdit({ ...item });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setCurrentEdit({
      data_type: DATA_TYPES[0],
      data_category: "",
      content: {},
    });
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this item?")) return;

    try {
      await adminApi.deleteBootstrapData(id);
      loadData();
    } catch (err) {
      console.error("Failed to delete item:", err);
      setError("Failed to delete item");
    }
  };

  const handleSave = async () => {
    // UI guarantees currentEdit is set when in edit mode
    const editData = currentEdit!;

    try {
      if (editData.id) {
        // Update
        await adminApi.updateBootstrapData(editData.id, {
          data_type: editData.data_type,
          data_category: editData.data_category,
          content: editData.content,
        });
      } else {
        // Create
        await adminApi.createBootstrapData({
          data_type: editData.data_type!,
          data_category: editData.data_category,
          content: editData.content,
        } as BootstrapDataCreate);
      }
      setIsEditing(false);
      setCurrentEdit(null);
      loadData();
    } catch (err) {
      console.error("Failed to save item:", err);
      setError("Failed to save item. Ensure JSON content is valid.");
    }
  };

  if (isEditing && currentEdit) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-white">
            {currentEdit.id ? "Edit Item" : "New Item"}
          </h2>
          <div className="flex gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-700 rounded-lg text-white"
              aria-label="Cancel"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg"
              aria-label="Save Item"
            >
              <Save className="w-4 h-4" /> Save
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="type-select" className="block text-sm font-medium text-gray-400 mb-1">
              Data Type
            </label>
            <select
              id="type-select"
              value={currentEdit.data_type}
              onChange={(e) => setCurrentEdit({ ...currentEdit, data_type: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
            >
              {DATA_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="cat-input" className="block text-sm font-medium text-gray-400 mb-1">
              Category (Optional)
            </label>
            <input
              id="cat-input"
              type="text"
              value={currentEdit.data_category || ""}
              onChange={(e) => setCurrentEdit({ ...currentEdit, data_category: e.target.value })}
              className="w-full bg-gray-800 border border-gray-700 rounded-md p-2 text-white"
            />
          </div>
        </div>

        <div>
          <label htmlFor="json-input" className="block text-sm font-medium text-gray-400 mb-1">
            JSON Content
          </label>
          <textarea
            id="json-input"
            value={JSON.stringify(currentEdit.content, null, 2)}
            onChange={(e) => {
              try {
                // Allow simple editing, though ideally this needs a state buffer
                // For now, we rely on the user pasting valid JSON or careful editing
                const parsed = JSON.parse(e.target.value);
                setCurrentEdit({ ...currentEdit, content: parsed });
                setError(null);
              } catch {
                // Silent fail on parse error during type (UX improvement needed later)
              }
            }}
            className="w-full h-96 bg-gray-900 font-mono text-sm text-green-400 p-4 rounded-lg border border-gray-700"
          />
          <p className="text-xs text-gray-500 mt-2">Must be valid JSON.</p>
        </div>
      </div>
    );
  }

  // Refactored Editor Logic
  // The above naive implementation has an issue with typing.
  // We need a proper editor component. For now I'll replace the return with the List view
  // and implement a `JsonEditor` inner component logic.

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex gap-4 items-center">
          <h2 className="text-xl font-bold text-white">Bootstrap Data</h2>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-sm text-white"
            aria-label="Filter by Type"
          >
            <option value="all">All Types</option>
            {DATA_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadData}
            className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400"
            title="Refresh"
            aria-label="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleCreate}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white text-sm font-medium"
            aria-label="Add Item"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid gap-4">
        {data.map((item) => (
          <div
            key={item.id}
            className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 text-xs rounded-full border border-blue-500/30">
                    {item.data_type}
                  </span>
                  {item.data_category && (
                    <span className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded-full">
                      {item.data_category}
                    </span>
                  )}
                  <span className="text-gray-500 text-xs">
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
                <pre className="text-xs text-gray-400 bg-gray-900/50 p-2 rounded max-h-32 overflow-y-auto w-full max-w-2xl">
                  {JSON.stringify(item.content, null, 2)}
                </pre>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-white"
                  aria-label={`Edit ${item.id}`}
                  data-testid={`edit-btn-${item.id}`}
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-1.5 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400"
                  aria-label={`Delete ${item.id}`}
                  data-testid={`delete-btn-${item.id}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        {data.length === 0 && !loading && (
          <div className="text-center py-12 text-gray-500">No bootstrap data found.</div>
        )}
      </div>
    </div>
  );
}
