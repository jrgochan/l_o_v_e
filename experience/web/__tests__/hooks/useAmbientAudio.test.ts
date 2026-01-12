import { renderHook, act } from "@testing-library/react";
import { useAmbientAudio } from "@/hooks/useAmbientAudio";
import {
  initAudioEngine,
  isAudioMuted,
  subscribeToAudioState,
  toggleGlobalMute,
} from "@/hooks/audio/AudioEngineState";
import { useAudioModulation } from "@/hooks/audio/useAudioModulation";
import { useAudioSfx } from "@/hooks/audio/useAudioSfx";

jest.mock("@/hooks/audio/AudioEngineState");
jest.mock("@/hooks/audio/useAudioModulation");
jest.mock("@/hooks/audio/useAudioSfx");

describe("useAmbientAudio", () => {
  const mockUnsubscribe = jest.fn();
  const mockSubscribe = jest.fn((cb) => {
    // Expose callback for testing
    (subscribeToAudioState as unknown as any).mockCallback = cb;
    return mockUnsubscribe;
  });

  const mockSfx = {
    playHoverSound: jest.fn(),
    playClickSound: jest.fn(),
    playWhoosh: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (subscribeToAudioState as jest.Mock).mockImplementation(mockSubscribe);
    (isAudioMuted as jest.Mock).mockReturnValue(true);
    (useAudioSfx as jest.Mock).mockReturnValue(mockSfx);
  });

  it("should initialize with current mute state", () => {
    const { result } = renderHook(() => useAmbientAudio());
    expect(result.current.isMuted).toBe(true);
    expect(isAudioMuted).toHaveBeenCalled();
  });

  it("should subscribe to audio state changes", () => {
    renderHook(() => useAmbientAudio());
    expect(subscribeToAudioState).toHaveBeenCalled();
  });

  it("should update state when subscription fires", () => {
    const { result } = renderHook(() => useAmbientAudio());
    expect(result.current.isMuted).toBe(true);

    // Simulate state change
    (isAudioMuted as jest.Mock).mockReturnValue(false);

    act(() => {
      // trigger update
      const callback = (subscribeToAudioState as unknown as any).mockCallback;
      if (callback) callback();
    });

    expect(result.current.isMuted).toBe(false);
  });

  it("should expose initAudio", () => {
    const { result } = renderHook(() => useAmbientAudio());
    result.current.initAudio();
    expect(initAudioEngine).toHaveBeenCalled();
  });

  it("should expose toggles and sfx", () => {
    const { result } = renderHook(() => useAmbientAudio());
    expect(result.current.toggleMute).toBe(toggleGlobalMute);
    expect(result.current.playHoverSound).toBe(mockSfx.playHoverSound);
  });

  it("should call modulation hook", () => {
    renderHook(() => useAmbientAudio());
    expect(useAudioModulation).toHaveBeenCalled();
  });
});
