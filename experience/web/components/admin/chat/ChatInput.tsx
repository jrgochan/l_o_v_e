import { VoiceRecorder } from "../shared/VoiceRecorder";
import { useState } from "react";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface ChatInputProps {
  inputText: string;
  setInputText: (text: string) => void;
  onSend: () => void;
  onSendAudio: (text: string) => void;
  isConnected: boolean;
  isProcessing: boolean;
}

export function ChatInput({
  inputText,
  setInputText,
  onSend,
  onSendAudio,
  isConnected,
  isProcessing,
}: ChatInputProps) {
  const theme = useAdminTheme();
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);

  return (
    <div className={`p-4 border-t ${theme.colors.border} ${theme.colors.background}`}>
      <div className="flex items-center gap-2 max-w-6xl mx-auto">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && onSend()}
          placeholder="How are you feeling?"
          disabled={!isConnected}
          className={`flex-1 px-4 py-3 bg-white/5 border ${theme.colors.border} rounded-lg ${theme.colors.text.primary} placeholder-gray-400 focus:outline-none focus:border-cyan-500 disabled:opacity-50`}
        />

        <button
          onClick={() => setShowVoiceRecorder(true)}
          className="px-4 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg transition disabled:opacity-50"
          disabled={!isConnected}
          title="Record voice message"
        >
          🎤
        </button>

        <button
          onClick={onSend}
          disabled={!inputText.trim() || isProcessing}
          className="p-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <svg
              className="animate-spin h-5 w-5 text-white"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
          ) : (
            "Send"
          )}
        </button>
      </div>

      {/* Voice Recorder Modal */}
      <VoiceRecorder
        isOpen={showVoiceRecorder}
        onClose={() => setShowVoiceRecorder(false)}
        onSend={(text) => {
          if (text.trim() && !isProcessing) {
            onSendAudio(text.trim());
            setShowVoiceRecorder(false);
          }
        }}
      />
    </div>
  );
}
