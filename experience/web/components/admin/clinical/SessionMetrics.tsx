/**
 * Session Metrics Display Component
 *
 * Shows session duration, emotion count, and other metrics
 */

"use client";

import type { SessionMetrics } from "@/types/chat";

interface SessionMetricsDisplayProps {
  sessionMetrics: SessionMetrics;
  isExpanded: boolean;
}

export function SessionMetricsDisplay({ sessionMetrics, isExpanded }: SessionMetricsDisplayProps) {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isExpanded) {
    // Compact display
    return (
      <div className="px-4 py-2 bg-gray-800/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">⏱️</span>
            <span className="text-white font-mono">
              {formatDuration(sessionMetrics.elapsedSeconds)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">💭</span>
            <span className="text-white">{sessionMetrics.emotionCount}</span>
          </div>
          {sessionMetrics.averageConfidence > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-gray-400">✓</span>
              <span className="text-white">
                {(sessionMetrics.averageConfidence * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        {sessionMetrics.dominantCategory && (
          <div className="text-gray-400">{sessionMetrics.dominantCategory}</div>
        )}
      </div>
    );
  }

  // Expanded display
  return (
    <div className="px-4 py-3 bg-gray-800/60">
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div>
          <div className="text-gray-400 mb-1">Session Duration</div>
          <div className="text-white font-mono text-lg">
            {formatDuration(sessionMetrics.elapsedSeconds)}
          </div>
        </div>

        <div>
          <div className="text-gray-400 mb-1">Emotions Analyzed</div>
          <div className="text-white text-lg">{sessionMetrics.emotionCount}</div>
        </div>

        <div>
          <div className="text-gray-400 mb-1">Avg Confidence</div>
          <div className="flex items-center gap-2">
            <div className="text-white text-lg">
              {sessionMetrics.averageConfidence > 0
                ? `${(sessionMetrics.averageConfidence * 100).toFixed(0)}%`
                : "--"}
            </div>
            {sessionMetrics.averageConfidence > 0 && (
              <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${
                    sessionMetrics.averageConfidence >= 0.8
                      ? "bg-green-500"
                      : sessionMetrics.averageConfidence >= 0.6
                        ? "bg-yellow-500"
                        : "bg-red-500"
                  }`}
                  style={{ width: `${sessionMetrics.averageConfidence * 100}%` }}
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <div className="text-gray-400 mb-1">Primary Category</div>
          <div className="text-white text-sm">{sessionMetrics.dominantCategory || "--"}</div>
        </div>
      </div>

      {/* Alert Summary */}
      {(sessionMetrics.alertCount.critical > 0 ||
        sessionMetrics.alertCount.warning > 0 ||
        sessionMetrics.alertCount.attention > 0) && (
        <div className="mt-3 pt-3 border-t border-gray-700 flex items-center gap-3 text-xs">
          <span className="text-gray-400">Session Alerts:</span>
          {sessionMetrics.alertCount.critical > 0 && (
            <span className="text-red-400">🔴 {sessionMetrics.alertCount.critical} Critical</span>
          )}
          {sessionMetrics.alertCount.warning > 0 && (
            <span className="text-yellow-400">⚠️ {sessionMetrics.alertCount.warning} Warning</span>
          )}
          {sessionMetrics.alertCount.attention > 0 && (
            <span className="text-orange-400">
              🟡 {sessionMetrics.alertCount.attention} Attention
            </span>
          )}
        </div>
      )}
    </div>
  );
}
