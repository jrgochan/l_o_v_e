/**
 * Session Timeline Component
 *
 * Chronological view of emotions throughout the session
 * Shows timing, categories, and alert levels
 */

"use client";

import type { EmotionTimelineEvent } from "@/types/chat";

interface SessionTimelineProps {
  emotionTimeline: EmotionTimelineEvent[];
}

export function SessionTimeline({ emotionTimeline }: SessionTimelineProps) {
  if (emotionTimeline.length === 0) return null;

  const getAlertColor = (level?: "critical" | "warning" | "attention" | "stable") => {
    switch (level) {
      case "critical":
        return "bg-red-500 border-red-400";
      case "warning":
        return "bg-yellow-500 border-yellow-400";
      case "attention":
        return "bg-orange-500 border-orange-400";
      default:
        return "bg-green-500 border-green-400";
    }
  };

  const getAlertIcon = (level?: "critical" | "warning" | "attention" | "stable") => {
    switch (level) {
      case "critical":
        return "🔴";
      case "warning":
        return "⚠️";
      case "attention":
        return "🟡";
      default:
        /* istanbul ignore next */
        return "🟢";
    }
  };

  // Calculate session start time for relative timestamps
  const sessionStart = emotionTimeline[0].timestamp.getTime();

  const formatRelativeTime = (timestamp: Date) => {
    const elapsed = Math.floor((timestamp.getTime() - sessionStart) / 1000);
    const mins = Math.floor(elapsed / 60);
    const secs = elapsed % 60;
    return `+${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
      <div className="text-sm text-gray-300 mb-3 font-semibold flex items-center justify-between">
        <span>🕐 Session Timeline</span>
        <span className="text-xs text-gray-400">{emotionTimeline.length} events</span>
      </div>

      {/* Timeline */}
      <div className="space-y-3 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
        {emotionTimeline.map((event, index) => {
          const isLast = index === emotionTimeline.length - 1;

          return (
            <div key={index} className="relative">
              {/* Timeline connector line */}
              {!isLast && <div className="absolute left-3 top-8 bottom-0 w-px bg-gray-600"></div>}

              {/* Event card */}
              <div className="flex gap-3">
                {/* Timeline marker */}
                <div
                  className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${getAlertColor(
                    event.alertLevel
                  )} ${isLast ? "animate-pulse" : ""}`}
                >
                  {isLast && <div className="w-2 h-2 rounded-full bg-white"></div>}
                </div>

                {/* Event details */}
                <div
                  className={`flex-1 pb-3 ${
                    isLast
                      ? "bg-gray-700/50 -mt-1 -ml-3 pl-9 pr-4 py-3 rounded-lg border border-cyan-500/30"
                      : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white truncate">
                          {event.emotion}
                        </span>
                        {event.alertLevel && (
                          <span className="text-xs">{getAlertIcon(event.alertLevel)}</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-400 mb-1">{event.category}</div>

                      {/* VAC preview */}
                      <div className="flex gap-3 text-xs font-mono mt-1.5">
                        <span className="text-purple-300">
                          V: {event.vac.valence > 0 ? "+" : ""}
                          {event.vac.valence.toFixed(2)}
                        </span>
                        <span className="text-orange-300">
                          A: {event.vac.arousal > 0 ? "+" : ""}
                          {event.vac.arousal.toFixed(2)}
                        </span>
                        <span className="text-cyan-300">
                          C: {event.vac.connection > 0 ? "+" : ""}
                          {event.vac.connection.toFixed(2)}
                        </span>
                      </div>
                    </div>

                    {/* Timestamp and confidence */}
                    <div className="flex-shrink-0 text-right">
                      <div className="text-xs text-gray-400 font-mono">
                        {formatRelativeTime(event.timestamp)}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {(event.confidence * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Alert message for critical/warning events */}
                  {event.alertLevel === "critical" && (
                    <div className="mt-2 text-xs text-red-300 bg-red-500/10 px-2 py-1 rounded">
                      High distress detected
                    </div>
                  )}
                  {event.alertLevel === "warning" && (
                    <div className="mt-2 text-xs text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded">
                      Monitor closely
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-gray-600 flex items-center gap-4 text-xs">
        <span className="text-gray-400">Alert Levels:</span>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-gray-400">Stable</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-orange-500"></div>
          <span className="text-gray-400">Attention</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
          <span className="text-gray-400">Warning</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-2 h-2 rounded-full bg-red-500"></div>
          <span className="text-gray-400">Critical</span>
        </div>
      </div>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(55, 65, 81, 0.3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.7);
        }
      `}</style>
    </div>
  );
}
