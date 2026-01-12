import { useEffect, useRef, useState, useCallback } from "react";
import { logger } from "@/utils/logger";
import { CHANNEL_NAME, SphereStateMessage, SyncMode } from "./types";

interface TransportOptions {
  mode: SyncMode;
  onMessage?: (msg: SphereStateMessage) => void;
}

export function useSyncTransport({ mode, onMessage }: TransportOptions) {
  const channelRef = useRef<BroadcastChannel | null>(null);
  const lastMessageRef = useRef<number>(0);
  const [isConnected, setIsConnected] = useState(true);

  // Use ref for callback to make it stable
  const callbackRef = useRef(onMessage);
  useEffect(() => {
    callbackRef.current = onMessage;
  }, [onMessage]);

  const sendMessage = useCallback((message: SphereStateMessage) => {
    try {
      // 1. BroadcastChannel
      if (channelRef.current) {
        channelRef.current.postMessage(message);
      }
      // 2. LocalStorage Fallback
      try {
        localStorage.setItem(CHANNEL_NAME, JSON.stringify(message));
      } catch {
        // Ignore
      }
    } catch (err) {
      logger.error("websocket", "[SYNC] Transmit failed", err);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Storage Sync Logic
    const handleStorage = (e: StorageEvent | { key: string; newValue: string | null }) => {
      if (mode === "listener" && e.key === CHANNEL_NAME && e.newValue) {
        try {
          const msg = JSON.parse(e.newValue);
          if (msg.timestamp > lastMessageRef.current) {
            lastMessageRef.current = msg.timestamp;
            callbackRef.current?.(msg);
          }
        } catch (err) {
          logger.error("websocket", "[SYNC] Storage parse error", err);
        }
      }
    };

    const eventHandler = (e: StorageEvent) => handleStorage(e);
    window.addEventListener("storage", eventHandler);

    // 2. Polling (Triple Redundancy)
    const pollInterval = setInterval(() => {
      if (mode === "listener") {
        const raw = localStorage.getItem(CHANNEL_NAME);
        if (raw) {
          handleStorage({ key: CHANNEL_NAME, newValue: raw });
        }
      }
    }, 1000);

    // 3. BroadcastChannel
    try {
      if (typeof BroadcastChannel !== "undefined") {
        channelRef.current = new BroadcastChannel(CHANNEL_NAME);
        logger.info("websocket", `[SYNC] ${mode} initialized (BC)`);

        if (mode === "listener") {
          channelRef.current.onmessage = (event) => {
            const msg = event.data;
            lastMessageRef.current = msg.timestamp;
            callbackRef.current?.(msg);
          };
        }
      } else {
        logger.warn("websocket", "[SYNC] BC not supported, using Storage fallback");
      }
    } catch (error) {
      logger.warn("websocket", "[SYNC] BC init failed, using Storage fallback", error);
    }

    return () => {
      window.removeEventListener("storage", eventHandler);
      clearInterval(pollInterval);
      channelRef.current?.close();
      setIsConnected(false);
    };
  }, [mode]);

  return { sendMessage, isConnected, lastMessageTime: lastMessageRef.current };
}
