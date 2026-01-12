const OBSERVER_WS_URL = process.env.NEXT_PUBLIC_OBSERVER_WS_URL || "ws://localhost:8000";

/**
 * Construct the WebSocket URL with token authentication
 */
export const constructWebSocketUrl = (sessionId: string, token: string | null): string => {
  const wsUrl = `${OBSERVER_WS_URL}/observer/ws/chat/${sessionId}`;
  return token ? `${wsUrl}?token=${token}` : wsUrl;
};

/**
 * Handle WebSocket reconnection logic
 */
export const scheduleReconnect = (
  reconnectAttempts: number,
  maxAttempts: number,
  connectFn: () => void,
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>,
  onError: ((error: string) => void) | undefined,
  setError: (error: string | null) => void
): void => {
  const reconnectDelay = 2000;

  if (reconnectAttempts < maxAttempts) {
    timeoutRef.current = setTimeout(() => {
      connectFn();
    }, reconnectDelay * reconnectAttempts);
  } else {
    const errorMsg = "Failed to reconnect after multiple attempts";
    setError(errorMsg);
    onError?.(errorMsg);
  }
};

interface ConnectionCallbacks {
  onOpen: () => void;
  onMessage: (event: MessageEvent) => void;
  onError: (event: Event) => void;
  onClose: (event: CloseEvent) => void;
}

/**
 * Create and configure WebSocket instance
 */
export const createWebSocketConnection = (
  url: string,
  callbacks: ConnectionCallbacks
): WebSocket => {
  const ws = new WebSocket(url);
  ws.onopen = callbacks.onOpen;
  ws.onmessage = callbacks.onMessage;
  ws.onerror = callbacks.onError;
  ws.onclose = callbacks.onClose;
  return ws;
};

interface CloseHandlerOptions {
  autoReconnect: boolean;
  maxAttempts: number;
  reconnectAttempts: React.MutableRefObject<number>;
  timeoutRef: React.MutableRefObject<NodeJS.Timeout | null>;
  connectFn: () => void;
  setError: (error: string | null) => void;
  onError?: (error: string) => void;
}

/**
 * Handle WebSocket close event
 */
export const handleSocketClose = (
  event: CloseEvent,
  options: CloseHandlerOptions,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  logger: any // Using explicit logger import in hook usually, but passing here
): void => {
  if (options.autoReconnect && event.code !== 1000) {
    options.reconnectAttempts.current++;
    logger.info("websocket", `Reconnecting...`, {
      attempt: options.reconnectAttempts.current,
      max: options.maxAttempts,
    });

    scheduleReconnect(
      options.reconnectAttempts.current,
      options.maxAttempts,
      options.connectFn,
      options.timeoutRef,
      options.onError,
      options.setError
    );
  }
};
