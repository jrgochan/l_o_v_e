/**
 * Chat Drawer Component
 *
 * Bottom sliding panel for emotional analysis chat
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { useWebSocketChat } from "@/hooks/useWebSocketChat";
import type {
  ToneMode,
  DeepFeelingServerMessage,
  InsightData,
  VAC,
  DisplayMessage,
  MessageRelationship,
} from "@/types/chat";
import { logger } from "@/utils/logger";
import { ThreadView } from "./ThreadView";
import { AutoLinkIndicator } from "./AutoLinkIndicator";
import { VoiceChat } from "./VoiceChat";

interface ChatDrawerProps {
  isOpen: boolean;
  onToggle: () => void;
  sessionId: string;
}

export function ChatDrawer({ isOpen, onToggle, sessionId }: ChatDrawerProps) {
  const [height, setHeight] = useState(400);
  const [isResizing, setIsResizing] = useState(false);
  const [chatMode, setChatMode] = useState<"text" | "voice">("text");
  const [toneMode, setToneMode] = useState<ToneMode>("warm");
  const [inputText, setInputText] = useState("");
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const startHeightRef = useRef(400);

  // WebSocket connection - conditionally enabled based on isOpen
  const {
    isConnected,
    isConnecting,
    sendMessage,
    updateTonePreference,
    error: wsError,
  } = useWebSocketChat({
    sessionId,
    enabled: isOpen, // Only connect when drawer is open
    onMessage: (message: DeepFeelingServerMessage) => {
      logger.debug("websocket", "Chat message received", message);

      if (message.type === "message_received") {
        setIsProcessing(true);
      }
    },
    onTranscription: (text: string) => {
      const timestamp = new Date();
      addMessage({
        id: timestamp.getTime().toString(),
        type: "transcription",
        content: text,
        timestamp,
      });
    },
    onAnalysis: (
      emotion: string,
      category: string,
      vac: VAC,
      confidence: number,
      originalEmotion?: string,
      matchMethod?: string,
      matchConfidence?: number
    ) => {
      const timestamp = new Date();
      addMessage({
        id: timestamp.getTime().toString(),
        type: "analysis",
        content: `Detected: ${emotion}${originalEmotion && originalEmotion !== emotion ? ` (mapped from "${originalEmotion}")` : ""}`,
        emotion,
        category,
        vac,
        confidence,
        originalEmotion,
        matchMethod,
        matchConfidence,
        timestamp,
      });
    },
    onInsight: (insights: InsightData) => {
      const timestamp = new Date();
      addMessage({
        id: timestamp.getTime().toString(),
        type: "insight",
        content: insights.summary,
        insights,
        strategies: insights.strategies,
        timestamp,
      });
      setIsProcessing(false);
    },
    onError: (error: string) => {
      logger.error("websocket", "Chat error", error);
      setIsProcessing(false);
    },
    onMessageRelationship: (relationship: MessageRelationship) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === relationship.source_message_id
            ? { ...msg, relationships: [...(msg.relationships || []), relationship] }
            : msg
        )
      );
    },
  });

  const addMessage = (message: DisplayMessage) => {
    setMessages((prev) => [...prev, message]);
  };

  // Map current tone mode to PersonaPlex persona
  const getPersonaId = (): "lumina" | "logos" | "metis" => {
    if (toneMode === "warm") return "lumina";
    if (toneMode === "clinical") return "logos";
    return "metis"; // Default fallback
  };

  const getPersonaConfig = () => {
    const personas = {
      lumina: { color: "#F59E0B", description: "Warm, empathetic, validating" },
      logos: { color: "#06B6D4", description: "Clinical, analytical, objective" },
      metis: { color: "#8B5CF6", description: "Deep, insightful, multi-dimensional" },
    };
    return personas[getPersonaId()];
  };

  const handleSend = () => {
    if (!inputText.trim() || !isConnected) return;

    // Add user message to display
    const timestamp = new Date();
    addMessage({
      id: timestamp.getTime().toString(),
      type: "user",
      content: inputText,
      timestamp,
    });

    // Send via WebSocket
    sendMessage(inputText, toneMode);
    setInputText("");
  };

  const handleToneToggle = () => {
    const newTone = toneMode === "warm" ? "clinical" : "warm";
    setToneMode(newTone);
    updateTonePreference(newTone);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    startYRef.current = e.clientY;
    startHeightRef.current = height;
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();

      const deltaY = startYRef.current - e.clientY;
      const newHeight = Math.max(200, Math.min(600, startHeightRef.current + deltaY));
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.style.cursor = "auto";
      document.body.style.userSelect = "auto";
    };

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isResizing]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Show button when closed
  if (!isOpen) {
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-4 right-4 z-50 px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full shadow-lg transition flex items-center gap-2"
      >
        <span>💬</span>
        <span>Chat</span>
      </button>
    );
  }

  // Show drawer when open
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 bg-gray-900/98 backdrop-blur-sm border-t border-gray-700 flex flex-col"
      style={{ height: `${height}px` }}
    >
      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        data-testid="resize-handle"
        className={`w-full h-2 cursor-row-resize hover:bg-cyan-500/30 transition flex items-center justify-center ${
          isResizing ? "bg-cyan-500/50" : ""
        }`}
      >
        <div className="w-12 h-1 bg-gray-600 rounded-full" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-white">Emotional Chat</h3>

          {/* Connection Status */}
          <div className="flex items-center gap-2 text-sm">
            {isConnecting && (
              <span className="text-yellow-400 flex items-center gap-1">
                <div className="animate-spin h-3 w-3 border-2 border-yellow-400 border-t-transparent rounded-full" />
                Connecting...
              </span>
            )}
            {isConnected && (
              <span className="text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Connected
              </span>
            )}
            {wsError && <span className="text-red-400">⚠️ {wsError}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Toggle */}
          <button
            onClick={() => setChatMode(chatMode === "text" ? "voice" : "text")}
            className={`px-4 py-2 rounded text-sm font-medium transition ${
              chatMode === "voice"
                ? "bg-purple-600 text-white"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title={`Switch to ${chatMode === "text" ? "voice" : "text"} mode`}
          >
            {chatMode === "voice" ? "🎙️ Voice" : "💬 Text"}
          </button>

          {/* Tone Toggle (only in text mode) */}
          {chatMode === "text" && (
            <button
              onClick={handleToneToggle}
              className={`px-4 py-2 rounded text-sm font-medium transition ${
                toneMode === "clinical" ? "bg-blue-600 text-white" : "bg-amber-600 text-white"
              }`}
              title={`Switch to ${toneMode === "clinical" ? "warm" : "clinical"} mode`}
            >
              {toneMode === "clinical" ? "🔬 Clinical" : "💗 Warm"}
            </button>
          )}

          {/* Close Button */}
          <button
            onClick={onToggle}
            className="px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded transition"
          >
            ▼ Close
          </button>
        </div>
      </div>

      {/* Conditional Content: Voice Mode or Text Mode */}
      {chatMode === "voice" ? (
        <VoiceChat
          personaId={getPersonaId()}
          personaColor={getPersonaConfig().color}
          personaDescription={getPersonaConfig().description}
        />
      ) : (
        <>
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-8">
                <p className="text-lg mb-2">👋 How are you feeling?</p>
                <p className="text-sm">Type a message or record your voice to start</p>
              </div>
            )}

            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg px-4 py-3 ${
                    msg.type === "user"
                      ? "bg-cyan-600 text-white"
                      : msg.type === "analysis"
                        ? "bg-purple-900/50 border border-purple-500/30 text-white"
                        : msg.type === "insight"
                          ? "bg-gray-800 border border-gray-600 text-white"
                          : "bg-gray-700 text-gray-200"
                  }`}
                >
                  {/* Message Content */}
                  <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                  {/* Analysis Details */}
                  {msg.type === "analysis" && msg.vac && (
                    <div className="mt-2 pt-2 border-t border-purple-500/30 text-xs space-y-1">
                      <div className="flex justify-between">
                        <span className="text-purple-300">Valence:</span>
                        <span className="font-mono">{msg.vac.valence.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Arousal:</span>
                        <span className="font-mono">{msg.vac.arousal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-purple-300">Connection:</span>
                        <span className="font-mono">{msg.vac.connection.toFixed(2)}</span>
                      </div>
                      {msg.confidence && (
                        <div className="flex justify-between mt-1 pt-1 border-t border-purple-500/20">
                          <span className="text-purple-300">Confidence:</span>
                          <span className="font-mono">{(msg.confidence * 100).toFixed(0)}%</span>
                        </div>
                      )}
                      {msg.matchMethod && msg.matchMethod !== "exact" && (
                        <div className="flex justify-between text-purple-400/80 italic">
                          <span>Mapping:</span>
                          <span>
                            {msg.matchMethod} ({((msg.matchConfidence || 0) * 100).toFixed(0)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Timestamp */}
                  <div className="text-xs opacity-70 mt-2">
                    {msg.timestamp.toLocaleTimeString()}
                  </div>

                  {/* Auto-Linking Indicator */}
                  {msg.relationships && msg.relationships.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-cyan-500/20">
                      <AutoLinkIndicator
                        relationships={msg.relationships}
                        onRelationshipClick={(rel) => setActiveThreadId(rel.target_message_id)}
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex justify-start">
                <div className="bg-gray-800 rounded-lg px-4 py-3 flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-cyan-400 border-t-transparent rounded-full" />
                  <span className="text-sm text-gray-300">Analyzing...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-700 p-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="How are you feeling?"
                disabled={!isConnected}
                className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
              />

              <button
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition disabled:opacity-50"
                disabled={!isConnected}
                title="Voice recording (coming soon)"
              >
                🎤
              </button>

              <button
                onClick={handleSend}
                disabled={!inputText.trim() || !isConnected}
                className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Send
              </button>
            </div>
          </div>
        </>
      )}
      {/* Thread View Overlay */}
      {activeThreadId && (
        <ThreadView
          rootMessageId={activeThreadId}
          onClose={() => setActiveThreadId(null)}
          toneMode={toneMode}
          deepFeelingMode={true} // Always enable deep feeling visualization in threads
        />
      )}
    </div>
  );
}
