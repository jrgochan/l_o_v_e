/**
 * Journey History Component
 *
 * Displays user's journey history with analytics and insights.
 * Shows completed/abandoned journeys and success metrics.
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { getObserverClient } from "@love/experience-shared";
import { logger } from "@/utils/logger";
import type { JourneyHistoryData } from "@/types/journeys";

interface Props {
  userId: string;
}

export function JourneyHistory({ userId }: Props) {
  const [history, setHistory] = useState<JourneyHistoryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedJourney, setExpandedJourney] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  const loadJourneyHistory = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const client = getObserverClient();
      const response = await client.getUserJourneyHistory(userId);

      setHistory(response);
    } catch (err) {
      logger.error("api", "Failed to load journey history", err);
      setError("Could not load journey history");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadJourneyHistory();
  }, [loadJourneyHistory]);

  if (isLoading) {
    return (
      <div className="p-4 bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-700 rounded-lg">
        <div className="text-sm text-gray-400">Loading journey history...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-700 rounded-lg">
        <div className="text-sm text-red-400">{error}</div>
      </div>
    );
  }

  if (!history || history.total_journeys === 0) {
    return (
      <div className="p-4 bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-700 rounded-lg">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">🗺️</span>
          <h3 className="text-sm font-semibold text-white">Your Journey History</h3>
        </div>
        <div className="text-xs text-gray-400">
          Start your first journey to begin tracking your progress!
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gradient-to-br from-green-900/30 to-blue-900/30 border border-green-700 rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between mb-3"
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">📊</span>
          <h3 className="text-sm font-semibold text-white">Journey History</h3>
          <span className="text-xs text-green-400">({history.total_journeys} total)</span>
        </div>
        <span className="text-gray-400 text-sm">{isExpanded ? "▼" : "▶"}</span>
      </button>

      {isExpanded && (
        <div className="space-y-3">
          {/* Analytics Summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-3 bg-black/30 border border-green-600/50 rounded-lg">
              <div className="text-xs text-gray-400">Success Rate</div>
              <div className="text-2xl font-bold text-green-400">
                {(history.success_rate * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {history.completed}/{history.total_journeys} completed
              </div>
            </div>

            <div className="p-3 bg-black/30 border border-blue-600/50 rounded-lg">
              <div className="text-xs text-gray-400">In Progress</div>
              <div className="text-2xl font-bold text-blue-400">{history.in_progress}</div>
              <div className="text-xs text-gray-500 mt-1">{history.abandoned} abandoned</div>
            </div>
          </div>

          {/* Journey List */}
          <div className="space-y-2">
            <div className="text-xs font-semibold text-gray-400">Recent Journeys:</div>

            {history.journeys.slice(0, 5).map((journey) => {
              const isExpanded = expandedJourney === journey.id;
              const startDate = new Date(journey.started_at);
              const completedDate = journey.completed_at ? new Date(journey.completed_at) : null;

              let duration = "Ongoing";
              if (completedDate) {
                const minutes = Math.floor((completedDate.getTime() - startDate.getTime()) / 60000);
                duration =
                  minutes < 60 ? `${minutes}m` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
              }

              const statusColor =
                {
                  active: "bg-blue-900/40 border-blue-700",
                  completed: "bg-green-900/40 border-green-700",
                  abandoned: "bg-red-900/40 border-red-700",
                  in_progress: "bg-blue-900/40 border-blue-700",
                }[journey.status] || "bg-gray-900/40 border-gray-700";

              const statusIcon =
                {
                  active: "⏳",
                  completed: "✓",
                  abandoned: "✗",
                  in_progress: "⏳",
                }[journey.status] || "?";

              return (
                <div key={journey.id} className={`border rounded-lg ${statusColor}`}>
                  <button
                    onClick={() => setExpandedJourney(isExpanded ? null : journey.id)}
                    className="w-full p-3 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{statusIcon}</span>
                        <div>
                          <div className="text-sm text-white font-medium capitalize">
                            {journey.status.replace("_", " ")}
                          </div>
                          <div className="text-xs text-gray-400">
                            {startDate.toLocaleDateString()} • {duration}
                          </div>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{isExpanded ? "▼" : "▶"}</span>
                    </div>
                  </button>

                  {isExpanded && journey.waypoints && (
                    <div className="px-3 pb-3 pt-2 border-t border-gray-700 space-y-2">
                      <div className="text-xs text-gray-400">
                        Waypoints: {Object.keys(journey.waypoints).length || 0}
                      </div>
                      {journey.current_waypoint !== undefined && (
                        <div className="text-xs text-gray-400">
                          Progress: Waypoint {journey.current_waypoint + 1}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {history.journeys.length > 5 && (
              <div className="text-xs text-gray-500 text-center pt-2">
                Showing 5 of {history.journeys.length} journeys
              </div>
            )}
          </div>

          <div className="text-xs text-gray-500 mt-3 pt-2 border-t border-gray-700">
            💡 Complete more journeys to improve your success rate and learn what works best for
            you!
          </div>
        </div>
      )}
    </div>
  );
}
