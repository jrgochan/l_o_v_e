/**
 * Recommendations Panel Component
 *
 * Displays AI model recommendations for each function with
 * reasoning and actionable suggestions.
 */

"use client";

interface Recommendation {
  recommended: string[];
  not_recommended: string[];
  reasoning: string;
}

interface RecommendationsPanelProps {
  recommendations: Record<string, Recommendation>;
  currentAssignments: Record<string, string> | null;
  onApplyRecommendation: (functionName: string, modelName: string) => void;
}

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

export function RecommendationsPanel({
  recommendations,
  currentAssignments,
  onApplyRecommendation,
}: RecommendationsPanelProps) {
  const theme = useAdminTheme();
  const functionNames = Object.keys(recommendations);

  if (functionNames.length === 0) {
    return (
      <div className={`bg-black/20 rounded-lg p-6 border ${theme.colors.border} text-center`}>
        <p className={`${theme.colors.text.secondary} text-sm`}>
          No recommendations available. Add more models to see suggestions.
        </p>
      </div>
    );
  }

  const formatFunctionName = (name: string) => {
    return name
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const hasActionableRecommendation = (funcName: string): boolean => {
    if (!currentAssignments) return false;
    const rec = recommendations[funcName];
    const current = currentAssignments[funcName as keyof typeof currentAssignments];
    if (!current) return false;
    // Actionable if current model is not in recommended list or is in not_recommended list
    return !rec.recommended.includes(current) || rec.not_recommended.includes(current);
  };

  return (
    <div className="space-y-4">
      {functionNames.map((funcName) => {
        const rec = recommendations[funcName];
        const current =
          currentAssignments?.[funcName as keyof typeof currentAssignments] || "Unknown";
        const isActionable = hasActionableRecommendation(funcName);
        const topRecommendation = rec.recommended[0];

        return (
          <div
            key={funcName}
            className={`rounded-lg p-4 border ${
              isActionable
                ? `bg-blue-900/20 border-blue-500/30`
                : `bg-black/20 ${theme.colors.border}`
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`${theme.colors.text.primary} font-semibold text-sm`}>
                    {formatFunctionName(funcName)}
                  </h4>
                  {isActionable && (
                    <span className="px-2 py-0.5 bg-blue-600/30 border border-blue-500/50 text-blue-300 text-xs rounded-full">
                      Action Recommended
                    </span>
                  )}
                </div>
                <p className={`text-xs ${theme.colors.text.secondary}`}>
                  Currently:{" "}
                  <span className={`font-mono ${theme.colors.text.primary}`}>{current}</span>
                </p>
              </div>
            </div>

            {/* Recommended Models */}
            {rec.recommended.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-green-400 mb-2">✓ Recommended:</div>
                <div className="flex flex-wrap gap-2">
                  {rec.recommended.map((modelName) => {
                    const isCurrent = modelName === current;
                    return (
                      <div
                        key={modelName}
                        className={`px-3 py-1.5 rounded text-xs border ${
                          isCurrent
                            ? "bg-green-600/20 border-green-500/50 text-green-400"
                            : `bg-black/20 ${theme.colors.border} ${theme.colors.text.secondary}`
                        }`}
                      >
                        <span className="font-mono">{modelName}</span>
                        {isCurrent && <span className="ml-1.5 text-green-500">✓</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Not Recommended */}
            {rec.not_recommended.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-medium text-orange-400 mb-2">⚠ Not recommended:</div>
                <div className="flex flex-wrap gap-2">
                  {rec.not_recommended.map((modelName) => {
                    const isCurrent = modelName === current;
                    return (
                      <div
                        key={modelName}
                        className={`px-3 py-1.5 rounded text-xs border ${
                          isCurrent
                            ? "bg-orange-600/20 border-orange-500/50 text-orange-400 font-medium"
                            : `bg-black/20 ${theme.colors.border} ${theme.colors.text.muted}`
                        }`}
                      >
                        <span className="font-mono">{modelName}</span>
                        {isCurrent && <span className="ml-1.5">⚠</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reasoning */}
            <div className={`p-3 bg-black/40 rounded border ${theme.colors.border} mb-3`}>
              <div className={`text-xs font-medium ${theme.colors.text.secondary} mb-1`}>Why:</div>
              <p className={`text-xs ${theme.colors.text.primary} leading-relaxed`}>
                {rec.reasoning}
              </p>
            </div>

            {/* Action Button */}
            {isActionable && topRecommendation && topRecommendation !== current && (
              <button
                onClick={() => onApplyRecommendation(funcName, topRecommendation)}
                className="w-full px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/50 text-blue-400 text-sm rounded transition font-medium"
              >
                Switch to {topRecommendation}
              </button>
            )}

            {!isActionable && (
              <div className="text-center py-2">
                <span className="text-xs text-green-400">✓ Already using recommended model</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
