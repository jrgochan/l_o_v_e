import { useCallback } from "react";
import { logger } from "@/utils/logger";
import type { ServerMessage, DeepFeelingServerMessage } from "@/types/chat";
import { dispatchMessage, type MessageHandlers } from "./utils/messageDispatcher";

export interface MessageHandlerOptions extends MessageHandlers {
  onMessage?: (message: ServerMessage | DeepFeelingServerMessage) => void;
}

export function useWebSocketMessageHandler(options: MessageHandlerOptions) {
  const { onMessage, setError } = options;

  const handleMessage = useCallback(
    (event: MessageEvent) => {
      try {
        const message: DeepFeelingServerMessage = JSON.parse(event.data);
        logger.debug("websocket", "Message received", message);

        // Call general message handler
        onMessage?.(message);

        // Dispatch to specific handlers
        dispatchMessage(message, options);
      } catch (err) {
        logger.error("websocket", "Failed to parse message", err);
        setError("Failed to parse server message");
      }
    },
    [options, onMessage, setError]
  );

  return { handleMessage };
}
