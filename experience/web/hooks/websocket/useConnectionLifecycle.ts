import { useRef, useCallback, useEffect } from "react";
import { logger } from "@/utils/logger";
import { useAuthStore } from "@/stores/authStore";
import {
  getWebSocketUrl,
  createWebSocketConnection,
  handleSocketClose,
} from "./utils/socketHelpers";

interface UseConnectionLifecycleOptions {
  sessionId: string;
  enabled: boolean;
  autoReconnect: boolean;
  onMessage: (event: MessageEvent) => void;
  onError?: (error: string) => void;
  setError: (error: string | null) => void;
  setIsConnected: (connected: boolean) => void;
  setIsConnecting: (connecting: boolean) => void;
}

export function useConnectionLifecycle({
  sessionId,
  enabled,
  autoReconnect,
  onMessage,
  onError,
  setError,
  setIsConnected,
  setIsConnecting,
}: UseConnectionLifecycleOptions) {
  const { token } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  // Stabilization refs
  const connectRef = useRef<(() => void) | null>(null);
  const onMessageRef = useRef(onMessage);
  const onErrorRef = useRef(onError);
  const setErrorRef = useRef(setError);
  const setIsConnectedRef = useRef(setIsConnected);
  const setIsConnectingRef = useRef(setIsConnecting);

  // Update refs on every render
  useEffect(() => {
    onMessageRef.current = onMessage;
    onErrorRef.current = onError;
    setErrorRef.current = setError;
    setIsConnectedRef.current = setIsConnected;
    setIsConnectingRef.current = setIsConnecting;
  }, [onMessage, onError, setError, setIsConnected, setIsConnecting]);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setIsConnectingRef.current(true);
    setErrorRef.current(null);

    try {
      const url = getWebSocketUrl(`observer/ws/${sessionId}`, token || undefined);
      logger.info("websocket", `Connecting to ${url.split("?")[0]}...`);

      const ws = createWebSocketConnection(url, {
        onOpen: () => {
          logger.info("websocket", "Connected");
          setIsConnectedRef.current(true);
          setIsConnectingRef.current(false);
          setErrorRef.current(null);
          reconnectAttempts.current = 0;
        },
        onMessage: (event) => onMessageRef.current(event),
        onError: (event) => {
          logger.error("websocket", "WebSocket error", event);
          setErrorRef.current("WebSocket connection error");
          onErrorRef.current?.("WebSocket connection error");
        },
        onClose: (event) => {
          logger.info("websocket", "Disconnected", { code: event.code, reason: event.reason });
          setIsConnectedRef.current(false);
          setIsConnectingRef.current(false);
          wsRef.current = null;

          handleSocketClose(
            event,
            {
              autoReconnect,
              maxAttempts: maxReconnectAttempts,
              reconnectAttempts,
              timeoutRef: reconnectTimeoutRef,
              connectFn: () => connectRef.current?.(),
              setError: setErrorRef.current,
              onError: onErrorRef.current,
            },
            logger
          );
        },
      });

      wsRef.current = ws;
    } catch (err) {
      logger.error("websocket", "Connection failed", err);
      setIsConnectingRef.current(false);
      setErrorRef.current("Failed to establish WebSocket connection");
      onErrorRef.current?.("Failed to establish WebSocket connection");
    }
  }, [sessionId, token, autoReconnect]); // Removed unstable callbacks from dependencies

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      logger.debug("websocket", "Disconnecting");
      wsRef.current.close(1000, "Client disconnect");
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsConnecting(false);
  }, [setIsConnected, setIsConnecting]);

  const reconnect = useCallback(() => {
    disconnect();
    reconnectAttempts.current = 0;
    connect();
  }, [connect, disconnect]);

  // Keep connectRef up to date
  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  // Connect when enabled
  useEffect(() => {
    if (enabled) connect();
    return () => disconnect();
  }, [enabled, connect, disconnect]);

  return { wsRef, connect, disconnect, reconnect };
}
