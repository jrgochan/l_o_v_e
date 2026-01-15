import { useRef, useCallback, useEffect } from "react";
import { logger } from "@/utils/logger";
import { getAudioStream, processAudioBlob, stopStreamTracks } from "./utils/audioUtils";
import { type VoiceState, type useVoiceState } from "./useVoiceState";

type Actions = ReturnType<typeof useVoiceState>["actions"];

interface UseMediaRecorderOptions {
  state: VoiceState;
  actions: Actions;
  onRecordingComplete?: (audioBlob: Blob, audioData: string) => void;
  onError?: (error: string) => void;
}

export function useMediaRecorder({
  state,
  actions,
  onRecordingComplete,
  onError,
}: UseMediaRecorderOptions) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const startMediaRecorder = useCallback(async () => {
    try {
      const mediaStream = await getAudioStream();
      actions.setStream(mediaStream);

      const mediaRecorder = new MediaRecorder(mediaStream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          const { blob, url, base64 } = await processAudioBlob(audioChunksRef.current);
          actions.setAudioBlob(blob);
          actions.setAudioUrl(url);
          onRecordingComplete?.(blob, base64);
        } catch (err) {
          logger.error("hooks", "Failed to process audio blob", err);
        } finally {
          stopStreamTracks(mediaStream);
          actions.setStream(null);
        }
      };

      mediaRecorder.start();
      actions.setIsRecording(true);
      actions.setError(null);

      const startTime = Date.now();
      durationIntervalRef.current = setInterval(() => {
        actions.setDuration(Math.floor((Date.now() - startTime) / 1000));
      }, 100);

      logger.info("hooks", "Recording started");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to access microphone";
      logger.error("hooks", "Recording error", msg);
      actions.setError(msg);
      onError?.(msg);
    }
  }, [actions, onRecordingComplete, onError]);

  const stopMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      actions.setIsRecording(false);
      actions.setIsPaused(false);
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      durationIntervalRef.current = null;
      logger.info("hooks", "Recording stopped");
    }
  }, [actions]);

  const pauseMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.pause();
      actions.setIsPaused(true);
      logger.debug("hooks", "Recording paused");
    }
  }, [actions]);

  const resumeMediaRecorder = useCallback(() => {
    if (mediaRecorderRef.current?.state === "paused") {
      mediaRecorderRef.current.resume();
      actions.setIsPaused(false);
      logger.debug("hooks", "Recording resumed");
    }
  }, [actions]);

  const cancelMediaRecorder = useCallback(() => {
    stopMediaRecorder();
    actions.resetState();
    logger.debug("hooks", "Recording cancelled");
  }, [stopMediaRecorder, actions]);

  // Clean up
  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) clearInterval(durationIntervalRef.current);
      stopStreamTracks(state.stream);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    startMediaRecorder,
    stopMediaRecorder,
    pauseMediaRecorder,
    resumeMediaRecorder,
    cancelMediaRecorder,
  };
}
