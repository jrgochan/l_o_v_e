import { renderHook } from "@testing-library/react";
import { useAudioSfx } from "@/hooks/audio/useAudioSfx";
import { getAudioEngine, isAudioMuted } from "@/hooks/audio/AudioEngineState";

jest.mock("@/hooks/audio/AudioEngineState");

describe("useAudioSfx", () => {
    const mockRamp = jest.fn();
    const mockSetValue = jest.fn();
    const mockStart = jest.fn();
    const mockStop = jest.fn();
    const mockConnect = jest.fn();

    const mockCtx = {
        currentTime: 100,
        sampleRate: 44100,
        createOscillator: jest.fn(() => ({
            type: "",
            frequency: { setValueAtTime: mockSetValue, exponentialRampToValueAtTime: mockRamp },
            connect: mockConnect,
            start: mockStart,
            stop: mockStop
        })),
        createGain: jest.fn(() => ({
            gain: { setValueAtTime: mockSetValue, exponentialRampToValueAtTime: mockRamp, linearRampToValueAtTime: mockRamp },
            connect: mockConnect
        })),
        createBuffer: jest.fn(() => ({
            getChannelData: jest.fn(() => new Float32Array(100))
        })),
        createBufferSource: jest.fn(() => ({
            buffer: null,
            connect: mockConnect,
            start: mockStart
        })),
        createBiquadFilter: jest.fn(() => ({
            type: "",
            Q: { value: 0 },
            frequency: { setValueAtTime: mockSetValue, exponentialRampToValueAtTime: mockRamp },
            connect: mockConnect
        }))
    };

    const mockEngine = {
        ctx: mockCtx,
        masterGain: {}
    };

    beforeEach(() => {
        jest.clearAllMocks();
        (getAudioEngine as jest.Mock).mockReturnValue(mockEngine);
        (isAudioMuted as jest.Mock).mockReturnValue(false);
    });

    it("should play hover sound", () => {
        const { result } = renderHook(() => useAudioSfx());
        result.current.playHoverSound();

        expect(mockCtx.createOscillator).toHaveBeenCalled();
        expect(mockCtx.createGain).toHaveBeenCalled();
        expect(mockStart).toHaveBeenCalled();
        expect(mockStop).toHaveBeenCalled();
    });

    it("should play click sound", () => {
        const { result } = renderHook(() => useAudioSfx());
        result.current.playClickSound();

        expect(mockCtx.createOscillator).toHaveBeenCalled();
        expect(mockStart).toHaveBeenCalled();
    });

    it("should play whoosh sound", () => {
        const { result } = renderHook(() => useAudioSfx());
        result.current.playWhoosh(1.5);

        expect(mockCtx.createBuffer).toHaveBeenCalled();
        expect(mockCtx.createBufferSource).toHaveBeenCalled();
        expect(mockCtx.createBiquadFilter).toHaveBeenCalled();
        expect(mockStart).toHaveBeenCalled();
    });

    it("should not play if muted", () => {
        (isAudioMuted as jest.Mock).mockReturnValue(true);
        const { result } = renderHook(() => useAudioSfx());

        result.current.playHoverSound();
        expect(mockStart).not.toHaveBeenCalled();

        result.current.playClickSound();
        expect(mockStart).not.toHaveBeenCalled();

        result.current.playWhoosh();
        expect(mockStart).not.toHaveBeenCalled();
    });

    it("should not play if engine not ready", () => {
        (getAudioEngine as jest.Mock).mockReturnValue(null);
        const { result } = renderHook(() => useAudioSfx());

        result.current.playHoverSound();
        expect(mockCtx.createOscillator).not.toHaveBeenCalled();
    });
});
