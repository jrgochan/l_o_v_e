/**
 * Personal Strategies Component
 *
 * Displays the user's most effective strategies based on their journey history.
 * Shows ratings, times tried, and highlights these in recommendations.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { logger } from "@/utils/logger";
import { getObserverClient } from "@love/experience-shared";

interface EffectiveStrategy {
  strategy_id: string;
  strategy_name: string;
  avg_rating: number;
  times_tried: number;
  ratings: number[];
}

interface Props {
  userId: string;
}

export function PersonalStrategies({ userId }: Props) {
  const [strategies, setStrategies] = useState<EffectiveStrategy[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadEffectiveStrategies = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getObserverClient();
      const response = await client.getUserEffectiveStrategies(userId, 5);

      setStrategies(response.top_strategies || []);
    } catch (err) {
      logger.error("api", "Failed to load effective strategies", err);
      setError("Could not load your strategy history");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadEffectiveStrategies();
  }, [loadEffectiveStrategies]);

  if (isLoading) {
    return (
      <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg">
        <div className="text-sm text-gray-400">Loading your effective strategies...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">💡</span>
          <h3 className="text-sm font-semibold text-white">Your Effective Strategies</h3>
        </div>
        <div className="text-xs text-gray-400">
          Complete journeys and provide feedback to see which strategies work best for you!
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-blue-900/30 to-purple-900/30 border border-blue-700 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">⭐</span>
          <h3 className="text-sm font-semibold text-white">Your Top Strategies</h3>
          <span className="text-xs text-blue-400">({strategies.length})</span>
        </div>
        <span className="text-gray-400 text-sm">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="space-y-2">
          {strategies.map((strategy, idx) => (
            <div
              key={strategy.strategy_id}
              className="p-3 bg-black/30 border border-blue-600/50 rounded-lg"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-blue-400 font-bold text-sm">#{idx + 1}</span>
                    <span className="text-white font-medium text-sm">{strategy.strategy_name}</span>
                  </div>

                  <div className="flex items-center gap-3 mt-2">
                    {/* Star Rating */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-sm ${
                            star <= Math.round(strategy.avg_rating)
                              ? "text-yellow-400"
                              : "text-gray-600"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                      <span className="text-xs text-gray-400 ml-1">
                        {strategy.avg_rating.toFixed(1)}
                      </span>
                    </div>

                    {/* Times Tried */}
                    <div className="text-xs text-gray-400">Tried {strategy.times_tried}x</div>
                  </div>
                </div>

                {/* Success Badge */}
                {strategy.avg_rating >= 4.0 && (
                  <div className="px-2 py-1 bg-green-900/50 border border-green-700 rounded text-xs text-green-400 font-semibold">
                    Highly Effective
                  </div>
                )}
              </div>
            </div>
          ))}

          <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700">
            💡 These strategies have worked well for you in the past. Consider trying them again!
          </div>
        </div>
      )}
    </div>
  );
}
