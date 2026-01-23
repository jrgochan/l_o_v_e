"use client";

import { useState, useEffect, useRef } from "react";
import { ChatMessageList } from "./ChatMessageList";
import type { DisplayMessage, ToneMode } from "@/types/chat";
import { logger } from "@/utils/logger";
import { api } from "@/utils/api";

interface ThreadViewProps {
  rootMessageId: string;
  onClose: () => void;
  toneMode: ToneMode;
  deepFeelingMode: boolean;
}

export function ThreadView({ rootMessageId, onClose, toneMode, deepFeelingMode }: ThreadViewProps) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchThread() {
      try {
        setLoading(true);
        // Use centralized API client which handles auth and base URL
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await api.get<any[]>(
          `observer/chat/messages/${rootMessageId}/thread?limit=20`
        );

        // Transform dates
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const parsedMessages = data.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));

        setMessages(parsedMessages);
      } catch (err) {
        logger.error("api", "Failed to fetch thread", err);
        setError("Could not load thread context.");
      } finally {
        setLoading(false);
      }
    }

    if (rootMessageId) {
      fetchThread();
    }
  }, [rootMessageId]);

  return (
    <div className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-md flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-cyan-400">🧵</span>
          <h3 className="text-lg font-semibold text-white">Thread Context</h3>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-800 rounded-full text-gray-400 hover:text-white transition"
        >
          ✕
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-400">{error}</div>
        ) : (
          <div className="h-full overflow-y-auto px-4 py-4">
            <ChatMessageList
              messages={messages}
              showProgress={false}
              progressState={{
                stages: [],
                currentStage: "",
                overallPercentage: 0,
                currentMessage: "",
              }}
              toneMode={toneMode}
              deepFeelingMode={deepFeelingMode}
              messagesEndRef={messagesEndRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}
