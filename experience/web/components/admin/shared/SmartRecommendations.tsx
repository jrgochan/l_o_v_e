/**
 * Smart Recommendations Component
 *
 * Displays intelligent suggestions for emotional exploration including:
 * - Curated therapeutic journeys
 * - Similar emotions (VAC-based)
 * - Complementary paths
 * - Problematic transitions (research)
 */

"use client";

import { useState, useEffect } from "react";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import { logger } from "@/utils/logger";
import type { RecommendationsResponse } from "@/types/api-responses";
import { OBSERVER_URL } from "@/config/environment";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

type ContextType = "exploration" | "healing" | "growth";

export function SmartRecommendations() {
  const [context, setContext] = useState<ContextType>("exploration");
  const [recommendations, setRecommendations] = useState<
    RecommendationsResponse["recommendations"] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedIds = useVisualizationStore((state) => state.selectedEmotionIds);
  const selectMultiple = useVisualizationStore((state) => state.selectMultiple);
  const clearSelection = useVisualizationStore((state) => state.clearSelection);
  const updateSetting = useVisualizationStore((state) => state.updateSetting);
  const theme = useAdminTheme();

  const applyJourney = (emotionIds: string[]) => {
    // Temporarily set to always mode if in manual
    const currentSetting = useVisualizationStore.getState().settings.computeMode;
    if (currentSetting === "manual") {
      updateSetting("computeMode", "cache-first");
    }

    // Clear and select journey emotions
    clearSelection();
    selectMultiple(emotionIds);

    // Restore setting after brief delay
    if (currentSetting === "manual") {
      setTimeout(() => updateSetting("computeMode", currentSetting), 1000);
    }
  };

  // Fetch recommendations
  useEffect(() => {
    const fetchRecommendations = async () => {
      setLoading(true);
      setError(null);

      try {
        const selectedIdsParam =
          selectedIds.size > 0 ? `&selected_ids=${Array.from(selectedIds).join(",")}` : "";

        const response = await fetch(
          `${OBSERVER_URL}/observer/recommendations?context=${context}${selectedIdsParam}&limit=5`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch recommendations");
        }

        const data = await response.json();
        setRecommendations(data.recommendations);
      } catch (err) {
        logger.error("api", "Error fetching recommendations", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [context, selectedIds]);

  if (loading && !recommendations) {
    return (
      <div className="p-4 flex items-center justify-center">
        <div
          className={`animate-spin h-5 w-5 border-2 ${theme.colors.primary.replace("text-", "border-")} border-t-transparent rounded-full`}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="bg-red-900/20 border border-red-500/30 rounded p-3 text-sm">
          <p className="text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Context Selector */}
      <div className="flex gap-2">
        <button
          onClick={() => setContext("exploration")}
          className={`flex-1 px-3 py-2 text-xs ${theme.layout.borderRadius} transition ${
            context === "exploration"
              ? `${theme.colors.primary} border border-white/10 bg-white/10`
              : `bg-black/20 border ${theme.colors.border} ${theme.colors.text.secondary} ${theme.colors.hover}`
          }`}
        >
          🔍 Explore
        </button>
        <button
          onClick={() => setContext("healing")}
          className={`flex-1 px-3 py-2 text-xs ${theme.layout.borderRadius} transition ${
            context === "healing"
              ? `${theme.colors.primary} border border-white/10 bg-white/10`
              : `bg-black/20 border ${theme.colors.border} ${theme.colors.text.secondary} ${theme.colors.hover}`
          }`}
        >
          💚 Healing
        </button>
        <button
          onClick={() => setContext("growth")}
          className={`flex-1 px-3 py-2 text-xs ${theme.layout.borderRadius} transition ${
            context === "growth"
              ? `${theme.colors.primary} border border-white/10 bg-white/10`
              : `bg-black/20 border ${theme.colors.border} ${theme.colors.text.secondary} ${theme.colors.hover}`
          }`}
        >
          🌱 Growth
        </button>
      </div>

      {/* Curated Journeys */}
      {recommendations?.curated_journeys && recommendations.curated_journeys.length > 0 && (
        <section>
          <h4 className={`text-xs font-semibold mb-2 ${theme.colors.text.secondary}`}>
            {context === "healing"
              ? "💚 Healing Journeys"
              : context === "growth"
                ? "🌱 Growth Paths"
                : "🎯 Curated Journeys"}
          </h4>
          <div className="space-y-2">
            {recommendations.curated_journeys.map((journey) => (
              <div
                key={journey.id}
                className={`bg-black/20 ${theme.colors.hover} ${theme.layout.borderRadius} p-3 cursor-pointer transition-colors duration-300 border ${theme.colors.border}`}
                onClick={() => applyJourney(journey.emotion_ids)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{journey.icon}</span>
                    <h5 className={`text-sm font-semibold ${theme.colors.text.primary}`}>
                      {journey.name}
                    </h5>
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded ${
                      journey.difficulty === "easy"
                        ? "bg-green-600"
                        : journey.difficulty === "moderate"
                          ? "bg-yellow-600"
                          : "bg-red-600"
                    } text-white`}
                  >
                    {journey.difficulty}
                  </span>
                </div>
                <p className={`text-xs mb-2 ${theme.colors.text.secondary}`}>
                  {journey.description}
                </p>
                <div className="flex items-center justify-between text-xs">
                  <span className={theme.colors.text.muted}>
                    {journey.emotion_count} emotions • {journey.estimated_time}
                  </span>
                  <span className={theme.colors.primary}>Click to apply →</span>
                </div>
                <p className={`text-xs mt-2 italic ${theme.colors.text.muted}`}>
                  {journey.research}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Complementary Suggestions */}
      {recommendations?.complementary_suggestions &&
        recommendations.complementary_suggestions.length > 0 && (
          <section>
            <h4 className={`text-xs font-semibold mb-2 ${theme.colors.text.secondary}`}>
              💡 Smart Suggestions
            </h4>
            <div className="space-y-2">
              {recommendations.complementary_suggestions.map((sug, idx: number) => (
                <button
                  key={idx}
                  onClick={() => selectMultiple([...Array.from(selectedIds), sug.id])}
                  className={`w-full bg-black/20 ${theme.colors.hover} ${theme.layout.borderRadius} p-2 text-left transition-colors duration-300 border ${theme.colors.border}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm ${theme.colors.text.primary}`}>{sug.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded">
                      {sug.type}
                    </span>
                  </div>
                  <p className={`text-xs mt-1 ${theme.colors.text.muted}`}>{sug.reason}</p>
                </button>
              ))}
            </div>
          </section>
        )}

      {/* Problematic Transitions (Exploration mode only) */}
      {recommendations?.problematic_transitions &&
        recommendations.problematic_transitions.length > 0 && (
          <section>
            <h4 className={`text-xs font-semibold mb-2 ${theme.colors.text.secondary}`}>
              🔬 Research Opportunities
            </h4>
            <p className={`text-xs mb-2 ${theme.colors.text.muted}`}>
              Hardest transitions - great for study
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {recommendations.problematic_transitions.slice(0, 5).map((trans, idx: number) => (
                <button
                  key={idx}
                  onClick={() => {
                    clearSelection();
                    selectMultiple([trans.from_id, trans.to_id]);
                  }}
                  className="w-full bg-red-900/20 hover:bg-red-900/30 border border-red-500/30 hover:border-red-500/50 rounded p-2 text-left transition"
                >
                  <div className="text-xs text-white font-medium">
                    {trans.from_name} → {trans.to_name}
                  </div>
                  <div
                    className={`flex items-center gap-2 text-[10px] mt-1 ${theme.colors.text.muted}`}
                  >
                    <span>Dist: {trans.distance}</span>
                    <span>•</span>
                    <span>{trans.waypoint_count} waypoints</span>
                    {trans.requires_bridge && <span>• Bridge needed</span>}
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

      {!recommendations && !loading && (
        <div className={`text-xs text-center py-4 ${theme.colors.text.muted}`}>
          No recommendations available
        </div>
      )}
    </div>
  );
}
