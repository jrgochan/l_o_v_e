/**
 * Custom hook for managing chat messages
 *
 * Handles message state, adding/clearing messages, and auto-scroll behavior.
 * Extracted from ChatPanel.tsx to reduce complexity.
 *
 * @example
 * ```tsx
 * const { messages, addMessage, clearMessages, messagesEndRef } = useChatMessages();
 *
 * // Add a message
 * addMessage({
 *   id: '123',
 *   type: 'user',
 *   content: 'Hello',
 *   timestamp: new Date()
 * });
 * ```
 *
 * @returns Object containing messages array and message management functions
 */

import { useState, useRef, useEffect } from "react";
import type { InsightData, VAC, MultiEmotionAnalysis } from "@/types/chat";

export interface DisplayMessage {
  id: string;
  type: "user" | "analysis" | "insight" | "transcription" | "multi_emotion";
  content: string;
  timestamp: Date;
  emotion?: string;
  category?: string;
  vac?: VAC;
  confidence?: number;
  insights?: InsightData;
  multiEmotionData?: MultiEmotionAnalysis;
}

export function useChatMessages(isExpanded: boolean) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Add a new message to the chat
   */
  const addMessage = (message: DisplayMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  /**
   * Clear all messages
   */
  const clearMessages = () => {
    setMessages([]);
  };

  /**
   * Auto-scroll to bottom when new messages arrive
   */
  useEffect(() => {
    if (isExpanded) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isExpanded]);

  return {
    messages,
    addMessage,
    clearMessages,
    messagesEndRef,
  };
}
