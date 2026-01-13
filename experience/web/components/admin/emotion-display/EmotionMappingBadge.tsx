/**
 * Emotion Mapping Badge Component
 *
 * Shows when AI emotion names were mapped to Atlas emotions
 * Provides transparency about the mapping process
 */

"use client";

interface EmotionMappingBadgeProps {
  originalName: string;
  atlasName: string;
  matchMethod?: "exact" | "fuzzy" | "vac" | "none";
  matchConfidence?: number;
  className?: string;
}

export function EmotionMappingBadge({
  originalName,
  atlasName,
  matchMethod = "fuzzy",
  matchConfidence = 1.0,
  className = "",
}: EmotionMappingBadgeProps) {
  // Get icon and color based on match method
  const getMethodIcon = () => {
    switch (matchMethod) {

      case "fuzzy":
        return "≈";
      case "vac":
        return "📍";
      case "none":
        return "⚠️";
      default:
        return "≈";
    }
  };

  const getMethodColor = () => {
    switch (matchMethod) {
      case "fuzzy":
        return "bg-yellow-900/30 border-yellow-500/30 text-yellow-300";
      case "vac":
        return "bg-orange-900/30 border-orange-500/30 text-orange-300";
      case "none":
        return "bg-red-900/30 border-red-500/30 text-red-300";
      default:
        return "bg-yellow-900/30 border-yellow-500/30 text-yellow-300";
    }
  };

  const getMethodLabel = () => {
    switch (matchMethod) {
      case "fuzzy":
        return "Fuzzy match";
      case "vac":
        return "VAC-based match";
      case "none":
        return "Unmapped";
      default:
        return "Mapped";
    }
  };

  // Don't show badge for exact matches (perfect)
  if (matchMethod === "exact") {
    return null;
  }

  return (
    <div
      className={`inline-flex items-center gap-1.5 text-xs border rounded px-2 py-1 ${getMethodColor()} ${className}`}
      title={`${getMethodLabel()}: AI detected "${originalName}", mapped to Atlas emotion "${atlasName}" with ${(matchConfidence * 100).toFixed(0)}% confidence`}
    >
      <span className="text-sm">{getMethodIcon()}</span>
      <span className="opacity-75">AI:</span>
      <span className="font-medium">{originalName}</span>
      <span className="opacity-50">→</span>
      <span className="opacity-75">Atlas:</span>
      <span className="font-medium text-white">{atlasName}</span>
      {matchConfidence !== undefined && (
        <span className="opacity-60">({(matchConfidence * 100).toFixed(0)}%)</span>
      )}
    </div>
  );
}
