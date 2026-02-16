/**
 * Viewer Shortcuts Component
 *
 * Displays a subtle list of keyboard shortcuts in the bottom-left corner.
 */

"use client";

import { useEffect, useState } from "react";

export function ViewerShortcuts() {
  const [visible, setVisible] = useState(true);

  // Auto-fade after 10 seconds of inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    const resetTimer = () => {
      setVisible(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setVisible(false), 8000);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keydown", resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keydown", resetTimer);
      clearTimeout(timeout);
    };
  }, []);

  return (
    <div
      className={`absolute bottom-6 left-6 z-40 transition-opacity duration-1000 ${
        visible ? "opacity-100" : "opacity-30 hover:opacity-100"
      }`}
    >
      <div className="text-[10px] text-gray-500 font-mono tracking-wider space-y-1.5 uppercase">
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">I</span>
          <span>Toggle HUD</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">M</span>
          <span>Toggle Audio</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">E</span>
          <span>Toggle Emotions</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">L</span>
          <span>Toggle Labels</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">P</span>
          <span>Toggle Paths</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">Space</span>
          <span>Play / Pause</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">V</span>
          <span>Visual Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">F</span>
          <span>Focus Mode</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">T</span>
          <span>Force Flyover</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">A</span>
          <span>Toggle Axis</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-8 text-right font-bold text-gray-400">⌘+K</span>
          <span>Cmd Palette</span>
        </div>
      </div>
    </div>
  );
}
