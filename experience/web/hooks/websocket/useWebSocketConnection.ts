import { useState, useEffect } from "react";
import { useConnectionLifecycle } from "./useConnectionLifecycle";

interface ConnectionOptions {
  sessionId: string;
  enabled?: boolean;
  autoReconnect?: boolean;
  onMessage: (event: MessageEvent) => void;
  onError?: (error: string) => void;
  setError: (error: string | null) => void;
}

export function useWebSocketConnection(options: ConnectionOptions) {
  const { sessionId, enabled = true, autoReconnect = true, onMessage, onError, setError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const { wsRef, connect, disconnect, reconnect } = useConnectionLifecycle({
    sessionId,
    enabled,
    autoReconnect,
    onMessage,
    onError,
    setError,
    setIsConnected,
    setIsConnecting,
  });

  // Heartbeat
  useEffect(() => {
    if (!isConnected) return;
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      }
    }, 30000);
    return () => clearInterval(pingInterval);
  }, [isConnected, wsRef]);

  return {
    wsRef,
    isConnected,
    isConnecting,
    connect,
    disconnect,
    reconnect,
  };
}
