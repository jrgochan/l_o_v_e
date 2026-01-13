import {
  initAudioEngine,
  getAudioEngine,
  subscribeToAudioState,
  toggleGlobalMute,
  isAudioMuted,
} from "@/hooks/audio/AudioEngineState";
import { createAudioEngineInstance } from "@/utils/audio/audioFactory";
import { logger } from "@/utils/logger";

jest.mock("@/utils/audio/audioFactory");
jest.mock("@/utils/logger");

describe("AudioEngineState", () => {
  // Reset singleton state is tricky because it's module level.
  // We might need to rely on the fact that these tests run in isolation or verify state changes relative to start.
  // Ideally we would export a reset function for testing, but we can't modify source easily.
  // However, Jest isolates modules between test files. Within a file, we might have persistent state.
  // Let's assume fresh module state or write tests that tolerate existing state.

  // Actually, `toggleGlobalMute` and `initAudioEngine` interact with the singletons.
  // Let's try to simulate checking the flow.

  const mockCtx = {
    currentTime: 0,
    resume: jest.fn(),
    state: "suspended",
  };
  const mockGain = {
    gain: {
      linearRampToValueAtTime: jest.fn(),
    },
  };
  const mockEngine = {
    ctx: mockCtx,
    masterGain: mockGain,
    bass: {},
    mid: {},
    high: {},
    filter: {},
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (createAudioEngineInstance as jest.Mock).mockReturnValue(mockEngine);
  });

  // NOTE: Because module state persists, tests must be ordered or designed to clean up if possible.
  // Since we can't clean up the singleton without an exposed method, we'll test the sequence.

  it("should initialize audio engine", () => {
    initAudioEngine();
    expect(createAudioEngineInstance).toHaveBeenCalled();
    expect(getAudioEngine()).toBe(mockEngine);
    expect(logger.info).toHaveBeenCalledWith("rendering", "Sonic Architecture Initialized");
  });

  it("should not re-initialize if already initialized", () => {
    // init called in previous test
    (createAudioEngineInstance as jest.Mock).mockClear();
    initAudioEngine();
    expect(createAudioEngineInstance).not.toHaveBeenCalled();
    expect(getAudioEngine()).toBe(mockEngine);
  });

  it("should handle initialization failure", () => {
    // Reset state
    // @ts-ignore
    const { resetAudioEngineState } = require("@/hooks/audio/AudioEngineState");
    resetAudioEngineState();

    (createAudioEngineInstance as jest.Mock).mockReturnValue(null);
    initAudioEngine();

    expect(getAudioEngine()).toBeNull();
    expect(logger.error).toHaveBeenCalledWith("rendering", "Audio Engine Init Failed");

    // Restore mock for other tests
    (createAudioEngineInstance as jest.Mock).mockReturnValue(mockEngine);
  });

  it("should toggle mute", () => {
    // Ensure initialized
    initAudioEngine();
    const initialMute = isAudioMuted(); // Likely true by default

    const listener = jest.fn();
    const unsubscribe = subscribeToAudioState(listener);

    toggleGlobalMute();

    expect(isAudioMuted()).toBe(!initialMute);
    expect(listener).toHaveBeenCalled();
    expect(mockGain.gain.linearRampToValueAtTime).toHaveBeenCalled();

    if (initialMute) {
      // Was muted, now unmuted
      expect(mockCtx.resume).toHaveBeenCalled();
    }

    unsubscribe();
  });

  it("should initialize engine on toggle if missing", () => {
    // Reset state
    // @ts-ignore
    const { resetAudioEngineState } = require("@/hooks/audio/AudioEngineState");
    resetAudioEngineState();

    toggleGlobalMute();
    expect(createAudioEngineInstance).toHaveBeenCalled();
  });

  it("should handle toggle when engine remains null (init failure)", () => {
    // Reset state
    // @ts-ignore
    const { resetAudioEngineState } = require("@/hooks/audio/AudioEngineState");
    resetAudioEngineState();

    (createAudioEngineInstance as jest.Mock).mockReturnValue(null);
    toggleGlobalMute();

    // Should not crash, and should not try to ramp gain
    expect(mockGain.gain.linearRampToValueAtTime).not.toHaveBeenCalled();

    // Restore
    (createAudioEngineInstance as jest.Mock).mockReturnValue(mockEngine);
  });

  it("should not resume context if already running when unmuting", () => {
    // Ensure initialized
    initAudioEngine();

    // Force mute state to true so we can unmute
    // toggleGlobalMute toggles the module variable
    // We can assume it starts muted or we toggle until it matches expectation?
    if (!isAudioMuted()) {
      toggleGlobalMute(); // Now muted
    }

    // Muted -> Unmuted
    // Mock running state
    mockCtx.state = "running";
    mockCtx.resume.mockClear();

    toggleGlobalMute(); // Now unmuted
    expect(mockCtx.resume).not.toHaveBeenCalled();

    // Reset state
    mockCtx.state = "suspended";
  });
});
