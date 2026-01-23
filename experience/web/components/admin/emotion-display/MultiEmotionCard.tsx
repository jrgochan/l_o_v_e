/**
 * Multi-Emotion Card Component
 *
 * Detailed view of multi-emotion analysis with:
 * - Primary emotion (expanded card)
 * - Secondary emotions (stacked cards)
 * - Underlying emotions (collapsible)
 * - Relationships between emotions
 * - Aggregate state summary
 */

"use client";

import { useState } from "react";

import { RelationshipList } from "../shared/RelationshipIndicator";
import { AggregateStateCard } from "../state-display/AggregateStateCard";
import { EmotionRelationshipGraph } from "../visualizations/EmotionRelationshipGraph";
import { AggregateSphere } from "../spheres/AggregateSphere";
import { EmotionMappingBadge } from "./EmotionMappingBadge";
import { useVisualizationStore } from "@/stores/useVisualizationStore";
import type { DetectedEmotion, EmotionRelationship, AggregateState } from "@/types/chat";

interface MultiEmotionCardProps {
  emotions: DetectedEmotion[];
  relationships?: EmotionRelationship[];
  aggregate?: AggregateState;
  onEmotionClick?: (emotion: string) => void;
  className?: string;
}

export function MultiEmotionCard({
  emotions,
  relationships = [],
  aggregate,
  onEmotionClick,
  className = "",
}: MultiEmotionCardProps) {
  const [showUnderlying, setShowUnderlying] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showSphere, setShowSphere] = useState(false);

  // Get animation mode from store (for aggregate sphere)
  const pathAnimationMode = useVisualizationStore((state) => state.settings.pathAnimationMode);

  if (!emotions || emotions.length === 0) {
    return null;
  }

  // Separate emotions by prominence
  const primary = emotions.find((e) => e.prominence === "primary");
  const secondary = emotions.filter((e) => e.prominence === "secondary");
  const underlying = emotions.filter((e) => e.prominence === "underlying");

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Primary Emotion Card */}
      {primary && (
        <div className="bg-gray-800 rounded-lg p-4 border-2 border-purple-500/50">
          <div className="text-xs text-purple-300 mb-2">PRIMARY EMOTION</div>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-2xl font-bold text-white mb-2">{primary.emotion_name}</h4>
              {primary.original_name && (
                <EmotionMappingBadge
                  originalName={primary.original_name}
                  atlasName={primary.emotion_name}
                  matchMethod={primary.match_method}
                  matchConfidence={primary.match_confidence}
                  className="mb-2"
                />
              )}
              <p className="text-sm text-gray-400 mb-3">{primary.category}</p>

              {/* VAC Coordinates */}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-300">Valence:</span>
                  <span className="font-mono text-white">{primary.vac.valence.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Arousal:</span>
                  <span className="font-mono text-white">{primary.vac.arousal.toFixed(3)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Connection:</span>
                  <span className="font-mono text-white">{primary.vac.connection.toFixed(3)}</span>
                </div>
              </div>
            </div>

            {/* Confidence Bar */}
            <div className="text-right">
              <div className="text-2xl font-bold text-green-400">
                {(primary.confidence * 100).toFixed(0)}%
              </div>
              <div className="text-xs text-gray-400">Confidence</div>
              <div className="w-24 h-2 bg-gray-700 rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-green-400"
                  style={{ width: `${primary.confidence * 100}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Secondary Emotions */}
      {secondary.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-400 uppercase tracking-wide">Secondary Emotions</div>
          {secondary.map((emo, index) => (
            <div
              key={`secondary-${index}`}
              className="bg-gray-800/70 rounded-lg p-3 border border-gray-600 hover:border-gray-500 transition cursor-pointer"
              onClick={() => onEmotionClick?.(emo.emotion_name)}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h5 className="text-lg font-medium text-white">{emo.emotion_name}</h5>
                  {emo.original_name && (
                    <EmotionMappingBadge
                      originalName={emo.original_name}
                      atlasName={emo.emotion_name}
                      matchMethod={emo.match_method}
                      matchConfidence={emo.match_confidence}
                      className="mb-1"
                    />
                  )}
                  <p className="text-xs text-gray-400">{emo.category}</p>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-gray-300">
                    {(emo.confidence * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-gray-500">
                    VAC: ({emo.vac.valence.toFixed(1)}, {emo.vac.arousal.toFixed(1)},{" "}
                    {emo.vac.connection.toFixed(1)})
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Underlying Emotions - Collapsible */}
      {underlying.length > 0 && (
        <div>
          <button
            onClick={() => setShowUnderlying(!showUnderlying)}
            className="w-full flex items-center justify-between text-sm text-gray-400 hover:text-gray-300 transition"
          >
            <span>
              {showUnderlying ? "⊖" : "⊕"} UNDERLYING EMOTIONS ({underlying.length})
            </span>
            <span className="text-xs">{showUnderlying ? "Hide" : "Show"}</span>
          </button>

          {showUnderlying && (
            <div className="mt-2 space-y-2">
              {underlying.map((emo, index) => (
                <div
                  key={`underlying-${index}`}
                  className="bg-gray-800/50 rounded-lg p-2 border border-gray-700 opacity-75"
                >
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-white">{emo.emotion_name}*</span>
                    <span className="font-mono text-gray-400">
                      {(emo.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Emotion Relationships */}
      {relationships && relationships.length > 0 && (
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <div className="text-sm font-semibold text-white">🔗 Emotion Relationships</div>
            <button
              onClick={() => setShowGraph(!showGraph)}
              className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded transition text-cyan-400"
            >
              {showGraph ? "Hide Graph" : "Show Graph"}
            </button>
          </div>

          {showGraph ? (
            <EmotionRelationshipGraph
              emotions={emotions}
              relationships={relationships}
              width={500}
              height={350}
              onEmotionClick={(emotion) => onEmotionClick?.(emotion.emotion_name)}
            />
          ) : (
            <RelationshipList relationships={relationships} />
          )}
        </div>
      )}

      {/* Aggregate State */}
      {aggregate && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSphere(!showSphere)}
              className="text-xs px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded transition text-white"
            >
              {showSphere ? "Hide" : "Show"} 3D Sphere
            </button>
          </div>

          {showSphere && (
            <div className="bg-gray-900 rounded-lg p-4 border border-purple-500/30 flex justify-center">
              <AggregateSphere
                emotions={emotions}
                aggregate={aggregate}
                width={300}
                height={300}
                mode={pathAnimationMode}
              />
            </div>
          )}

          <AggregateStateCard aggregate={aggregate} />
        </div>
      )}
    </div>
  );
}
