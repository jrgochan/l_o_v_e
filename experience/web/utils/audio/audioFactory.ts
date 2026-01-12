import type { OscillatorState, AudioEngine } from "@/types/audio";

// Helper: Generate impulse response
export function createReverbBuffer(
  ctx: AudioContext,
  duration: number = 2.0,
  decay: number = 2.0
): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  const left = impulse.getChannelData(0);
  const right = impulse.getChannelData(1);

  for (let i = 0; i < length; i++) {
    const n = i / length;
    const gain = Math.pow(1 - n, decay);
    left[i] = (Math.random() * 2 - 1) * gain;
    right[i] = (Math.random() * 2 - 1) * gain;
  }
  return impulse;
}

export function createLayer(
  ctx: AudioContext,
  filter: BiquadFilterNode,
  type: OscillatorType,
  freq: number
): OscillatorState {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const lfo = ctx.createOscillator();
  const lfoGain = ctx.createGain();

  osc.type = type;
  osc.frequency.value = freq;

  lfo.type = "sine";
  lfo.frequency.value = 0.1;
  lfoGain.gain.value = 0.1;

  lfo.connect(lfoGain);
  lfoGain.connect(gain.gain);

  osc.connect(gain);
  gain.connect(filter);

  osc.start();
  lfo.start();

  return { osc, gain, lfo, lfoGain };
}

export function createAudioEngineInstance(isMuted: boolean): AudioEngine | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();

    // Master Chain
    const masterGain = ctx.createGain();
    masterGain.gain.value = isMuted ? 0 : 0.3;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 2000;

    filter.connect(masterGain);
    masterGain.connect(ctx.destination);

    // Layers
    const bass = createLayer(ctx, filter, "sine", 55); // A1
    bass.gain.gain.value = 0.4;
    const mid = createLayer(ctx, filter, "triangle", 110); // A2
    mid.gain.gain.value = 0.2;
    const high = createLayer(ctx, filter, "sine", 220); // A3
    high.gain.gain.value = 0.1;

    // Reverb
    const reverb = ctx.createConvolver();
    reverb.buffer = createReverbBuffer(ctx, 3.0, 2.0);

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4;

    filter.connect(reverb);
    reverb.connect(reverbGain);
    reverbGain.connect(masterGain);

    return {
      ctx,
      masterGain,
      filter,
      bass,
      mid,
      high,
      reverb,
    };
  } catch (e) {
    console.error("Audio Engine Init Failed:", e);
    return null;
  }
}
