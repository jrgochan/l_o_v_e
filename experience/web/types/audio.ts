export interface OscillatorState {
  osc: OscillatorNode;
  gain: GainNode;
  lfo?: OscillatorNode;
  lfoGain?: GainNode;
}

export interface AudioEngine {
  ctx: AudioContext;
  masterGain: GainNode;

  // Drone Layers
  bass: OscillatorState;
  mid: OscillatorState;
  high: OscillatorState;

  // Effects
  reverb: ConvolverNode | null;
  filter: BiquadFilterNode;
}
