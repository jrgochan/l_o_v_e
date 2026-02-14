/**
 * Chat Layout Component
 *
 * Handles overall layout structure with collapsed/expanded/fullscreen states.
 * Extracted from ChatPanel.tsx to improve modularity.
 */

"use client";

import { useAdminTheme } from "@/hooks/admin/useAdminTheme";

interface ChatLayoutProps {
  isExpanded: boolean;
  isFullscreen: boolean;
  height: number;
  isResizing: boolean;
  children: React.ReactNode;
  onToggleExpand: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}

export function ChatLayout({
  isExpanded,
  isFullscreen,
  height,
  isResizing,
  children,
  onToggleExpand,
  onMouseDown,
}: ChatLayoutProps) {
  const theme = useAdminTheme();
  return (
    <div
      className={`fixed ${isFullscreen ? "inset-0 z-50" : "bottom-0 left-0 right-0 z-40"} backdrop-blur-sm border-t-2 border-cyan-500/50 shadow-[0_-4px_20px_rgba(6,182,212,0.3)] flex flex-col transition-all duration-300 ${theme.colors.background}`}
      style={{ height: isFullscreen ? "100vh" : `${height}px` }}
    >
      {/* Resize Handle - Only active when expanded */}
      {isExpanded && (
        <div
          onMouseDown={onMouseDown}
          className={`w-full h-2 cursor-row-resize hover:bg-cyan-500/30 transition flex items-center justify-center ${
            isResizing ? "bg-cyan-500/50" : ""
          }`}
        >
          <div className={`w-12 h-1 rounded-full ${theme.colors.border}`} />
        </div>
      )}

      {/* Content */}
      {isExpanded ? (
        <div className="flex-1 flex flex-col overflow-hidden">{children}</div>
      ) : (
        <button
          onClick={onToggleExpand}
          className={`flex-1 flex items-center justify-center text-sm transition cursor-pointer ${theme.colors.text.muted} hover:${theme.colors.text.secondary} ${theme.colors.hover}`}
        >
          <span>Click here or press ▲ to open chat and analyze your emotions</span>
        </button>
      )}
    </div>
  );
}
