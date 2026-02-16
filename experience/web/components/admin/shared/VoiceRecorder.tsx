/**
 * Voice Recorder Component
 *
 * Modal for recording voice messages with visualization
 */

"use client";

import { useVoiceRecording } from "@/hooks/useVoiceRecording";
import { logger } from "@/utils/logger";
import { AudioVisualizer } from "../visualizations/AudioVisualizer";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface VoiceRecorderProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (audioData: string, audioBlob?: Blob) => void;
}

export function VoiceRecorder({ isOpen, onClose, onSend }: VoiceRecorderProps) {
  const theme = useAdminTheme();
  const {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    audioBlob,
    audioUrl,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
    error,
  } = useVoiceRecording({
    onRecordingComplete: () => {
      logger.info("hooks", "Voice recording complete, ready to send");
    },
    onError: (err) => {
      logger.error("hooks", "Voice recording error", err);
    },
  });

  const handleStart = async () => {
    await startRecording();
  };

  const handleStopAndSend = () => {
    stopRecording();

    // Wait a moment for the blob to be ready
    setTimeout(() => {
      // Convert to base64 and send (also pass blob for waveform visualization)
      const reader = new FileReader();

      reader.onerror = (ev) => {
        logger.error("general", "Error reading audio blob", ev);
      };

      reader.onloadend = () => {
        const base64data = reader.result as string;
        if (!base64data) {
          logger.error("general", "FileReader result is empty");
          return;
        }
        const base64Audio = base64data.split(",")[1];
        onSend(base64Audio, audioBlob || /* istanbul ignore next */ undefined); // Pass blob as second parameter
        onClose();

        // Reset for next recording
        cancelRecording();
      };
      reader.readAsDataURL(audioBlob!);
    }, 100);
  };

  const handleCancel = () => {
    cancelRecording();
    onClose();
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div
        className={`bg-gray-900 ${theme.layout.borderRadius} border-2 ${theme.colors.border} ${theme.effects.glow} p-6 max-w-2xl w-full mx-4 transition-colors duration-500`}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3
            className={`text-xl font-semibold flex items-center gap-2 ${theme.colors.text.primary}`}
          >
            🎤 Voice Recording
          </h3>
          <div className={`text-2xl font-mono ${theme.colors.primary}`}>
            {formatDuration(duration)}
          </div>
        </div>

        {/* Visualizer */}
        <AudioVisualizer
          audioLevel={audioLevel}
          isRecording={isRecording}
          width={600}
          height={100}
        />

        {/* Status */}
        <div className="mt-4 text-center">
          {!isRecording && !audioBlob && (
            <p className={`text-sm ${theme.colors.text.secondary}`}>
              Click &quot;Start Recording&quot; to begin
            </p>
          )}
          {isRecording && !isPaused && (
            <p className={`text-sm flex items-center justify-center gap-2 ${theme.colors.primary}`}>
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              Recording in progress...
            </p>
          )}
          {isPaused && <p className="text-yellow-400 text-sm">Recording paused</p>}
          {audioBlob && !isRecording && (
            <p className="text-green-400 text-sm">✓ Recording complete - ready to send!</p>
          )}
          {error && <p className="text-red-400 text-sm">⚠️ {error}</p>}
        </div>

        {/* Controls */}
        <div className="mt-6 flex items-center justify-center gap-3">
          {!isRecording && !audioBlob && (
            <>
              <button
                onClick={handleStart}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                <span className="text-lg">🎤</span>
                Start Recording
              </button>
              <button
                onClick={handleCancel}
                className={`px-6 py-3 bg-black/30 border ${theme.colors.border} ${theme.colors.hover} ${theme.colors.text.primary} ${theme.layout.borderRadius} transition`}
              >
                Cancel
              </button>
            </>
          )}

          {isRecording && (
            <>
              {!isPaused ? (
                <button
                  onClick={pauseRecording}
                  className="px-6 py-3 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition"
                >
                  ⏸ Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition"
                >
                  ▶️ Resume
                </button>
              )}
              <button
                onClick={stopRecording}
                className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition font-medium"
              >
                ⏹ Stop
              </button>
              <button
                onClick={handleCancel}
                className={`px-6 py-3 bg-black/30 border ${theme.colors.border} ${theme.colors.hover} ${theme.colors.text.primary} ${theme.layout.borderRadius} transition`}
              >
                ✗ Cancel
              </button>
            </>
          )}

          {audioBlob && !isRecording && (
            <>
              {audioUrl && <audio src={audioUrl} controls className="max-w-xs" />}
              <button
                onClick={handleStopAndSend}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition font-medium flex items-center gap-2"
              >
                <span>✓</span>
                Send Recording
              </button>
              <button
                onClick={() => {
                  cancelRecording();
                }}
                className={`px-6 py-3 bg-black/30 border ${theme.colors.border} ${theme.colors.hover} ${theme.colors.text.primary} ${theme.layout.borderRadius} transition`}
              >
                🔄 Record Again
              </button>
              <button
                onClick={handleCancel}
                className={`px-6 py-3 bg-black/30 border ${theme.colors.border} ${theme.colors.hover} ${theme.colors.text.primary} ${theme.layout.borderRadius} transition`}
              >
                ✗ Cancel
              </button>
            </>
          )}
        </div>

        {/* Tips */}
        <div className={`mt-6 pt-4 border-t ${theme.colors.border}`}>
          <p className={`text-xs text-center ${theme.colors.text.muted}`}>
            💡 Tip: Speak clearly about your emotions. Include details about what you&apos;re
            feeling, thinking, or experiencing for best analysis.
          </p>
        </div>
      </div>
    </div>
  );
}
