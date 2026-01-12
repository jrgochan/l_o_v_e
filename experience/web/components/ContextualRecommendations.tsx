/**
 * Contextual Recommendations Component
 *
 * Provides context-aware strategy recommendations based on:
 * - Time of day
 * - Energy level
 * - Location
 * - Available time
 * - Experience level
 */

"use client";

import { useState } from "react";
import { getObserverClient, UserContext } from "@love/experience-shared";
import { logger } from "@/utils/logger";

interface Props {
  onRecommendationsReceived?: (strategies: string[]) => void;
}

interface ContextualRecommendationsResponse {
  recommended_strategies?: string[];
  avoid_strategies?: string[];
}

export function ContextualRecommendations({ onRecommendationsReceived }: Props) {
  const [context, setContext] = useState<UserContext>({});
  const [recommendations, setRecommendations] = useState<ContextualRecommendationsResponse | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const handleContextChange = (key: keyof UserContext, value: string) => {
    setContext((prev) => ({ ...prev, [key]: value }));
  };

  const getRecommendations = async () => {
    if (Object.keys(context).length === 0) {
      setError("Please select at least one context option");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const client = getObserverClient();
      const response = await client.getContextRecommendations(context);

      setRecommendations(response);

      if (onRecommendationsReceived && response.recommended_strategies) {
        onRecommendationsReceived(response.recommended_strategies);
      }
    } catch (err) {
      logger.error("api", "Failed to get contextual recommendations", err);
      setError("Could not load recommendations");
    } finally {
      setIsLoading(false);
    }
  };

  const clearContext = () => {
    setContext({});
    setRecommendations(null);
    setError(null);
  };

  return (
    <div className="p-4 bg-gradient-to-br from-orange-900/30 to-yellow-900/30 border border-orange-700 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">🎯</span>
          <h3 className="text-sm font-semibold text-white">Context-Aware Recommendations</h3>
        </div>
        <span className="text-gray-400 text-sm">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          <div className="text-xs text-gray-400">
            Tell us about your current situation for personalized strategy suggestions:
          </div>

          {/* Context Form */}
          <div className="space-y-3">
            {/* Time of Day */}
            <div>
              <label className="text-xs text-gray-300 block mb-1">Time of Day</label>
              <div className="grid grid-cols-2 gap-2">
                {(["morning", "afternoon", "evening", "late_night"] as const).map((time) => (
                  <button
                    key={time}
                    onClick={() => handleContextChange("time_of_day", time)}
                    className={`px-3 py-2 text-xs rounded transition-all ${
                      context.time_of_day === time
                        ? "bg-orange-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {time
                      .replace("_", " ")
                      .split(" ")
                      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                      .join(" ")}
                  </button>
                ))}
              </div>
            </div>

            {/* Energy Level */}
            <div>
              <label className="text-xs text-gray-300 block mb-1">Energy Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["high", "moderate", "low"] as const).map((energy) => (
                  <button
                    key={energy}
                    onClick={() => handleContextChange("energy_level", energy)}
                    className={`px-3 py-2 text-xs rounded capitalize transition-all ${
                      context.energy_level === energy
                        ? "bg-orange-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {energy}
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <label className="text-xs text-gray-300 block mb-1">Location</label>
              <div className="grid grid-cols-3 gap-2">
                {(["home", "work", "public"] as const).map((location) => (
                  <button
                    key={location}
                    onClick={() => handleContextChange("location", location)}
                    className={`px-3 py-2 text-xs rounded capitalize transition-all ${
                      context.location === location
                        ? "bg-orange-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {location}
                  </button>
                ))}
              </div>
            </div>

            {/* Available Time */}
            <div>
              <label className="text-xs text-gray-300 block mb-1">Available Time</label>
              <div className="grid grid-cols-2 gap-2">
                {(["5_minutes", "15_minutes", "30_minutes", "60_plus_minutes"] as const).map(
                  (time) => (
                    <button
                      key={time}
                      onClick={() => handleContextChange("available_time", time)}
                      className={`px-3 py-2 text-xs rounded transition-all ${
                        context.available_time === time
                          ? "bg-orange-600 text-white"
                          : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                      }`}
                    >
                      {time.replace("_", " ")}
                    </button>
                  )
                )}
              </div>
            </div>

            {/* Experience Level */}
            <div>
              <label className="text-xs text-gray-300 block mb-1">Experience Level</label>
              <div className="grid grid-cols-3 gap-2">
                {(["beginner", "intermediate", "advanced"] as const).map((level) => (
                  <button
                    key={level}
                    onClick={() => handleContextChange("experience_level", level)}
                    className={`px-3 py-2 text-xs rounded capitalize transition-all ${
                      context.experience_level === level
                        ? "bg-orange-600 text-white"
                        : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <button
              onClick={getRecommendations}
              disabled={isLoading || Object.keys(context).length === 0}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white text-sm font-semibold rounded transition-colors"
            >
              {isLoading ? "Loading..." : "🎯 Get Recommendations"}
            </button>
            <button
              onClick={clearContext}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
            >
              Clear
            </button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-400">
              {error}
            </div>
          )}

          {/* Recommendations Display */}
          {recommendations && (
            <div className="p-3 bg-black/30 border border-orange-600 rounded-lg space-y-2">
              <div className="text-sm font-semibold text-orange-400">
                📋 Recommended for Your Situation:
              </div>

              {recommendations.recommended_strategies &&
              recommendations.recommended_strategies.length > 0 ? (
                <div className="space-y-1">
                  {recommendations.recommended_strategies.map((strategy: string, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 bg-orange-900/30 rounded text-xs text-white"
                    >
                      <span className="text-orange-400">✓</span>
                      <span>{strategy}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-xs text-gray-400">
                  No specific recommendations for this combination. Try adjusting your context.
                </div>
              )}

              {recommendations.avoid_strategies && recommendations.avoid_strategies.length > 0 && (
                <div className="pt-2 border-t border-gray-700">
                  <div className="text-xs font-semibold text-gray-400 mb-1">
                    ⚠️ Not Recommended Right Now:
                  </div>
                  <div className="space-y-1">
                    {recommendations.avoid_strategies.map((strategy: string, idx: number) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2 bg-red-900/20 rounded text-xs text-gray-400"
                      >
                        <span className="text-red-400">✗</span>
                        <span>{strategy}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
                💡 These recommendations are based on what works best in similar situations.
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
