/**
 * Journey Progress Component
 *
 * Displays current journey progress with waypoint tracking.
 * Shows which waypoints have been reached and provides "mark as reached" functionality.
 */

"use client";

import { useState } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { StrategyFeedbackModal } from "@/components/StrategyFeedbackModal";
import type { StrategyFeedback } from "@/components/StrategyFeedbackModal";
import { getObserverClient } from "@love/experience-shared";
import { logger } from "@/utils/logger";

export function JourneyProgress() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const activeJourney = useExperienceStore((state) => state.activeJourney);
  const transitionPath = useExperienceStore((state) => state.transitionPath);
  const markWaypointReached = useExperienceStore((state) => state.markWaypointReached);
  const completeJourney = useExperienceStore((state) => state.completeJourney);
  const abandonJourney = useExperienceStore((state) => state.abandonJourney);

  if (!activeJourney || !transitionPath) {
    return null;
  }

  const progress = activeJourney.waypoints_reached.length / activeJourney.total_waypoints;
  const progressPercent = Math.round(progress * 100);

  // Calculate time elapsed
  const startedAt = new Date(activeJourney.started_at);
  const now = new Date();
  const minutesElapsed = Math.floor((now.getTime() - startedAt.getTime()) / 60000);

  // Determine current waypoint to work on
  const currentWaypointIndex = activeJourney.current_waypoint;
  const currentWaypoint = transitionPath.waypoints[currentWaypointIndex];

  return (
    <div className="p-4 bg-gradient-to-br from-green-900/40 to-blue-900/40 border border-green-700 rounded-lg space-y-3">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">🗺️ Journey in Progress</h3>
        <span className="text-sm text-gray-400">{minutesElapsed} min elapsed</span>
      </div>

      {/* Progress Bar */}
      <div>
        <div className="flex justify-between text-xs text-gray-400 mb-1">
          <span>Progress</span>
          <span>{progressPercent}%</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-green-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-1">
          {activeJourney.waypoints_reached.length} of {activeJourney.total_waypoints} waypoints
          reached
        </div>
      </div>

      {/* Current Waypoint */}
      {activeJourney.status === "in_progress" && currentWaypoint && (
        <div className="p-3 bg-black/30 rounded-lg border border-purple-500">
          <div className="text-sm font-semibold text-purple-300 mb-1">Current Waypoint:</div>
          <div className="text-white font-bold">{currentWaypoint.emotion}</div>
          <div className="text-xs text-gray-400 mt-1">{currentWaypoint.reasoning}</div>
          <div className="text-xs text-purple-400 mt-1">
            {currentWaypoint.estimated_time} • {currentWaypoint.difficulty}
          </div>

          {/* Mark as Reached Button */}
          <button
            onClick={() => setShowFeedbackModal(true)}
            className="w-full mt-3 px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-semibold rounded-lg transition-colors"
          >
            ✓ Mark as Reached
          </button>
        </div>
      )}

      {/* Completed State */}
      {activeJourney.status === "completed" && (
        <div className="p-3 bg-green-900/30 border border-green-500 rounded-lg text-center">
          <div className="text-2xl mb-2">🎉</div>
          <div className="text-white font-bold">Journey Complete!</div>
          <div className="text-xs text-green-400 mt-1">
            You&apos;ve successfully reached {transitionPath.goal_state.emotion}
          </div>
        </div>
      )}

      {/* Waypoint List */}
      <div className="space-y-1">
        <div className="text-xs font-semibold text-gray-400">Waypoints:</div>
        {transitionPath.waypoints.map((waypoint, idx) => {
          const isReached = activeJourney.waypoints_reached.includes(idx);
          const isCurrent = idx === currentWaypointIndex && activeJourney.status === "in_progress";
          const isLocked = idx > currentWaypointIndex && activeJourney.status === "in_progress";

          return (
            <div
              key={idx}
              className={`flex items-center gap-2 p-2 rounded ${
                isReached
                  ? "bg-green-900/30 border border-green-700"
                  : isCurrent
                    ? "bg-purple-900/30 border border-purple-500"
                    : "bg-gray-900/30 border border-gray-700"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  isReached
                    ? "bg-green-600 text-white"
                    : isCurrent
                      ? "bg-purple-600 text-white"
                      : "bg-gray-600 text-gray-400"
                }`}
              >
                {isReached ? "✓" : waypoint.order}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm ${isReached ? "line-through text-gray-500" : isCurrent ? "text-white font-semibold" : "text-gray-400"}`}
                >
                  {waypoint.emotion}
                </div>
              </div>
              {isLocked && <span className="text-xs text-gray-500">🔒</span>}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      {activeJourney.status === "in_progress" && (
        <button
          onClick={() => {
            if (confirm("Are you sure you want to abandon this journey?")) {
              abandonJourney();
            }
          }}
          className="w-full px-4 py-2 bg-red-900/50 hover:bg-red-800 text-red-300 font-semibold rounded-lg transition-colors border border-red-700"
        >
          Abandon Journey
        </button>
      )}

      {/* Feedback Error */}
      {feedbackError && (
        <div className="p-2 bg-red-900/30 border border-red-700 rounded text-xs text-red-400">
          {feedbackError}
        </div>
      )}

      {/* Strategy Feedback Modal */}
      {showFeedbackModal && currentWaypoint && (
        <StrategyFeedbackModal
          waypoint={{
            emotion: currentWaypoint.emotion,
            strategies: currentWaypoint.strategies,
          }}
          onSubmit={async (feedback: StrategyFeedback[]) => {
            try {
              setFeedbackError(null);

              // Call Observer API to mark waypoint reached with feedback
              const client = getObserverClient();
              await fetch(
                `${client["config"].baseUrl}/observer/journey/${activeJourney.journey_id}/waypoint-reached`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    waypoint_index: currentWaypointIndex,
                    reached_at: new Date().toISOString(),
                    strategies_tried: feedback,
                    self_assessment: "reached", // Could be enhanced with more detail
                  }),
                }
              );

              // Update local state
              markWaypointReached(currentWaypointIndex);
              setShowFeedbackModal(false);

              // Check if this was the last waypoint
              if (currentWaypointIndex === activeJourney.total_waypoints - 1) {
                setTimeout(() => {
                  completeJourney();
                  alert("🎉 Journey Complete! You've reached your goal!");
                }, 500);
              }
            } catch (error) {
              logger.error("api", "Failed to submit feedback", error);
              setFeedbackError("Failed to submit feedback. Please try again.");
            }
          }}
          onSkip={() => {
            // Mark waypoint reached without feedback
            markWaypointReached(currentWaypointIndex);
            setShowFeedbackModal(false);

            // Check if this was the last waypoint
            if (currentWaypointIndex === activeJourney.total_waypoints - 1) {
              setTimeout(() => {
                completeJourney();
                alert("🎉 Journey Complete! You've reached your goal!");
              }, 500);
            }
          }}
          onClose={() => setShowFeedbackModal(false)}
        />
      )}
    </div>
  );
}
