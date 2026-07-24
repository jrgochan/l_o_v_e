"use client";

/**
 * CorrelationInsights — Displays discovered patterns between
 * emotions and life events.
 *
 * Shows correlation cards with strength bars, confidence badges,
 * and confirm/dismiss feedback buttons. Includes a "Find Patterns"
 * analysis trigger.
 */

import { useState } from "react";
import { Sparkles, Check, X, Loader2, TrendingUp, TrendingDown } from "lucide-react";
import { useJournalStore } from "@/stores/useJournalStore";
import { EventTypeIcon, getEventTypeColor } from "@/components/journal/EventTypeIcon";
import type { Correlation } from "@/types/journal";

/** Format a lag in seconds to a human-readable string. */
function formatLag(lagSeconds?: number): string {
  if (!lagSeconds) return "";
  const hours = Math.abs(lagSeconds) / 3600;
  if (hours < 1) return `${Math.round(hours * 60)}min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  return `${(hours / 24).toFixed(1)}d`;
}

function CorrelationCard({ correlation }: { correlation: Correlation }) {
  const submitFeedback = useJournalStore((s) => s.submitFeedback);
  const color = getEventTypeColor(correlation.event_type);
  const isPositive = correlation.direction === "positive";

  return (
    <div
      className="p-3 rounded-xl bg-white/[0.03] border border-white/5
        hover:border-white/10 transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center
            bg-white/5 shrink-0"
        >
          <EventTypeIcon eventType={correlation.event_type} size={14} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {isPositive ? (
              <TrendingUp size={12} className="text-green-400" />
            ) : (
              <TrendingDown size={12} className="text-red-400" />
            )}
            <span className="text-sm font-medium text-white/90 truncate">
              {correlation.event_pattern}
            </span>
          </div>
          <p className="text-xs text-white/40 mt-0.5">
            {isPositive ? "↑" : "↓"} {correlation.emotion_name}
            {correlation.lag_seconds
              ? ` within ${formatLag(correlation.lag_seconds)}`
              : ""}
          </p>
        </div>
      </div>

      {/* Strength bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-xs">
          <span className="text-white/30">Strength</span>
          <span className="text-white/50">
            {(correlation.strength * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${correlation.strength * 100}%`,
              background: `linear-gradient(to right, ${color}40, ${color})`,
            }}
          />
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full border"
            style={{
              borderColor: `${color}30`,
              color: `${color}cc`,
              backgroundColor: `${color}10`,
            }}
          >
            {(correlation.confidence * 100).toFixed(0)}% confident
          </span>
          <span className="text-[10px] text-white/20">
            n={correlation.sample_size}
          </span>
        </div>

        {/* Feedback buttons */}
        {!correlation.user_feedback && (
          <div className="flex gap-1">
            <button
              onClick={() => submitFeedback(correlation.id, "confirmed")}
              className="p-1 rounded hover:bg-green-500/20 text-white/30
                hover:text-green-400 transition-all"
              title="Confirm this pattern"
            >
              <Check size={12} />
            </button>
            <button
              onClick={() => submitFeedback(correlation.id, "dismissed")}
              className="p-1 rounded hover:bg-red-500/20 text-white/30
                hover:text-red-400 transition-all"
              title="Dismiss this pattern"
            >
              <X size={12} />
            </button>
          </div>
        )}

        {correlation.user_feedback === "confirmed" && (
          <span className="text-[10px] text-green-400/60">✓ Confirmed</span>
        )}
        {correlation.user_feedback === "dismissed" && (
          <span className="text-[10px] text-white/20">Dismissed</span>
        )}
      </div>
    </div>
  );
}

export function CorrelationInsights() {
  const correlations = useJournalStore((s) => s.correlations);
  const isAnalyzing = useJournalStore((s) => s.isAnalyzing);
  const lastAnalysis = useJournalStore((s) => s.lastAnalysis);
  const runAnalysis = useJournalStore((s) => s.runAnalysis);
  const [showDismissed, setShowDismissed] = useState(false);

  const visible = correlations.filter((c) =>
    showDismissed ? true : c.user_feedback !== "dismissed"
  );

  return (
    <div className="space-y-3">
      {/* Header + Find Patterns button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-400" />
          <h3 className="text-sm font-semibold text-white/90 tracking-wide uppercase">
            Insights
          </h3>
        </div>

        <button
          onClick={runAnalysis}
          disabled={isAnalyzing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs
            bg-purple-500/10 border border-purple-500/20 text-purple-300
            hover:bg-purple-500/20 disabled:opacity-40
            transition-all"
        >
          {isAnalyzing ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <Sparkles size={12} />
          )}
          Find Patterns
        </button>
      </div>

      {/* Analysis result toast */}
      {lastAnalysis && (
        <div className="text-xs text-white/40 px-2 py-1.5 rounded-lg bg-purple-500/5 border border-purple-500/10">
          Found {lastAnalysis.correlations_found} pattern
          {lastAnalysis.correlations_found !== 1 ? "s" : ""},{" "}
          {lastAnalysis.correlations_created} new
        </div>
      )}

      {/* Correlation cards */}
      {visible.length > 0 ? (
        <div className="space-y-2">
          {visible.map((c) => (
            <CorrelationCard key={c.id} correlation={c} />
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <Sparkles size={28} className="mx-auto text-white/15 mb-3" />
          <p className="text-sm text-white/35">No patterns discovered yet</p>
          <p className="text-xs text-white/20 mt-1">
            Log more events, then hit &quot;Find Patterns&quot;
          </p>
        </div>
      )}

      {/* Show dismissed toggle */}
      {correlations.some((c) => c.user_feedback === "dismissed") && (
        <button
          onClick={() => setShowDismissed(!showDismissed)}
          className="text-xs text-white/30 hover:text-white/50 transition-colors"
        >
          {showDismissed ? "Hide" : "Show"} dismissed
        </button>
      )}
    </div>
  );
}
