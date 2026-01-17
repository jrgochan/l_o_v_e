import { Toggle, ToggleGroup } from "@/components/ui/Toggle";
import type { ToneMode } from "@/types/chat";
import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface ChatHeaderProps {
  isExpanded: boolean;
  isFullscreen: boolean;
  isConnecting: boolean;
  isConnected: boolean;
  wsError: string | null;
  toneMode: ToneMode;
  useAtlasMapping: boolean;
  deepFeelingMode: boolean;
  onToggleExpand: () => void;
  onToggleFullscreen: () => void;
  onToneModeChange: (checked: boolean) => void;
  onUseAtlasMappingChange: (checked: boolean) => void;
  onDeepFeelingModeChange: (checked: boolean) => void;
}

export function ChatHeader({
  isExpanded,
  isFullscreen,
  isConnecting,
  isConnected,
  wsError,
  toneMode,
  useAtlasMapping,
  deepFeelingMode,
  onToggleExpand,
  onToggleFullscreen,
  onToneModeChange,
  onUseAtlasMappingChange,
  onDeepFeelingModeChange,
}: ChatHeaderProps) {
  const theme = useAdminTheme();
  return (
    <div
      className={`flex items-center justify-between px-6 py-3 border-b ${theme.colors.border} ${theme.colors.background}`}
    >
      <div className="flex items-center gap-4">
        {/* Expand/Collapse Button */}
        <button
          onClick={onToggleExpand}
          className={`text-white hover:text-cyan-400 transition text-lg`}
          title={isExpanded ? "Collapse chat" : "Expand chat"}
        >
          {isExpanded ? "▼" : "▲"}
        </button>

        <h3
          className={`text-lg font-semibold ${theme.colors.text.primary} flex items-center gap-2`}
        >
          💬 Emotional Chat
        </h3>

        {/* Connection Status - Only show when expanded */}
        {isExpanded && (
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
            {wsError && <span className="text-red-400 text-xs">⚠️ {wsError}</span>}
          </div>
        )}
      </div>

      {/* Controls - Only show when expanded */}
      {isExpanded && (
        <div className="flex items-center gap-4">
          {/* Fullscreen Toggle */}
          <button
            onClick={onToggleFullscreen}
            className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm transition"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen mode"}
          >
            {isFullscreen ? "⊡" : "⛶"}
          </button>

          {/* Toggle Group */}
          <ToggleGroup className="flex-row gap-3">
            {/* Tone Mode Toggle */}
            <Toggle
              checked={toneMode === "clinical"}
              onChange={onToneModeChange}
              leftLabel="💗 Warm"
              rightLabel="🔬 Clinical"
              tooltip="Switch between warm, empathetic responses and clinical, technical analysis"
            />

            {/* Atlas Mapping Toggle */}
            <Toggle
              checked={useAtlasMapping}
              onChange={onUseAtlasMappingChange}
              leftLabel="🤖 AI"
              rightLabel="🎯 Atlas"
              tooltip="Use AI emotion detection or map to Atlas definitions"
            />

            {/* Deep Feeling Mode Toggle */}
            <Toggle
              checked={deepFeelingMode}
              onChange={onDeepFeelingModeChange}
              leftLabel="🎯 Single"
              rightLabel="🌊 Deep"
              tooltip="Analyze multiple emotions and their relationships (slower but richer)"
            />
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
