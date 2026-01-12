/**
 * Aggregate State Card Component
 *
 * Displays aggregate emotional state with complexity, clarity, and temporal pattern
 */

"use client";

import type { AggregateState } from "@/types/chat";

interface AggregateStateCardProps {
  aggregate: AggregateState;
  className?: string;
}

export function AggregateStateCard({ aggregate, className = "" }: AggregateStateCardProps) {
  // Get complexity level label
  const getComplexityLabel = (score: number) => {
    if (score > 0.7) return "High";
    if (score > 0.4) return "Moderate";
    return "Low";
  };

  // Get clarity level label
  const getClarityLabel = (score: number) => {
    if (score > 0.7) return "Clear";
    if (score > 0.4) return "Moderate";
    return "Muddied";
  };

  // Get temporal pattern description
  const getTemporalDescription = (pattern: string) => {
    switch (pattern) {
      case "concurrent":
        return "Happening simultaneously";
      case "sequential":
        return "One after another";
      case "emerging":
        return "Building or developing";
      default:
        return pattern;
    }
  };

  // Get temporal pattern icon
  const getTemporalIcon = (pattern: string) => {
    switch (pattern) {
      case "concurrent":
        return "⊕";
      case "sequential":
        return "→";
      case "emerging":
        return "↗";
      default:
        return "•";
    }
  };

  return (
    <div
      className={`bg-gradient-to-br from-cyan-900/30 to-purple-900/30 rounded-lg p-4 border border-cyan-500/30 ${className}`}
    >
      <div className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
        🎯 Aggregate Emotional State
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Weighted VAC */}
        <div className="col-span-2">
          <div className="text-gray-400 text-xs mb-1">Weighted VAC:</div>
          <div className="font-mono text-white text-sm">
            ({aggregate.vac.valence.toFixed(2)}, {aggregate.vac.arousal.toFixed(2)},{" "}
            {aggregate.vac.connection.toFixed(2)})
          </div>
        </div>

        {/* Complexity Score */}
        <div>
          <div className="text-gray-400 text-xs mb-2">Complexity:</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-yellow-500 to-orange-500 transition-all duration-500"
                style={{ width: `${aggregate.complexity_score * 100}%` }}
              />
            </div>
            <span className="font-mono text-white text-xs w-10 text-right">
              {(aggregate.complexity_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {getComplexityLabel(aggregate.complexity_score)}
          </div>
        </div>

        {/* Emotional Clarity */}
        <div>
          <div className="text-gray-400 text-xs mb-2">Clarity:</div>
          <div className="flex items-center gap-2 mb-1">
            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${aggregate.emotional_clarity * 100}%` }}
              />
            </div>
            <span className="font-mono text-white text-xs w-10 text-right">
              {(aggregate.emotional_clarity * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-xs text-gray-400">
            {getClarityLabel(aggregate.emotional_clarity)}
          </div>
        </div>

        {/* Temporal Pattern */}
        <div className="col-span-2">
          <div className="text-gray-400 text-xs mb-1">Pattern:</div>
          <div className="flex items-center gap-2">
            <span className="text-lg">{getTemporalIcon(aggregate.temporal_pattern)}</span>
            <div>
              <div className="text-white capitalize font-medium">{aggregate.temporal_pattern}</div>
              <div className="text-xs text-gray-400">
                {getTemporalDescription(aggregate.temporal_pattern)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
