import { useRef, useEffect } from "react";
import { ChatMessageList } from "./ChatMessageList";
import type { DisplayMessage, ToneMode, ProgressStage } from "@/types/chat";

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
      <ChatMessageList
        messages={messages}
        showProgress={showProgress}
        progressState={progressState}
        toneMode={toneMode}
        deepFeelingMode={deepFeelingMode}
        messagesEndRef={messagesEndRef}
        onEmotionClick={onEmotionClick}
      />
    </div>
  );
}
