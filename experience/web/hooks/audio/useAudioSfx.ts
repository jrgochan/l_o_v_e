import { useCallback } from "react";
import { getAudioEngine, isAudioMuted } from "./AudioEngineState";

export function useAudioSfx() {
  const playHoverSound = useCallback(() => {
    const engine = getAudioEngine();
    if (!engine || isAudioMuted()) return;

    const { ctx, masterGain } = engine;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    const pitches = [523.25, 587.33, 659.25, 783.99, 880.0];
    osc.frequency.setValueAtTime(
      pitches[Math.floor(Math.random() * pitches.length)],
      ctx.currentTime
    );

    gain.gain.setValueAtTime(0.05, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.31);
  }, []);

  const playClickSound = useCallback(() => {
    const engine = getAudioEngine();
    if (!engine || isAudioMuted()) return;

    const { ctx, masterGain } = engine;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(100, ctx.currentTime);

    gain.gain.setValueAtTime(0.02, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(gain);
    gain.connect(masterGain);

    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  }, []);

  const playWhoosh = useCallback((duration: number = 2.0) => {
    const engine = getAudioEngine();
    if (!engine || isAudioMuted()) return;

    const { ctx, masterGain } = engine;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      data[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = data[i];
      data[i] *= 3.5;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.Q.value = 1;

    const noiseGain = ctx.createGain();

    noiseFilter.frequency.setValueAtTime(200, ctx.currentTime);
    noiseFilter.frequency.exponentialRampToValueAtTime(2000, ctx.currentTime + duration / 2);
    noiseFilter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + duration);

    noiseGain.gain.setValueAtTime(0, ctx.currentTime);
    noiseGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + duration / 2);
    noiseGain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);

    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(masterGain);

    noise.start();
  }, []);

  return { playHoverSound, playClickSound, playWhoosh };
}
