/**
 * Prosody Visualization Component
 *
 * Visual representation of voice characteristics
 * Shows energy levels, pitch, rate with waveform-style display
 * Uses Web Audio API to extract real waveform from audio blob when available
 */

"use client";

import { useState, useEffect } from "react";
import { logger } from "@/utils/logger";
import type { ProsodyData } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

// Extend Window interface for legacy WebKit AudioContext
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

interface ProsodyVisualizationProps {
  prosody: ProsodyData;
  audioBlob: Blob | null;
}

export function ProsodyVisualization({ prosody, audioBlob }: ProsodyVisualizationProps) {
  const theme = useAdminTheme();
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);

  // Extract real waveform from audio blob using Web Audio API
  useEffect(() => {
    // Guard against no prosody or no audio blob
    if (!prosody || !audioBlob) {
      // No audio blob, will use synthetic waveform
      setWaveformData([]);
      return;
    }

    const extractWaveform = async () => {
      setIsLoadingAudio(true);
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Get channel data (mono or first channel)
        const channelData = audioBuffer.getChannelData(0);
        const sampleCount = 40; // Number of bars to display
        const samplesPerBar = Math.floor(channelData.length / sampleCount);

        const waveform: number[] = [];

        for (let i = 0; i < sampleCount; i++) {
          const start = i * samplesPerBar;
          const end = start + samplesPerBar;

          // Calculate RMS (root mean square) for this segment
          let sum = 0;
          for (let j = start; j < end && j < channelData.length; j++) {
            sum += channelData[j] * channelData[j];
          }
          const rms = Math.sqrt(sum / samplesPerBar);

          // Normalize to 0-100 range (with some amplification for visibility)
          const normalized = Math.min(100, rms * 300); // Amplify by 300 for better visibility
          waveform.push(Math.max(5, normalized)); // Minimum 5 for visibility
        }

        setWaveformData(waveform);
        audioContext.close();
      } catch (error) {
        logger.error("rendering", "Failed to extract waveform", error);
        setWaveformData([]); // Fall back to synthetic
      } finally {
        setIsLoadingAudio(false);
      }
    };

    extractWaveform();
  }, [audioBlob, prosody]);

  // Early return if no prosody data
  if (!prosody) return null;

  const { pitch_mean, pitch_std, energy, rate } = prosody;

  // Generate synthetic waveform bars based on energy and pitch variability
  // Used as fallback when no audio blob available
  const generateSyntheticWaveform = () => {
    const bars = [];
    const barCount = 40;
    const baseEnergy = energy || 0.5;
    const variability = pitch_std ? Math.min(pitch_std / 100, 0.5) : 0.2;

    for (let i = 0; i < barCount; i++) {
      // Create a wave-like pattern
      const wave = Math.sin((i / barCount) * Math.PI * 3) * 0.3;
      // Add some randomness based on variability
      const noise = (Math.random() - 0.5) * variability;
      // Calculate bar height (0-100)
      const height = Math.max(5, Math.min(100, (baseEnergy + wave + noise) * 100));
      bars.push(height);
    }

    return bars;
  };

  // Use real waveform if available, otherwise generate synthetic
  const waveform = waveformData.length > 0 ? waveformData : generateSyntheticWaveform();
  const isRealWaveform = waveformData.length > 0;

  // Determine energy level interpretation
  const getEnergyLevel = () => {
    if (!energy) return { label: "Unknown", color: theme.colors.text.muted };
    if (energy > 0.7) return { label: "High Energy", color: "text-red-400" };
    if (energy > 0.4) return { label: "Moderate Energy", color: "text-yellow-400" };
    return { label: "Low Energy", color: "text-blue-400" };
  };

  // Determine pitch level
  const getPitchLevel = () => {
    if (!pitch_mean) return { label: "Unknown", color: theme.colors.text.muted };
    if (pitch_mean > 250) return { label: "High Pitch", color: "text-purple-400" };
    if (pitch_mean > 150) return { label: "Normal Pitch", color: "text-green-400" };
    return { label: "Low Pitch", color: "text-blue-400" };
  };

  // Determine rate level
  const getRateLevel = () => {
    if (!rate) return { label: "Unknown", color: theme.colors.text.muted };
    if (rate > 5) return { label: "Fast Speech", color: "text-orange-400" };
    if (rate > 3) return { label: "Normal Pace", color: "text-green-400" };
    return { label: "Slow Speech", color: "text-blue-400" };
  };

  const energyLevel = getEnergyLevel();
  const pitchLevel = getPitchLevel();
  const rateLevel = getRateLevel();

  return (
    <div className={`rounded-lg p-4 border border-cyan-500/30 ${theme.colors.background}`}>
      <div className="text-sm text-cyan-300 mb-3 font-semibold flex items-center justify-between">
        <span>🎵 Voice Prosody Analysis</span>
        <span className={`text-xs ${energyLevel.color}`}>{energyLevel.label}</span>
      </div>

      {/* Waveform Visualization */}
      <div className={`rounded-lg p-4 mb-4 ${theme.colors.background}`}>
        {isLoadingAudio ? (
          <div className="h-24 flex items-center justify-center">
            <div className={`flex items-center gap-2 ${theme.colors.text.muted}`}>
              <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
              <span className="text-xs">Processing audio...</span>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-end justify-between h-24 gap-0.5">
              {waveform.map((height, index) => (
                <div
                  key={index}
                  className={`flex-1 rounded-t transition-all duration-200 ${
                    isRealWaveform
                      ? "bg-gradient-to-t from-green-500 to-green-300 hover:from-green-400 hover:to-green-200"
                      : "bg-gradient-to-t from-cyan-500 to-cyan-300 hover:from-cyan-400 hover:to-cyan-200"
                  }`}
                  style={{
                    height: `${height}%`,
                    opacity: 0.6 + height / 200,
                  }}
                />
              ))}
            </div>
            <div className={`mt-2 flex items-center justify-center gap-2 text-xs ${theme.colors.text.muted}`}>
              <span>{isRealWaveform ? "🎙️ Real Audio" : "📊 Synthetic"} Waveform</span>
              {isRealWaveform && (
                <span className="px-1.5 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                  ✓ Accurate
                </span>
              )}
            </div>
          </>
        )}
      </div>

      {/* Detailed Metrics */}
      <div className="space-y-3">
        {/* Pitch */}
        {pitch_mean && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${theme.colors.text.muted}`}>Pitch</span>
                <span className={`text-xs font-semibold ${pitchLevel.color}`}>
                  {pitchLevel.label}
                </span>
              </div>
              <span className="text-xs font-mono text-white">
                {pitch_mean.toFixed(1)} Hz
                {pitch_std && ` ±${pitch_std.toFixed(1)}`}
              </span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${theme.colors.background}`}>
              <div
                className="h-full bg-gradient-to-r from-purple-600 to-purple-400"
                style={{ width: `${Math.min(100, (pitch_mean / 400) * 100)}%` }}
              />
            </div>
            {pitch_std && (
              <div className={`mt-1 text-xs ${theme.colors.text.muted}`}>
                Variability: {pitch_std > 30 ? "High" : pitch_std > 15 ? "Moderate" : "Low"}
              </div>
            )}
          </div>
        )}

        {/* Energy */}
        {energy && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs ${theme.colors.text.muted}`}>Vocal Energy</span>
              <span className="text-xs font-mono text-white">{(energy * 100).toFixed(1)}%</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${theme.colors.background}`}>
              <div
                className={`h-full transition-all ${
                  energy > 0.7
                    ? "bg-gradient-to-r from-red-600 to-red-400"
                    : energy > 0.4
                      ? "bg-gradient-to-r from-yellow-600 to-yellow-400"
                      : "bg-gradient-to-r from-blue-600 to-blue-400"
                }`}
                style={{ width: `${energy * 100}%` }}
              />
            </div>
          </div>
        )}

        {/* Speech Rate */}
        {rate && (
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <div className="flex items-center gap-2">
                <span className={`text-xs ${theme.colors.text.muted}`}>Speech Rate</span>
                <span className={`text-xs font-semibold ${rateLevel.color}`}>
                  {rateLevel.label}
                </span>
              </div>
              <span className="text-xs font-mono text-white">{rate.toFixed(1)} syll/sec</span>
            </div>
            <div className={`h-2 rounded-full overflow-hidden ${theme.colors.background}`}>
              <div
                className="h-full bg-gradient-to-r from-orange-600 to-orange-400"
                style={{ width: `${Math.min(100, (rate / 7) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Clinical Interpretation */}
      <div className={`mt-4 pt-3 border-t ${theme.colors.border}`}>
        <div className={`text-xs space-y-1.5 ${theme.colors.text.secondary}`}>
          <div className="flex items-start gap-2">
            <span className="text-cyan-400 flex-shrink-0">•</span>
            <span>
              {energy && energy > 0.7
                ? "High vocal energy may indicate heightened emotional arousal, stress, or activation."
                : energy && energy < 0.3
                  ? "Low vocal energy may suggest fatigue, depression, or emotional withdrawal."
                  : "Moderate vocal energy within normal range."}
            </span>
          </div>
          {pitch_std && (
            <div className="flex items-start gap-2">
              <span className="text-purple-400 flex-shrink-0">•</span>
              <span>
                {pitch_std > 30
                  ? "High pitch variability suggests emotional expressiveness or instability."
                  : pitch_std < 15
                    ? "Low pitch variability may indicate flat affect or emotional suppression."
                    : "Normal pitch variation indicates appropriate emotional modulation."}
              </span>
            </div>
          )}
          {rate && (
            <div className="flex items-start gap-2">
              <span className="text-orange-400 flex-shrink-0">•</span>
              <span>
                {rate > 5
                  ? "Rapid speech rate may indicate anxiety, mania, or pressured thought."
                  : rate < 3
                    ? "Slow speech rate may suggest depression, cognitive processing, or careful consideration."
                    : "Speech rate within normal conversational range."}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Prosody Features (if available) */}
      {prosody.features && Object.keys(prosody.features).length > 0 && (
        <div className={`mt-3 pt-3 border-t ${theme.colors.border}`}>
          <div className={`text-xs mb-2 ${theme.colors.text.muted}`}>Additional Features:</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(prosody.features)
              .slice(0, 4)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className={theme.colors.text.muted}>{key}:</span>
                  <span className="text-white font-mono">
                    {typeof value === "number" ? value.toFixed(2) : String(value)}
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
