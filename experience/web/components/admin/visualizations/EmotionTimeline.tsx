/**
 * Emotion Timeline Component
 *
 * Visual timeline showing emotional progression over time.
 * Displays emotions chronologically with connecting lines.
 */

"use client";

import type { EmotionHistoryEntry } from "@/stores/useEmotionHistoryStore";
import { CATEGORY_COLORS } from "@/types/atlas-admin";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface EmotionTimelineProps {
  entries: EmotionHistoryEntry[];
  onToggleVisibility: (id: string) => void;
}

export function EmotionTimeline({ entries, onToggleVisibility }: EmotionTimelineProps) {
  const theme = useAdminTheme();

  if (entries.length === 0) return null;

  return (
    <div className="space-y-3">
      {/* Timeline nodes */}
      {entries.map((entry, index) => {
        const categoryColor = CATEGORY_COLORS[entry.category] || "#888888";
        const timeStr = entry.timestamp.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        const isFirst = index === 0;

        return (
          <div key={entry.id} className="relative">
            {/* Connecting Line */}
            {!isFirst && (
              <div
                className={`absolute left-[13px] -top-3 w-0.5 h-3 ${theme.colors.border.replace("border", "bg").replace("/20", "/50") || "bg-gray-600"}`}
              />
            )}

            {/* Timeline Node */}
            <div className="flex items-start gap-3">
              {/* Timeline Dot */}
              <div className="relative flex-shrink-0">
                <button
                  onClick={() => onToggleVisibility(entry.id)}
                  className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition ${
                    entry.isVisibleInSphere
                      ? "border-cyan-400 bg-cyan-500"
                      : `${theme.colors.border} ${theme.colors.background} hover:brightness-125`
                  }`}
                  style={{
                    backgroundColor: entry.isVisibleInSphere ? categoryColor : undefined,
                  }}
                  title={`${entry.isVisibleInSphere ? "Hide from" : "Show in"} sphere`}
                >
                  <span
                    className={`text-xs ${entry.isVisibleInSphere ? "text-white" : theme.colors.text.secondary}`}
                  >
                    {entry.isVisibleInSphere ? "✓" : "○"}
                  </span>
                </button>
              </div>

              {/* Entry Info */}
              <div
                className={`flex-1 min-w-0 ${theme.colors.background} rounded-lg p-2 border ${theme.colors.border}`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h4 className={`text-sm font-medium ${theme.colors.text.primary} truncate`}>
                    {entry.emotion}
                  </h4>
                  <span className={`text-xs ${theme.colors.text.secondary} whitespace-nowrap`}>
                    {timeStr}
                  </span>
                </div>

                <div className={`text-xs ${theme.colors.text.secondary} mb-1 truncate`}>
                  {entry.category}
                </div>

                {/* Mini VAC bar chart */}
                <div className="flex gap-1 mt-2">
                  <div className="flex-1">
                    <div className={`text-xs ${theme.colors.text.muted} mb-0.5`}>V</div>
                    <div className="h-1.5 bg-gray-700/50 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          entry.vac.valence >= 0 ? "bg-cyan-400" : "bg-red-400"
                        }`}
                        style={{
                          width: `${Math.abs(entry.vac.valence) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs ${theme.colors.text.muted} mb-0.5`}>A</div>
                    <div className="h-1.5 bg-gray-700/50 rounded overflow-hidden">
                      <div
                        className="h-full bg-orange-400 transition-all"
                        style={{
                          width: `${Math.abs(entry.vac.arousal) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className={`text-xs ${theme.colors.text.muted} mb-0.5`}>C</div>
                    <div className="h-1.5 bg-gray-700/50 rounded overflow-hidden">
                      <div
                        className={`h-full transition-all ${
                          entry.vac.connection >= 0 ? "bg-purple-400" : "bg-pink-400"
                        }`}
                        style={{
                          width: `${Math.abs(entry.vac.connection) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Timeline End Marker */}
      <div className="flex items-center gap-3 mt-2">
        <div className="w-7 h-7 flex items-center justify-center">
          <div className="w-2 h-2 bg-gray-600 rounded-full" />
        </div>
        <div className="text-xs text-gray-500 italic">Session start</div>
      </div>
    </div>
  );
}
