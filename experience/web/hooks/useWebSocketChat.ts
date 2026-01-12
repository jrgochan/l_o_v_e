/**
 * WebSocket Chat Hook
 *
 * Manages WebSocket connection for real-time emotional chat
 * Refactored to use sub-hooks for better maintainability.
 */

import { useState } from "react";
import type {
  ServerMessage,
  ToneMode,
  InsightData,
  VAC,
  DeepFeelingServerMessage,
  AggregateState,
  EmotionProminence,
  RelationshipType,
  ProsodyData,
  ThreeWayAnalysis,
} from "@/types/chat";
import { useWebSocketMessageHandler } from "./websocket/useWebSocketMessageHandler";
import { useWebSocketConnection } from "./websocket/useWebSocketConnection";
import { useWebSocketSender } from "./websocket/useWebSocketSender";

export interface UseWebSocketChatOptions {
  sessionId: string;
  enabled?: boolean; // Whether to connect (default: true)
  deepFeelingEnabled?: boolean; // Deep Feeling mode (default: false)
  onMessage?: (message: ServerMessage | DeepFeelingServerMessage) => void;
  onTranscription?: (text: string) => void;
  onAnalysis?: (emotion: string, category: string, vac: VAC, confidence: number) => void;
  onProsody?: (data: ProsodyData) => void;
  onInsight?: (insights: InsightData) => void;
  onError?: (error: string) => void;
  // New: Deep Feeling callbacks
  onMultiEmotion?: (
    emotion: string,
    category: string,
    vac: VAC,
    confidence: number,
    prominence: EmotionProminence
  ) => void;
  onRelationship?: (
    emotionA: string,
    emotionB: string,
    type: RelationshipType,
    strength: number,
    description: string
  ) => void;
  onAggregateState?: (state: AggregateState) => void;
  onThreeWayAnalysis?: (data: ThreeWayAnalysis) => void;
  // New: Progress tracking callback
  onProgressUpdate?: (
    stage: string,
    status: string,
    message: string,
    percentage: number,
    elapsed_ms?: number
  ) => void;
  autoReconnect?: boolean;
}

export interface UseWebSocketChatReturn {
  isConnected: boolean;
  isConnecting: boolean;
  sendMessage: (content: string, tonePreference: ToneMode, deepFeelingEnabled?: boolean) => void;
  sendAudio: (audioData: string, tonePreference: ToneMode, deepFeelingEnabled?: boolean) => void;
  updateTonePreference: (tone: ToneMode) => void;
  updateDeepFeelingMode: (enabled: boolean) => void;
  disconnect: () => void;
  reconnect: () => void;
  error: string | null;
}

export function useWebSocketChat(options: UseWebSocketChatOptions): UseWebSocketChatReturn {
  const [error, setError] = useState<string | null>(null);

  // 1. Message Handler Hook
  const { handleMessage } = useWebSocketMessageHandler({
    ...options,
    setError,
  });

  // 2. Connection Hook
  const { wsRef, isConnected, isConnecting, disconnect, reconnect } = useWebSocketConnection({
    sessionId: options.sessionId,
    enabled: options.enabled,
    autoReconnect: options.autoReconnect,
    onMessage: handleMessage,
    onError: options.onError,
    setError,
  });

  // 3. Sender Hook
  const { sendMessage, sendAudio, updateTonePreference, updateDeepFeelingMode } =
    useWebSocketSender({
      wsRef,
      setError,
    });

  return {
    isConnected,
    isConnecting,
    sendMessage,
    sendAudio,
    updateTonePreference,
    updateDeepFeelingMode,
    disconnect,
    reconnect,
    error,
  };
}
