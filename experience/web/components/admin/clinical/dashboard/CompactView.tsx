/**
 * Compact View Component
 *
 * Compact 2x2 grid layout showing key metrics at a glance:
 * - Emotion state with confidence
 * - VAC coordinates
 * - Voice profile (if available)
 * - Risk indicator/status
 */

"use client";

import type { VAC, ProsodyData } from "@/types/chat";

interface CompactViewProps {
  emotion: string;
  category: string | null;
  vac: VAC;
  confidence: number | null;
  prosody: ProsodyData | null;
  overallStatus: string;
  alertCount: number;
}

/**
 * Renders compact dashboard view with 4 key cards
 */
export function CompactView({
  emotion,
  category,
  vac,
  confidence,
  prosody,
  overallStatus,
  alertCount,
}: CompactViewProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* Emotion State Card */}
      <div className="bg-gray-700/50 rounded-lg p-3 border border-pink-500/30">
        <div className="text-xs text-pink-300 mb-1">Emotion</div>
        <div className="font-bold text-white text-sm">{emotion}</div>
        {category && <div className="text-xs text-gray-400 mt-1">{category}</div>}
        {confidence !== null && (
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-gray-600 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-gray-300">{(confidence * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>

      {/* VAC Summary Card */}
      <div className="bg-gray-700/50 rounded-lg p-3 border border-purple-500/30">
        <div className="text-xs text-purple-300 mb-1">VAC Coordinates</div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-400">V:</span>
            <span className="text-white font-mono">{vac.valence.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">A:</span>
            <span className="text-white font-mono">{vac.arousal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">C:</span>
            <span className="text-white font-mono">{vac.connection.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Voice Profile Card (if available) */}
      {prosody && (
        <div className="bg-gray-700/50 rounded-lg p-3 border border-cyan-500/30">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs text-cyan-300">Voice</div>
            {prosody.voice_quality && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  prosody.voice_quality === "good"
                    ? "bg-green-500/20 text-green-400"
                    : prosody.voice_quality === "moderate"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : "bg-red-500/20 text-red-400"
                }`}
              >
                {prosody.voice_quality === "good"
                  ? "🟢"
                  : prosody.voice_quality === "moderate"
                    ? "🟡"
                    : "🔴"}
              </span>
            )}
          </div>
          <div className="space-y-1 text-xs">
            {prosody.energy && (
              <div className="flex justify-between">
                <span className="text-gray-400">Energy:</span>
                <span className="text-white font-mono">
                  {prosody.energy > 0.7 ? "High" : prosody.energy < 0.3 ? "Low" : "Med"}
                </span>
              </div>
            )}
            {prosody.pitch_mean && (
              <div className="flex justify-between">
                <span className="text-gray-400">Pitch:</span>
                <span className="text-white font-mono">{prosody.pitch_mean.toFixed(0)}Hz</span>
              </div>
            )}
            {prosody.rate && (
              <div className="flex justify-between">
                <span className="text-gray-400">Rate:</span>
                <span className="text-white font-mono">{prosody.rate.toFixed(1)}</span>
              </div>
            )}
            {prosody.hnr && (
              <div className="flex justify-between">
                <span className="text-gray-400">HNR:</span>
                <span
                  className={`font-mono ${
                    prosody.hnr > 15
                      ? "text-green-400"
                      : prosody.hnr > 10
                        ? "text-yellow-400"
                        : "text-red-400"
                  }`}
                >
                  {prosody.hnr.toFixed(1)}dB
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Risk Indicator Card */}
      <div
        className={`bg-gray-700/50 rounded-lg p-3 border ${
          overallStatus === "critical"
            ? "border-red-500/30"
            : overallStatus === "warning"
              ? "border-yellow-500/30"
              : overallStatus === "attention"
                ? "border-orange-500/30"
                : "border-green-500/30"
        }`}
      >
        <div className="text-xs text-gray-300 mb-1">Status</div>
        <div
          className={`font-bold text-sm ${
            overallStatus === "critical"
              ? "text-red-400"
              : overallStatus === "warning"
                ? "text-yellow-400"
                : overallStatus === "attention"
                  ? "text-orange-400"
                  : "text-green-400"
          }`}
        >
          {overallStatus === "critical" && "🔴 Critical"}
          {overallStatus === "warning" && "⚠️ Warning"}
          {overallStatus === "attention" && "🟡 Attention"}
          {overallStatus === "stable" && "🟢 Stable"}
        </div>
        {alertCount > 0 && (
          <div className="text-xs text-gray-400 mt-1">
            {alertCount} alert{alertCount > 1 ? "s" : ""}
          </div>
        )}
      </div>
    </div>
  );
}
