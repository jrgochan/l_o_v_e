/**
 * Voice Recording Hook
 *
 * Manages Web Audio API for voice recording with real-time visualization.
 * Refactored to compose Transport and Visualizer logic.
 */

import { useEffect } from "react";
import { useVoiceTransport } from "./voice/useVoiceTransport";
import { useVoiceVisualizer } from "./voice/useVoiceVisualizer";

interface UseVoiceRecordingOptions {
  onRecordingComplete?: (audioBlob: Blob, audioData: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceRecordingReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioLevel: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
  error: string | null;
}

export function useVoiceRecording(options: UseVoiceRecordingOptions = {}): UseVoiceRecordingReturn {
  const {
    isRecording,
    isPaused,
    duration,
    audioBlob,
    audioUrl,
    error,
    stream,
    startMediaRecorder,
    stopMediaRecorder,
    pauseMediaRecorder,
    resumeMediaRecorder,
    cancelMediaRecorder,
  } = useVoiceTransport(options);

  const { audioLevel } = useVoiceVisualizer(stream);

  // Cleanup hook for URL revocation if component unmounts
  useEffect(() => {
    return () => {
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return {
    isRecording,
    isPaused,
    duration,
    audioLevel,
    audioBlob,
    audioUrl,
    error,
    startRecording: startMediaRecorder,
    stopRecording: stopMediaRecorder,
    pauseRecording: pauseMediaRecorder,
    resumeRecording: resumeMediaRecorder,
    cancelRecording: cancelMediaRecorder,
  };
}
