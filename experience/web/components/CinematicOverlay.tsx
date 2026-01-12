/**
 * Cinematic Overlay Component
 *
 * Displays the currently active emotion(s) in a beautiful, cinematic style.
 * Also handles the "Enable Audio" prompt and waiting state.
 */

"use client";

import { useEffect, useState } from "react";

interface Props {
  activeEmotions: string[];
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
  const [displayText, setDisplayText] = useState("");
  const [fadeState, setFadeState] = useState<"in" | "out">("out");

  // Handle text updates with fade transition
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

    const newText = activeEmotions.join(" + ");
    if (newText !== displayText) {
      setTimeout(() => setFadeState("out"), 0);
      setTimeout(() => {
        setDisplayText(newText);
        setFadeState("in");
      }, 500);
    }
  }, [activeEmotions, isWaiting, displayText]);

  return (
    <div
      className={`absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-40 transition-opacity duration-1000 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {/* Audio Enable Button (Clickable, pointer-events-auto) */}
      {!hasAudioEnabled && (
        <button
          onClick={onEnableAudio}
          className="pointer-events-auto mb-16 px-8 py-3 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-white tracking-widest uppercase text-sm transition-all duration-500 animate-pulse hover:animate-none"
        >
          Enable Audio Experience
        </button>
      )}

      {/* Main Cinematic Text */}
      <div
        className={`text-center transition-all duration-1000 transform ${
          fadeState === "in"
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-4 scale-95"
        }`}
      >
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-thin text-white tracking-[0.2em] uppercase drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]">
          {displayText}
        </h1>
        <div className="mt-4 h-px w-32 bg-gradient-to-r from-transparent via-white/50 to-transparent mx-auto" />
      </div>

      {/* Subtitle / Context (Optional) */}
      {displayText && !isWaiting && (
        <p
          className={`mt-4 text-cyan-400/60 font-light tracking-widest text-sm uppercase transition-opacity duration-1000 delay-300 ${
            fadeState === "in" ? "opacity-100" : "opacity-0"
          }`}
        >
          Current State
        </p>
      )}
    </div>
  );
}
