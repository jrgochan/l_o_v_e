import { renderHook } from "@testing-library/react";
import { useAudioModulation } from "@/hooks/audio/useAudioModulation";
import { getAudioEngine } from "@/hooks/audio/AudioEngineState";
import { useExperienceStore } from "@/stores/useExperienceStore";

jest.mock("@/hooks/audio/AudioEngineState");
jest.mock("@/stores/useExperienceStore");

describe("useAudioModulation", () => {
  const mockRamp = jest.fn();
  const mockCtx = { currentTime: 100 };
  const mockEngine = {
    ctx: mockCtx,
    bass: {
      osc: { detune: { linearRampToValueAtTime: mockRamp } },
      lfo: { frequency: { linearRampToValueAtTime: mockRamp } },
    },
    mid: {
      osc: { frequency: { linearRampToValueAtTime: mockRamp } },
      lfo: { frequency: { linearRampToValueAtTime: mockRamp } },
    },
    high: {
      osc: { frequency: { linearRampToValueAtTime: mockRamp } },
      lfo: { frequency: { linearRampToValueAtTime: mockRamp } },
      gain: { gain: { linearRampToValueAtTime: mockRamp } },
    },
    filter: {
      frequency: { linearRampToValueAtTime: mockRamp },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (getAudioEngine as jest.Mock).mockReturnValue(mockEngine);
    (useExperienceStore as unknown as jest.Mock).mockReturnValue([0.5, 0.5, 0.5]); // Default VAC
  });

  it("should modulate audio params based on VAC", () => {
    renderHook(() => useAudioModulation());

    // Check if ramps were called
    // Valence affects Detune, Mid Freq, High Freq
    expect(mockEngine.bass.osc.detune.linearRampToValueAtTime).toHaveBeenCalled();
    expect(mockEngine.mid.osc.frequency.linearRampToValueAtTime).toHaveBeenCalled();

    // Arousal affects LFO rates
    expect(mockEngine.bass.lfo.frequency.linearRampToValueAtTime).toHaveBeenCalled();

    // Connection affects Filter
    expect(mockEngine.filter.frequency.linearRampToValueAtTime).toHaveBeenCalled();
  });

  it("should do nothing if engine is not initialized", () => {
    (getAudioEngine as jest.Mock).mockReturnValue(null);
    renderHook(() => useAudioModulation());
    expect(mockRamp).not.toHaveBeenCalled();
  });

  it("should handle null VAC gracefully", () => {
    (useExperienceStore as unknown as jest.Mock).mockReturnValue(null);
    renderHook(() => useAudioModulation());
    // Should return early
    expect(mockRamp).not.toHaveBeenCalled();
  });
});
