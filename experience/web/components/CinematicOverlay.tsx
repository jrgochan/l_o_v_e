/**
 * Cinematic Overlay Component
 *
 * Displays the currently active emotion(s) in a beautiful, cinematic style.
 * Also handles the "Enable Audio" prompt and waiting state.
 */

"use client";

import { useEffect, useState } from "react";
import type { AtlasEmotion } from "@/types";
import { CATEGORY_COLORS } from "@/types";

interface Props {
  activeEmotions: AtlasEmotion[];
  isWaiting: boolean;
  hasAudioEnabled: boolean;
  onEnableAudio: () => void;
  visible: boolean;
}

export function CinematicOverlay({
  activeEmotions,
  isWaiting,
  hasAudioEnabled,
  onEnableAudio,
  visible,
}: Props) {
  const [displayText, setDisplayText] = useState(""); // For legacy/cinematic mode string
  const [fadeState, setFadeState] = useState<"in" | "out">("out");

  // Threshold for switching to grid view
  const GRID_THRESHOLD = 5;
  const isGridMode = activeEmotions.length >= GRID_THRESHOLD;

  // Handle text updates with fade transition (Only used for small numbers)
  useEffect(() => {
    if (isWaiting) {
      if (displayText !== "Waiting for Session...") {
        setTimeout(() => setFadeState("out"), 0);
        setTimeout(() => {
          setDisplayText("Waiting for Session...");
          setFadeState("in");
        }, 500);
      }
      return;
    }

    // For grid mode, we don't use this text effect for the list itself, but maybe for a title?
    // Actually, we can just let the grid render directly.
    // But for consistency, let's keep the cinematic text for small numbers.
    if (!isGridMode) {
      const newText = activeEmotions.map(e => e.name).join(" + ");
      if (newText !== displayText) {
        setTimeout(() => setFadeState("out"), 0);
        setTimeout(() => {
          setDisplayText(newText);
          setFadeState("in");
        }, 500);
      }
    }
  }, [activeEmotions, isWaiting, displayText, isGridMode]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-40 transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Audio Enable Button (Clickable, pointer-events-auto) */}
      {!hasAudioEnabled && (
        <button
          onClick={onEnableAudio}
          className="pointer-events-auto mb-16 px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white tracking-widest uppercase text-sm transition-all duration-500 animate-pulse hover:animate-none z-50"
        >
          Enable Audio Experience
        </button>
      )}

      {/* Mode 1: Large Cinematic Text (Few Emotions) or Waiting State */}
      {(isWaiting || !isGridMode) && (
        <div
          className={`text-center transition-all duration-1000 transform ${fadeState === "in"
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95"
            }`}
        >
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-thin text-white tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)] max-w-4xl leading-tight">
            {displayText}
          </h1>
          <div className="mt-4 h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto" />

          {/* Context Subtitle */}
          {!isWaiting && activeEmotions.length > 0 && (
            <p className="mt-4 text-cyan-400/60 font-light tracking-widest text-sm uppercase">
              Current Connection
            </p>
          )}
        </div>
      )}

      {/* Mode 2: Beautiful Grid (Many Emotions) */}
      {!isWaiting && isGridMode && (
        <div className="w-full max-w-7xl max-h-[80vh] overflow-y-auto custom-scrollbar px-8 py-12 pointer-events-auto flex flex-col items-center">
          <div className="flex flex-wrap justify-center gap-3 shrink-0">
            {activeEmotions.map((emotion) => {
              const color = CATEGORY_COLORS[emotion.category] || "#888888";
              return (
                <div
                  key={emotion.id}
                  className="group relative bg-black/40 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 hover:bg-white/10 transition-all duration-300 hover:scale-110 cursor-default"
                  style={{ borderColor: `${color}40` }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: color, color: color }}
                    />
                    <span className="text-gray-200 font-medium tracking-wide text-sm group-hover:text-white">
                      {emotion.name}
                    </span>

                    {/* Micro VAC Stats on Hover */}
                    <div className="w-0 overflow-hidden group-hover:w-auto group-hover:pl-2 transition-all duration-300 flex items-center opacity-0 group-hover:opacity-100">
                      <span className="text-[9px] font-mono text-white/50 space-x-1">
                        <span className={emotion.vac[0] > 0 ? "text-green-400" : "text-red-400"}>V{emotion.vac[0].toFixed(1)}</span>
                        <span className={emotion.vac[1] > 0 ? "text-yellow-400" : "text-blue-400"}>A{emotion.vac[1].toFixed(1)}</span>
                        <span className={emotion.vac[2] > 0 ? "text-purple-400" : "text-gray-400"}>C{emotion.vac[2].toFixed(1)}</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Grid Footer/Count */}
          <div className="text-center mt-12 text-white/20 uppercase tracking-[0.3em] text-xs font-light">
            {activeEmotions.length} Active Emotions
          </div>
        </div>
      )}
    </div>
  );
}
