import { useRef, useEffect } from "react";
import { AnalysisProgressIndicator } from "../shared/AnalysisProgressIndicator";
import { InsightCard } from "../shared/InsightCard";
import { EmotionChipCluster } from "../emotion-display/EmotionChipCluster";
import type { DisplayMessage, ToneMode, ProgressStage } from "@/types/chat";
import { logger } from "@/utils/logger";

interface ChatMessagesProps {
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
  onEmotionClick: (emotion: string) => void;
}

export function ChatMessages({
  messages,
  showProgress,
  progressState,
  toneMode,
  deepFeelingMode,
  onEmotionClick,
}: ChatMessagesProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, showProgress]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex-1 overflow-y-auto space-y-3">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 py-8">
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
                  onEmotionClick={onEmotionClick}
                />
              </div>
            ) : (
              <div
                className={`max-w-[70%] rounded-lg px-4 py-3 ${
                  msg.type === "user"
                    ? "bg-cyan-600 text-white"
                    : msg.type === "analysis" || msg.type === "multi_emotion"
                      ? "bg-purple-900/50 border border-purple-500/30 text-white"
                      : "bg-gray-700 text-gray-200"
                }`}
              >
                {/* Message Content */}
                <div className="text-sm whitespace-pre-wrap">{msg.content}</div>

                {/* Multi-Emotion Display */}
                {msg.type === "multi_emotion" && msg.multiEmotionData && (
                  <div className="mt-2 pt-2 border-t border-purple-500/30">
                    <EmotionChipCluster
                      emotions={msg.multiEmotionData.emotions}
                      onEmotionClick={(emotion) => {
                        logger.debug("user-interaction", "Emotion chip clicked", emotion);
                        onEmotionClick(emotion);
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

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
