import { logger } from "@/utils/logger";
import type { AudioEngine } from "@/types/audio";
import { createAudioEngineInstance } from "@/utils/audio/audioFactory";

// Module-level singleton
let globalAudioEngine: AudioEngine | null = null;
let globalIsMuted = true;
const globalListeners: Set<() => void> = new Set();

export const getAudioEngine = () => globalAudioEngine;
export const isAudioMuted = () => globalIsMuted;

export const subscribeToAudioState = (callback: () => void) => {
  globalListeners.add(callback);
  return () => {
    globalListeners.delete(callback);
  };
};

const notifyListeners = () => {
  globalListeners.forEach((l) => l());
};

export const initAudioEngine = () => {
  if (globalAudioEngine) return;

  const engine = createAudioEngineInstance(globalIsMuted);
  if (engine) {
    globalAudioEngine = engine;
    notifyListeners();
    logger.info("rendering", "Sonic Architecture Initialized");
  } else {
    logger.error("rendering", "Audio Engine Init Failed");
  }
};

export const toggleGlobalMute = () => {
  if (!globalAudioEngine) initAudioEngine();

  globalIsMuted = !globalIsMuted;

  if (globalAudioEngine) {
    const { ctx, masterGain } = globalAudioEngine;
    masterGain.gain.linearRampToValueAtTime(globalIsMuted ? 0 : 0.3, ctx.currentTime + 0.5);

    if (!globalIsMuted && ctx.state === "suspended") {
      ctx.resume();
    }
  }

  notifyListeners();
};

export const resetAudioEngineState = () => {
  if (process.env.NODE_ENV === "test") {
    globalAudioEngine = null;
    globalIsMuted = true;
    globalListeners.clear();
  }
};

// Re-export types for backward compatibility
export * from "@/types/audio";
