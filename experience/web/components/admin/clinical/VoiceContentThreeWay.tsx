/**
 * Voice-Content 3-Way Analysis Component
 *
 * Clinical component displaying three separate emotion interpretations:
 * 1. Content-Only (from text semantic analysis)
 * 2. Voice-Only (from prosody features)
 * 3. Blended (combined interpretation)
 *
 * Highlights discrepancies that may indicate emotional suppression,
 * minimization, or other clinically significant patterns.
 */

"use client";

import React from "react";
import type { ThreeWayAnalysis, VAC, DetectedEmotion } from "@/types/chat";

interface ThreeWayEmotionData {
  emotions: DetectedEmotion[];
  aggregate_vac: VAC;
  complexity_score: number;
  emotional_clarity: number;
  reasoning: string;
}

interface VoiceContentThreeWayProps {
  analysis: ThreeWayAnalysis;
  onEmotionClick?: (emotionName: string) => void;
  className?: string;
}

export function VoiceContentThreeWay({
  analysis,
  onEmotionClick,
  className = "",
}: VoiceContentThreeWayProps) {
  const { content_only, voice_only, blended, discrepancy } = analysis;

  // Helper to render emotion card
  const renderEmotionCard = (
    data: ThreeWayEmotionData | undefined,
    title: string,
    icon: string,
    colorScheme: {
      border: string;
      bg: string;
      text: string;
      header: string;
      buttonBg: string;
      buttonHover: string;
    }
  ) => {
    if (!data || !data.emotions || data.emotions.length === 0) {
      return (
        <div className={`rounded-lg p-4 border ${colorScheme.border} ${colorScheme.bg}`}>
          <h3 className={`font-semibold mb-3 flex items-center gap-2 ${colorScheme.header}`}>
            <span>{icon}</span>
            <span>{title}</span>
          </h3>
          <p className="text-gray-400 text-sm">No data available</p>
        </div>
      );
    }

    const primaryEmotion =
      data.emotions.find((e) => e.prominence === "primary") || data.emotions[0];

    return (
      <div className={`rounded-lg p-4 border ${colorScheme.border} ${colorScheme.bg}`}>
        <h3 className={`text-sm font-semibold mb-3 flex items-center gap-2 ${colorScheme.header}`}>
          <span>{icon}</span>
          <span>{title}</span>
        </h3>

        {/* Primary Emotion */}
        <div className="mb-4">
          <div className="text-2xl font-bold text-white mb-1">{primaryEmotion.emotion_name}</div>
          <div className="text-xs text-gray-400 mb-3">{primaryEmotion.category}</div>

          {/* Confidence Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Confidence</span>
              <span className="font-mono">{(primaryEmotion.confidence * 100).toFixed(0)}%</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-green-500 to-green-400 transition-all"
                style={{ width: `${primaryEmotion.confidence * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* VAC Coordinates */}
        <div className="bg-gray-900/50 p-3 rounded border border-gray-700 mb-3">
          <div className="text-xs text-gray-400 mb-2 font-semibold">VAC Coordinates</div>
          <div className="space-y-1 font-mono text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Valence:</span>
              <span
                className={`${data.aggregate_vac.valence >= 0 ? "text-green-400" : "text-red-400"}`}
              >
                {data.aggregate_vac.valence >= 0 ? "+" : ""}
                {data.aggregate_vac.valence.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Arousal:</span>
              <span className="text-gray-200">
                {data.aggregate_vac.arousal >= 0 ? "+" : ""}
                {data.aggregate_vac.arousal.toFixed(3)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Connection:</span>
              <span className="text-gray-200">
                {data.aggregate_vac.connection >= 0 ? "+" : ""}
                {data.aggregate_vac.connection.toFixed(3)}
              </span>
            </div>
          </div>
        </div>

        {/* Additional Metrics */}
        <div className="space-y-2 text-xs mb-3">
          <div className="flex justify-between">
            <span className="text-gray-400">Complexity:</span>
            <span className="text-gray-200 font-mono">
              {(data.complexity_score * 100).toFixed(0)}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Clarity:</span>
            <span className="text-gray-200 font-mono">
              {(data.emotional_clarity * 100).toFixed(0)}%
            </span>
          </div>
        </div>

        {/* View in Sphere Button */}
        {onEmotionClick && (
          <button
            onClick={() => onEmotionClick(primaryEmotion.emotion_name)}
            className={`w-full px-3 py-2 ${colorScheme.buttonBg} hover:${colorScheme.buttonHover} text-white text-xs rounded transition font-medium flex items-center justify-center gap-1`}
            title="View this emotion in the Soul Sphere"
          >
            <span>🔍</span>
            <span>View in Sphere</span>
          </button>
        )}

        {/* Reasoning (collapsible) */}
        {data.reasoning && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <details className="text-xs">
              <summary className="text-gray-400 cursor-pointer hover:text-gray-300">
                Reasoning
              </summary>
              <p className="text-gray-300 mt-2 italic">{data.reasoning}</p>
            </details>
          </div>
        )}
      </div>
    );
  };

  // Helper to get flag badge style
  const getFlagBadgeStyle = (flag: string) => {
    const styles: Record<string, string> = {
      significant_incongruence: "bg-red-500/20 text-red-300 border-red-500/40",
      emotional_suppression: "bg-orange-500/20 text-orange-300 border-orange-500/40",
      minimization: "bg-yellow-500/20 text-yellow-300 border-yellow-500/40",
      arousal_mismatch: "bg-purple-500/20 text-purple-300 border-purple-500/40",
      well_aligned: "bg-green-500/20 text-green-300 border-green-500/40",
      moderate_discrepancy: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    };
    return styles[flag] || "bg-gray-500/20 text-gray-300 border-gray-500/40";
  };

  // Helper to get flag icon
  const getFlagIcon = (flag: string) => {
    const icons: Record<string, string> = {
      significant_incongruence: "🚨",
      emotional_suppression: "⚠️",
      minimization: "⚡",
      arousal_mismatch: "⚖️",
      well_aligned: "✅",
      moderate_discrepancy: "ℹ️",
    };
    return icons[flag] || "•";
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* 3-Column Layout */}
      <div className="grid grid-cols-3 gap-4">
        {/* Content-Only Column */}
        {renderEmotionCard(content_only, "Content-Only", "📝", {
          border: "border-blue-500/30",
          bg: "bg-blue-900/20",
          text: "text-blue-300",
          header: "text-blue-300",
          buttonBg: "bg-blue-600",
          buttonHover: "bg-blue-500",
        })}

        {/* Voice-Only Column */}
        {renderEmotionCard(voice_only, "Voice-Only", "🎤", {
          border: "border-purple-500/30",
          bg: "bg-purple-900/20",
          text: "text-purple-300",
          header: "text-purple-300",
          buttonBg: "bg-purple-600",
          buttonHover: "bg-purple-500",
        })}

        {/* Blended Column */}
        {renderEmotionCard(blended, "Blended", "🔗", {
          border: "border-cyan-500/30",
          bg: "bg-cyan-900/20",
          text: "text-cyan-300",
          header: "text-cyan-300",
          buttonBg: "bg-cyan-600",
          buttonHover: "bg-cyan-500",
        })}
      </div>

      {/* Discrepancy Alert Banner */}
      {discrepancy && (
        <div
          className={`rounded-lg p-4 border ${
            discrepancy.content_voice_distance > 0.5
              ? "bg-orange-500/10 border-orange-500/40"
              : "bg-green-500/10 border-green-500/40"
          }`}
        >
          {/* Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-2xl">
                {discrepancy.content_voice_distance > 0.5 ? "⚠️" : "✅"}
              </span>
              <div>
                <h4
                  className={`font-semibold ${
                    discrepancy.content_voice_distance > 0.5 ? "text-orange-300" : "text-green-300"
                  }`}
                >
                  {discrepancy.content_voice_distance > 0.5
                    ? "Significant Discrepancy Detected"
                    : "Voice and Content Aligned"}
                </h4>
                <p className="text-xs text-gray-400 mt-0.5">
                  VAC Distance: {discrepancy.content_voice_distance.toFixed(3)}
                </p>
              </div>
            </div>

            {/* Emotion Comparison */}
            <div className="text-right text-xs">
              <div className="text-gray-400">Detected Emotions:</div>
              <div className="text-white space-y-0.5 mt-1">
                <div>📝 {discrepancy.content_primary}</div>
                {discrepancy.voice_primary && <div>🎤 {discrepancy.voice_primary}</div>}
                <div>🔗 {discrepancy.blended_primary}</div>
              </div>
            </div>
          </div>

          {/* Clinical Interpretation */}
          {discrepancy.interpretation && (
            <div
              className={`text-sm mb-3 ${
                discrepancy.content_voice_distance > 0.5 ? "text-orange-200" : "text-green-200"
              }`}
            >
              {discrepancy.interpretation}
            </div>
          )}

          {/* Clinical Flags */}
          {discrepancy.flags && discrepancy.flags.length > 0 && (
            <div>
              <div className="text-xs text-gray-400 mb-2">Clinical Flags:</div>
              <div className="flex flex-wrap gap-2">
                {discrepancy.flags.map((flag, index) => (
                  <span
                    key={index}
                    className={`px-2 py-1 rounded border text-xs font-medium flex items-center gap-1 ${getFlagBadgeStyle(flag)}`}
                  >
                    <span>{getFlagIcon(flag)}</span>
                    <span>{flag.replace(/_/g, " ")}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Additional Discrepancy Metrics */}
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <div className="text-gray-500 mb-1">Content ↔ Voice</div>
                <div className="font-mono text-white">
                  {discrepancy.content_voice_distance.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Content ↔ Blended</div>
                <div className="font-mono text-white">
                  {discrepancy.content_blended_distance.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-gray-500 mb-1">Voice ↔ Blended</div>
                <div className="font-mono text-white">
                  {discrepancy.voice_blended_distance.toFixed(3)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clinical Guidance Note */}
      {discrepancy && discrepancy.content_voice_distance > 0.5 && (
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <span className="text-cyan-400 text-sm">💡</span>
            <div className="flex-1">
              <div className="text-xs font-semibold text-cyan-300 mb-1">Clinical Note</div>
              <p className="text-xs text-gray-300 leading-relaxed">
                Significant discrepancies between voice and content may indicate emotional
                regulation, suppression, or difficulty identifying/expressing emotions. Consider
                exploring:
              </p>
              <ul className="text-xs text-gray-400 mt-2 space-y-1 ml-4">
                <li>• What might be contributing to the disconnect between words and voice?</li>
                <li>• Are there feelings that are hard to name or express?</li>
                <li>• Is there a pattern of minimizing or intellectualizing emotions?</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
