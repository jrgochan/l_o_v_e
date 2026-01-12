import { createAudioEngineInstance } from '../../../utils/audio/audioFactory';

describe('createAudioEngineInstance', () => {
    let mockAudioContext: any;
    let mockGainNode: any;
    let mockOscillator: any;
    let mockBiquadFilter: any;
    let mockConvolver: any;

    beforeEach(() => {
        // Mock Web Audio API nodes
        mockGainNode = {
            gain: { value: 0 },
            connect: jest.fn(),
        };
        mockOscillator = {
            type: '',
            frequency: { value: 0 },
            connect: jest.fn(),
            start: jest.fn(),
        };
        mockBiquadFilter = {
            type: '',
            frequency: { value: 0 },
            connect: jest.fn(),
        };
        mockConvolver = {
            buffer: null,
            connect: jest.fn(),
        };

        // Mock AudioContext
        mockAudioContext = {
            createGain: jest.fn(() => ({
                gain: { value: 0 },
                connect: jest.fn(),
            })),
            createOscillator: jest.fn(() => mockOscillator),
            createBiquadFilter: jest.fn(() => mockBiquadFilter),
            createConvolver: jest.fn(() => mockConvolver),
            createBuffer: jest.fn(() => ({
                getChannelData: jest.fn(() => new Float32Array(100)),
            })),
            destination: {},
            sampleRate: 44100,
        };

        // Mock window.AudioContext
        (window as any).AudioContext = jest.fn(() => mockAudioContext);
        (window as any).webkitAudioContext = jest.fn(() => mockAudioContext);
    });

    it('should create an audio engine instance', () => {
        const engine = createAudioEngineInstance(false);
        expect(engine).toBeDefined();
        expect(engine?.ctx).toBeDefined();
        expect(engine?.masterGain).toBeDefined();
    });

    it('should initialize with muted state when isMuted is true', () => {
        const engine = createAudioEngineInstance(true);
        expect(engine?.masterGain.gain.value).toBe(0);
    });

    it('should initialize with active volume when isMuted is false', () => {
        const engine = createAudioEngineInstance(false);
        expect(engine?.masterGain.gain.value).toBe(0.3); // Default master volume
    });

    it('should create bass, mid, and high layers', () => {
        const engine = createAudioEngineInstance(false);
        expect(engine?.bass).toBeDefined();
        expect(engine?.mid).toBeDefined();
        expect(engine?.high).toBeDefined();
    });

    it('should connect filter chain corectly', () => {
        const engine = createAudioEngineInstance(false);
        // Filter connects to master gain
        expect(mockBiquadFilter.connect).toHaveBeenCalled();
    });

    it('should return null if AudioContext throws', () => {
        (window as any).AudioContext = jest.fn(() => {
            throw new Error('Not supported');
        });
        const engine = createAudioEngineInstance(false);
        expect(engine).toBeNull();
    });
});

