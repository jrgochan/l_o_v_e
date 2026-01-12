import { useEffect } from "react";
import { useExperienceStore } from "@/stores/useExperienceStore";
import { getAudioEngine } from "./AudioEngineState";

export function useAudioModulation() {
  const currentVAC = useExperienceStore((state) => state.currentVAC);

  useEffect(() => {
    const engine = getAudioEngine();
    if (!engine || !currentVAC) return;

    const { bass, mid, high, filter, ctx } = engine;

    // Safety check for VAC array structure
    const vacArray = currentVAC as unknown as number[];
    const v = Math.max(0, Math.min(1, vacArray?.[0] ?? 0.5));
    const a = Math.max(0, Math.min(1, vacArray?.[1] ?? 0.5));
    const c = Math.max(0, Math.min(1, vacArray?.[2] ?? 0.5));

    const now = ctx.currentTime;
    const ramp = 1.5;

    // --- VALENCE (Harmony) ---
    bass.osc.detune.linearRampToValueAtTime((1 - v) * 50, now + ramp);

    const midTargetFreq = 110 * (1.2 + v * 0.05);
    mid.osc.frequency.linearRampToValueAtTime(midTargetFreq, now + ramp);

    const highTargetFreq = 220 * (1.4 + v * 0.1);
    high.osc.frequency.linearRampToValueAtTime(highTargetFreq, now + ramp);

    // --- AROUSAL (Energy) ---
    const lfoRate = 0.1 + a * 4.0;
    bass.lfo?.frequency.linearRampToValueAtTime(lfoRate * 0.5, now + ramp);
    mid.lfo?.frequency.linearRampToValueAtTime(lfoRate, now + ramp);
    high.lfo?.frequency.linearRampToValueAtTime(lfoRate * 1.5, now + ramp);

    high.gain.gain.linearRampToValueAtTime(0.05 + 0.15 * a, now + ramp);

    // --- CONNECTION (Presence) ---
    const cutoff = 200 + c * 4000;
    filter.frequency.linearRampToValueAtTime(cutoff, now + ramp);
  }, [currentVAC]);
}
