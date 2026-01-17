/**
 * Chat Message List Component
 *
 * Renders the list of chat messages with auto-scroll behavior.
 * Extracted from ChatPanel.tsx to improve modularity.
 */

"use client";

import { InsightCard } from "../shared/InsightCard";
import { EmotionChipCluster } from "../emotion-display/EmotionChipCluster";
import { AnalysisProgressIndicator } from "../shared/AnalysisProgressIndicator";
import type { DisplayMessage } from "@/hooks/chat/useChatMessages";
import type { ToneMode, ProgressStage, DetectedEmotion } from "@/types/chat";
import { logger } from "@/utils/logger";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface ChatMessageListProps {
  messages: DisplayMessage[];
  showProgress: boolean;
  progressState: {
    stages: ProgressStage[];
    currentStage: string;
    overallPercentage: number;
    currentMessage: string;
  };
  toneMode: ToneMode;
  deepFeelingMode: boolean;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onEmotionClick?: (emotion: string) => void;
}

export function ChatMessageList({
  messages,
  showProgress,
  progressState,
  toneMode,
  deepFeelingMode,
  messagesEndRef,
  onEmotionClick,
}: ChatMessageListProps) {
  const theme = useAdminTheme();
  return (
    <div className="flex-1 overflow-y-auto space-y-3">
      {messages.length === 0 && (
        <div className={`text-center py-8 ${theme.colors.text.muted}`}>
          <p className="text-lg mb-2">👋 How are you feeling?</p>
          <p className="text-sm">Type or record a message to start</p>
        </div>
      )}

      {messages.map((msg) => (
        <div
          key={msg.id}
          className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
        >
          {/* Insight messages use InsightCard */}
          {msg.type === "insight" && msg.insights ? (
            <div className="max-w-2xl w-full">
              <InsightCard
                insights={msg.insights}
                toneMode={toneMode}
                deepFeelingMode={deepFeelingMode}
                maxHeight={600}
                onEmotionClick={onEmotionClick}
              />
            </div>
          ) : (
            <div
              className={`max-w-[70%] rounded-lg px-4 py-3 ${
                msg.type === "user"
                  ? "bg-cyan-600 text-white"
                  : msg.type === "analysis" || msg.type === "multi_emotion"
                    ? `bg-purple-900/50 border border-purple-500/30 text-white`
                    : `bg-white/5 ${theme.colors.text.secondary} border ${theme.colors.border}`
              }`}
            >
              {/* Message Content */}
              <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

              {/* Multi-Emotion Display */}
              {msg.type === "multi_emotion" && msg.multiEmotionData && (
                <div className="mt-2 pt-2 border-t border-purple-500/30">
                  <EmotionChipCluster
                    emotions={msg.multiEmotionData.emotions}
                    onEmotionClick={(emotion: DetectedEmotion | string) => {
                      logger.debug("user-interaction", "Emotion chip clicked", emotion);
                      const emotionName =
                        typeof emotion === "string" ? emotion : emotion.emotion_name;
                      if (emotionName) {
                        onEmotionClick?.(emotionName);
                      }
                    }}
                  />
                </div>
              )}

              {/* Single Emotion Analysis Details */}
              {msg.type === "analysis" && msg.vac && !msg.multiEmotionData && (
                <div className="mt-2 pt-2 border-t border-purple-500/30 text-xs space-y-1">
                  <div className="flex justify-between gap-4">
                    <span className="text-purple-300">Valence:</span>
                    <span className="font-mono">{msg.vac.valence.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-purple-300">Arousal:</span>
                    <span className="font-mono">{msg.vac.arousal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-purple-300">Connection:</span>
                    <span className="font-mono">{msg.vac.connection.toFixed(2)}</span>
                  </div>
                  {msg.confidence && (
                    <div className="flex justify-between gap-4 mt-1 pt-1 border-t border-purple-500/20">
                      <span className="text-purple-300">Confidence:</span>
                      <span className="font-mono">{(msg.confidence * 100).toFixed(0)}%</span>
                    </div>
                  )}
                </div>
              )}

              {/* Timestamp */}
              <div className="text-xs opacity-70 mt-2">{msg.timestamp.toLocaleTimeString()}</div>
            </div>
          )}
        </div>
      ))}

      {/* Progress Indicator */}
      {showProgress && (
        <div className="flex justify-start">
          <AnalysisProgressIndicator
            stages={progressState.stages}
            currentStage={progressState.currentStage}
            overallPercentage={progressState.overallPercentage}
            currentMessage={progressState.currentMessage}
            toneMode={toneMode}
            deepFeelingMode={deepFeelingMode}
          />
        </div>
      )}

      {/* Auto-scroll anchor */}
      <div ref={messagesEndRef} />
    </div>
  );
}
