import { useCallback } from "react";
import { logger } from "@/utils/logger";
import type { ToneMode, ClientMessage } from "@/types/chat";

interface SenderOptions {
  wsRef: React.MutableRefObject<WebSocket | null>;
  setError: (error: string | null) => void;
}

export function useWebSocketSender(options: SenderOptions) {
  const { wsRef, setError } = options;

  const sendMessage = useCallback(
    (content: string, tonePreference: ToneMode, deepFeelingEnabled: boolean = false) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        logger.error("websocket", "Cannot send message: not connected");
        setError("Not connected to server");
        return;
      }

      const message = {
        type: "user_message" as const,
        content,
        tone_preference: tonePreference,
        deep_feeling_enabled: deepFeelingEnabled,
      };

      logger.debug("websocket", "Sending text message", message);
      wsRef.current.send(JSON.stringify(message));
    },
    [wsRef, setError]
  );

  const sendAudio = useCallback(
    (audioData: string, tonePreference: ToneMode, deepFeelingEnabled: boolean = false) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        logger.error("websocket", "Cannot send audio: not connected");
        setError("Not connected to server");
        return;
      }

      const message = {
        type: "user_message" as const,
        audio_data: audioData,
        tone_preference: tonePreference,
        deep_feeling_enabled: deepFeelingEnabled,
      };

      logger.debug("websocket", "Sending audio message", {
        length: audioData.length,
        deepFeeling: deepFeelingEnabled,
      });
      wsRef.current.send(JSON.stringify(message));
    },
    [wsRef, setError]
  );

  const updateTonePreference = useCallback(
    (tone: ToneMode) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        logger.error("websocket", "Cannot update tone: not connected");
        return;
      }

      const message: ClientMessage = {
        type: "update_tone",
        tone_preference: tone,
      };

      logger.debug("websocket", "Updating tone preference", { tone });
      wsRef.current.send(JSON.stringify(message));
    },
    [wsRef]
  );

  const updateDeepFeelingMode = useCallback(
    (enabled: boolean) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        logger.error("websocket", "Cannot update deep feeling mode: not connected");
        return;
      }

      const message = {
        type: "update_deep_feeling" as const,
        deep_feeling_enabled: enabled,
      };

      logger.debug("websocket", "Updating deep feeling mode", { enabled });
      wsRef.current.send(JSON.stringify(message));
    },
    [wsRef]
  );

  return {
    sendMessage,
    sendAudio,
    updateTonePreference,
    updateDeepFeelingMode,
  };
}
