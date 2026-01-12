import { useState } from "react";

export interface VoiceState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  error: string | null;
  stream: MediaStream | null;
}

export function useVoiceState() {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const resetState = () => {
    setDuration(0);
    setAudioBlob(null);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
      setAudioUrl(null);
    }
    setError(null);
  };

  return {
    state: {
      isRecording,
      isPaused,
      duration,
      audioBlob,
      audioUrl,
      error,
      stream,
    },
    actions: {
      setIsRecording,
      setIsPaused,
      setDuration,
      setAudioBlob,
      setAudioUrl,
      setError,
      setStream,
      resetState,
    },
  };
}
