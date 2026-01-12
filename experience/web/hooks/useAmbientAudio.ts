/**
 * useAmbientAudio Hook
 *
 * Generative Sonic Architecture for the Immersive Atlas.
 * Refactored to compose specialized audio modules.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  initAudioEngine,
  toggleGlobalMute,
  isAudioMuted,
  subscribeToAudioState,
} from "./audio/AudioEngineState";
import { useAudioModulation } from "./audio/useAudioModulation";
import { useAudioSfx } from "./audio/useAudioSfx";

export function useAmbientAudio() {
  // Sync local state with global audio state for UI updates
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    // Initial sync
    setIsMuted(isAudioMuted());

    // Subscribe to changes
    return subscribeToAudioState(() => {
      setIsMuted(isAudioMuted());
    });
  }, []);

  // Initialize engine on mount if needed (lazy init is also handled by toggleMute)
  // But wait, user interaction is usually required to start AudioContext.
  // We expose initAudio for the UI to call on first interaction.
  const initAudio = useCallback(() => {
    initAudioEngine();
  }, []);

  // Apply Modulation Logic
  useAudioModulation();

  // SFX
  const sfx = useAudioSfx();

  return {
    initAudio,
    isMuted,
    toggleMute: toggleGlobalMute,
    ...sfx,
  };
}
