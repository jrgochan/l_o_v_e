/**
 * Voice-Content Correlation Component
 *
 * Displays the correlation between voice energy and content arousal
 * Highlights discrepancies that may indicate emotional suppression
 */

"use client";

import type { VoiceContentCorrelation as VoiceContentCorrelationType } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface VoiceContentCorrelationProps {
  correlation: VoiceContentCorrelationType;
}

export function VoiceContentCorrelation({ correlation }: VoiceContentCorrelationProps) {
  const theme = useAdminTheme();
  const { voice_energy, content_arousal, discrepancy, aligned, interpretation } = correlation;

  // Normalize content arousal from [-1, 1] to [0, 1]
  const normalizedContentArousal = (content_arousal + 1) / 2;

  return (
    <div
      className={`rounded-lg p-4 border ${theme.colors.background} ${
        discrepancy > 0.5 ? "border-orange-500/50" : theme.colors.border
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-orange-300 font-semibold">Voice-Content Correlation</div>
        <div
          className={`px-2 py-1 rounded text-xs font-medium ${
            aligned ? "bg-green-500/20 text-green-300" : "bg-orange-500/20 text-orange-300"
          }`}
        >
          {aligned ? "✓ Aligned" : "⚠️ Discrepancy"}
        </div>
      </div>

      {/* Side-by-side comparison bars */}
      <div className="space-y-3">
        {/* Voice Energy */}
        <div>
          <div className={`flex justify-between text-xs mb-1.5 ${theme.colors.text.muted}`}>
            <span>Voice Energy</span>
            <span className="font-mono text-white">{voice_energy.toFixed(3)}</span>
          </div>
          <div className={`h-3 rounded-full overflow-hidden relative ${theme.colors.background}`}>
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all"
              style={{ width: `${voice_energy * 100}%` }}
            />
          </div>
        </div>

        {/* Content Arousal */}
        <div>
          <div className={`flex justify-between text-xs mb-1.5 ${theme.colors.text.muted}`}>
            <span>Content Arousal</span>
            <span className="font-mono text-white">{content_arousal.toFixed(3)}</span>
          </div>
          <div className={`h-3 rounded-full overflow-hidden relative ${theme.colors.background}`}>
            <div
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all"
              style={{ width: `${normalizedContentArousal * 100}%` }}
            />
          </div>
        </div>

        {/* Discrepancy Indicator */}
        <div className={`pt-2 border-t ${theme.colors.border}`}>
          <div className="flex justify-between text-xs mb-1.5">
            <span className={discrepancy > 0.5 ? "text-orange-300 font-medium" : theme.colors.text.muted}>
              Discrepancy Level
            </span>
            <span
              className={`font-mono ${
                discrepancy > 0.5 ? "text-orange-300 font-bold" : "text-white"
              }`}
            >
              {discrepancy.toFixed(3)}
            </span>
          </div>
          <div className={`h-2 rounded-full overflow-hidden ${theme.colors.background}`}>
            <div
              className={`h-full transition-all ${
                discrepancy > 0.5
                  ? "bg-orange-500"
                  : discrepancy > 0.3
                    ? "bg-yellow-500"
                    : "bg-green-500"
              }`}
              style={{ width: `${discrepancy * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Clinical interpretation */}
      {interpretation && (
        <div className={`mt-3 pt-3 border-t ${theme.colors.border}`}>
          <div className={`text-xs italic leading-relaxed ${theme.colors.text.secondary}`}>{interpretation}</div>
        </div>
      )}

      {/* Clinical note for high discrepancy */}
      {discrepancy > 0.5 && (
        <div className="mt-3 p-2 bg-orange-500/10 border border-orange-500/30 rounded">
          <div className="text-xs text-orange-300">
            <span className="font-semibold">Clinical Note:</span> Significant mismatch between vocal
            expression and content may indicate emotional regulation, suppression, or incongruence
            worth exploring in session.
          </div>
        </div>
      )}
    </div>
  );
}
