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

const OBSERVER_API_URL = process.env.NEXT_PUBLIC_OBSERVER_API_URL || "http://localhost:8000";

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
          `${OBSERVER_API_URL}/observer/atlas/recommendations?context=${context}${selectedIdsParam}&limit=5`
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
        <div className="animate-spin h-5 w-5 border-2 border-cyan-400 border-t-transparent rounded-full" />
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
          className={`flex-1 px-3 py-2 text-xs rounded transition ${
            context === "exploration"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          🔍 Explore
        </button>
        <button
          onClick={() => setContext("healing")}
          className={`flex-1 px-3 py-2 text-xs rounded transition ${
            context === "healing"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          💚 Healing
        </button>
        <button
          onClick={() => setContext("growth")}
          className={`flex-1 px-3 py-2 text-xs rounded transition ${
            context === "growth"
              ? "bg-cyan-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          🌱 Growth
        </button>
      </div>

      {/* Curated Journeys */}
      {recommendations?.curated_journeys && recommendations.curated_journeys.length > 0 && (
        <section>
          <h4 className="text-xs font-semibold text-gray-400 mb-2">
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
                className="bg-gray-800 hover:bg-gray-750 rounded-lg p-3 cursor-pointer transition border border-gray-700 hover:border-cyan-500"
                onClick={() => applyJourney(journey.emotion_ids)}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{journey.icon}</span>
                    <h5 className="text-sm font-semibold text-white">{journey.name}</h5>
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
                <p className="text-xs text-gray-300 mb-2">{journey.description}</p>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">
                    {journey.emotion_count} emotions • {journey.estimated_time}
                  </span>
                  <span className="text-cyan-400">Click to apply →</span>
                </div>
                <p className="text-xs text-gray-500 mt-2 italic">{journey.research}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Complementary Suggestions */}
      {recommendations?.complementary_suggestions &&
        recommendations.complementary_suggestions.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">💡 Smart Suggestions</h4>
            <div className="space-y-2">
              {recommendations.complementary_suggestions.map((sug, idx: number) => (
                <button
                  key={idx}
                  onClick={() => selectMultiple([...Array.from(selectedIds), sug.id])}
                  className="w-full bg-gray-800 hover:bg-gray-750 rounded p-2 text-left transition border border-gray-700 hover:border-purple-500"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white">{sug.name}</span>
                    <span className="text-[10px] px-2 py-0.5 bg-purple-600 text-white rounded">
                      {sug.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{sug.reason}</p>
                </button>
              ))}
            </div>
          </section>
        )}

      {/* Problematic Transitions (Exploration mode only) */}
      {recommendations?.problematic_transitions &&
        recommendations.problematic_transitions.length > 0 && (
          <section>
            <h4 className="text-xs font-semibold text-gray-400 mb-2">🔬 Research Opportunities</h4>
            <p className="text-xs text-gray-500 mb-2">Hardest transitions - great for study</p>
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
                  <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1">
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
        <div className="text-xs text-gray-500 text-center py-4">No recommendations available</div>
      )}
    </div>
  );
}
