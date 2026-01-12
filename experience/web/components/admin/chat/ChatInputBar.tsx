/**
 * Chat Input Bar Component
 *
 * Input controls for text and voice messages.
 * Extracted from ChatPanel.tsx to improve modularity.
 */

"use client";

interface ChatInputBarProps {
  inputText: string;
  isConnected: boolean;
  onInputChange: (text: string) => void;
  onSend: () => void;
  onVoiceRecord: () => void;
}

export function ChatInputBar({
  inputText,
  isConnected,
  onInputChange,
  onSend,
  onVoiceRecord,
}: ChatInputBarProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputText.trim() && isConnected) {
      onSend();
    }
  };

  return (
    <div className="border-t border-gray-700 p-4 bg-gray-900">
      <div className="flex items-center gap-2 max-w-6xl mx-auto">
        <input
          type="text"
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="How are you feeling?"
          disabled={!isConnected}
          className="flex-1 px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
        />

        <button
          onClick={onVoiceRecord}
          className="px-4 py-3 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg transition disabled:opacity-50"
          disabled={!isConnected}
          title="Record voice message"
        >
          🎤
        </button>

        <button
          onClick={onSend}
          disabled={!inputText.trim() || !isConnected}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          Send
        </button>
      </div>
    </div>
  );
}
