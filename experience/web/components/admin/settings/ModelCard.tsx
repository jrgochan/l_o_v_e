/**
 * Model Card Component
 *
 * Rich, detailed card for displaying Ollama model information with ratings,
 * usage indicators, and actions.
 */

"use client";

import type { ModelInfo } from "@/hooks/useOllamaModels";

interface ModelCardProps {
  model: ModelInfo;
  usedByFunctions: string[];
  onDelete: (modelName: string) => void;
  onAssign: (modelName: string) => void;
}

export function ModelCard({ model, usedByFunctions, onDelete, onAssign }: ModelCardProps) {
  const formatBytes = (bytes: number) => {
    const gb = bytes / 1024 ** 3;
    return `${gb.toFixed(1)} GB`;
  };

  // Estimate ratings based on model characteristics
  const getSpeedRating = () => {
    const paramSize = model.parameter_size || "";
    if (paramSize.includes("70b") || paramSize.includes("34b")) return 2;
    if (paramSize.includes("13b") || paramSize.includes("8x7b")) return 3;
    if (paramSize.includes("8b")) return 4;
    return 5; // 3b and smaller
  };

  const getQualityRating = () => {
    const paramSize = model.parameter_size || "";
    if (paramSize.includes("70b")) return 5;
    if (paramSize.includes("34b") || paramSize.includes("8x7b")) return 5;
    if (paramSize.includes("13b")) return 4;
    if (paramSize.includes("8b")) return 4;
    return 3; // 3b and smaller
  };

  const getRAMEstimate = () => {
    const paramSize = model.parameter_size || "";
    if (paramSize.includes("70b")) return "48+ GB";
    if (paramSize.includes("34b")) return "32 GB";
    if (paramSize.includes("8x7b")) return "32 GB";
    if (paramSize.includes("13b")) return "16 GB";
    if (paramSize.includes("8b")) return "10 GB";
    return "4-6 GB";
  };

  const getBadge = () => {
    const paramSize = model.parameter_size || "";
    const name = model.name.toLowerCase();

    if (paramSize.includes("70b")) return { text: "Clinical Grade", color: "purple" };
    if (paramSize.includes("3b") || name.includes("mini"))
      return { text: "Fast & Efficient", color: "green" };
    if (paramSize.includes("8b")) return { text: "Balanced", color: "blue" };
    if (paramSize.includes("8x7b")) return { text: "High Quality", color: "purple" };
    return null;
  };

  const speedRating = getSpeedRating();
  const qualityRating = getQualityRating();
  const ramEstimate = getRAMEstimate();
  const badge = getBadge();
  const isActive = usedByFunctions.length > 0;

  const renderStars = (rating: number, icon: string = "⭐") => {
    return Array(5)
      .fill(0)
      .map((_, i) => (
        <span key={i} className={i < rating ? "opacity-100" : "opacity-20"}>
          {icon}
        </span>
      ));
  };

  return (
    <div className="bg-gray-800 rounded-lg p-5 border border-gray-700 hover:border-cyan-500/50 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h4 className="font-mono text-white text-base font-semibold">{model.name}</h4>
            {isActive && (
              <span className="px-2 py-0.5 bg-green-600/20 border border-green-500/50 text-green-400 text-xs rounded-full">
                Active
              </span>
            )}
            {badge && (
              <span
                className={`px-2 py-0.5 text-xs rounded-full ${
                  badge.color === "purple"
                    ? "bg-purple-600/20 border border-purple-500/50 text-purple-400"
                    : badge.color === "green"
                      ? "bg-green-600/20 border border-green-500/50 text-green-400"
                      : "bg-blue-600/20 border border-blue-500/50 text-blue-400"
                }`}
              >
                {badge.text}
              </span>
            )}
          </div>

          {/* Basic Info */}
          <div className="flex flex-wrap gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <span className="text-cyan-400">📦</span>
              {formatBytes(model.size)}
            </span>
            <span className="flex items-center gap-1">
              <span className="text-cyan-400">🔢</span>
              {model.parameter_size} params
            </span>
            <span className="flex items-center gap-1">
              <span className="text-cyan-400">⚙️</span>
              {model.quantization}
            </span>
            <span className="flex items-center gap-1 capitalize">
              <span className="text-cyan-400">🏷️</span>
              {model.family}
            </span>
          </div>
        </div>
      </div>

      {/* Ratings Grid */}
      <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-900/50 rounded-lg">
        <div>
          <div className="text-xs text-gray-400 mb-1">Speed</div>
          <div className="flex gap-0.5 text-sm">{renderStars(speedRating, "⚡")}</div>
          <div className="text-xs text-gray-500 mt-1">
            {speedRating >= 4 ? "Very Fast" : speedRating >= 3 ? "Fast" : "Moderate"}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1">Quality</div>
          <div className="flex gap-0.5 text-sm">{renderStars(qualityRating)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {qualityRating >= 5 ? "Excellent" : qualityRating >= 4 ? "Very Good" : "Good"}
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1">RAM Required</div>
          <div className="text-sm text-white font-semibold mt-1">{ramEstimate}</div>
          <div className="text-xs text-gray-500 mt-1">minimum</div>
        </div>
      </div>

      {/* Usage Section */}
      {isActive && (
        <div className="mb-4 p-3 bg-green-900/10 border border-green-500/20 rounded-lg">
          <div className="text-xs font-medium text-green-400 mb-1.5">
            Used by {usedByFunctions.length} function{usedByFunctions.length > 1 ? "s" : ""}:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {usedByFunctions.map((func) => (
              <span
                key={func}
                className="px-2 py-0.5 bg-gray-800 border border-gray-600 text-gray-300 text-xs rounded"
              >
                {func.replace("_", " ")}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAssign(model.name)}
          className="flex-1 px-3 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/50 text-cyan-400 text-sm rounded transition font-medium"
        >
          Assign to Function
        </button>
        <button
          onClick={() => onDelete(model.name)}
          className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 text-sm rounded transition"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
