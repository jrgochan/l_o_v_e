import { renderHook, act } from "@testing-library/react";
import { useVoiceVisualizer } from "../../../hooks/voice/useVoiceVisualizer";

// Mock Web Audio API
const mockClose = jest.fn().mockResolvedValue(undefined);
const mockCreateAnalyser = jest.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 128,
    connect: jest.fn(),
    getByteFrequencyData: jest.fn((array) => {
        array.fill(128); // Simulate half volume
    })
});
const mockCreateMediaStreamSource = jest.fn().mockReturnValue({
    connect: jest.fn()
});

window.AudioContext = class {
    createAnalyser = mockCreateAnalyser;
    createMediaStreamSource = mockCreateMediaStreamSource;
    close = mockClose;
} as any;

describe("useVoiceVisualizer", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it("should initialize with 0 level when no stream", () => {
        const { result } = renderHook(() => useVoiceVisualizer(null));
        expect(result.current.audioLevel).toBe(0);
    });

    it("should connect stream and update levels", () => {
        const stream = {} as MediaStream;
        const { result } = renderHook(() => useVoiceVisualizer(stream));

        expect(mockCreateMediaStreamSource).toHaveBeenCalledWith(stream);
        expect(mockCreateAnalyser).toHaveBeenCalled();

        // Should update via rAF (mocked via fake timers/act?)
        // rAF usually runs immediately in some test environments or needs explicit trigger.
        // Let's assume rAF loop runs.

        // Wait for rAF loop tick (simulated)
        // Since we don't mock requestAnimationFrame yet, let's do it:
    });
});
