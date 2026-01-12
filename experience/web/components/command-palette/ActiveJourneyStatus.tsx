"use client";

import { useExperienceStore } from "@/stores/useExperienceStore";

interface ActiveJourneyStatusProps {
  onAction: (command: string) => void;
}

export function ActiveJourneyStatus({ onAction }: ActiveJourneyStatusProps) {
  const activeJourney = useExperienceStore((state) => state.activeJourney);
  const transitionPath = useExperienceStore((state) => state.transitionPath);

  if (!activeJourney || !transitionPath) return null;

  return (
    <div className="px-4 py-3 bg-gradient-to-r from-purple-900/40 to-blue-900/40 border-b border-purple-700/50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl">
            {activeJourney.status === "in_progress"
              ? "🛤️"
              : activeJourney.status === "paused"
                ? "⏸️"
                : activeJourney.status === "completed"
                  ? "✅"
                  : "🚶"}
          </span>
          <div>
            <div className="text-sm font-semibold text-white">
              {activeJourney.status === "in_progress"
                ? "Active Journey"
                : activeJourney.status === "paused"
                  ? "Journey Paused"
                  : activeJourney.status === "completed"
                    ? "Journey Complete"
                    : "Journey"}
            </div>
            <div className="text-xs text-purple-300">
              {transitionPath.current_state.emotion} → {transitionPath.goal_state.emotion}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Progress indicator */}
          <div className="text-xs text-purple-200">
            <div className="mb-1">
              Waypoint {activeJourney.current_waypoint + 1} of {activeJourney.total_waypoints}
            </div>
            <div className="w-32 h-1.5 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-cyan-500 rounded-full transition-all duration-300"
                style={{
                  width: `${(activeJourney.waypoints_reached.length / activeJourney.total_waypoints) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* Quick actions */}
          <div className="flex gap-1">
            {activeJourney.status === "in_progress" &&
              activeJourney.current_waypoint < transitionPath.waypoints.length && (
                <button
                  onClick={() => onAction("/next")}
                  className="text-xs px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 rounded transition"
                  title="Next waypoint"
                >
                  Next →
                </button>
              )}
            {activeJourney.status === "paused" && (
              <button
                onClick={() => onAction("/journey resume")}
                className="text-xs px-2 py-1 bg-green-500/20 hover:bg-green-500/30 text-green-200 rounded transition"
                title="Resume journey"
              >
                Resume
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
