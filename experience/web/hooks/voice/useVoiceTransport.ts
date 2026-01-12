import { useVoiceState } from "./useVoiceState";
import { useMediaRecorder } from "./useMediaRecorder";

interface UseVoiceTransportOptions {
  onRecordingComplete?: (audioBlob: Blob, audioData: string) => void;
  onError?: (error: string) => void;
}

export function useVoiceTransport({ onRecordingComplete, onError }: UseVoiceTransportOptions) {
  const { state, actions } = useVoiceState();

  const recorder = useMediaRecorder({
    state,
    actions,
    onRecordingComplete,
    onError,
  });

  return {
    ...state,
    ...recorder,
  };
}
