import Foundation
import Accelerate
import AVFoundation

/// Extracts prosodic features (pitch, energy) from audio buffers.
/// Mirrors `prosody_analyzer.py` from Listener.
public class AudioAnalyzer {

    // Tuning
    private let minFrequency: Float = 50.0
    private let maxFrequency: Float = 500.0
    private let sampleRate: Float = 44100.0

    public struct ProsodyFeatures {
        public let pitch: Float // Fundamental Frequency (Hz)
        public let energy: Float // RMS (0-1)
        public let zeroCrossingRate: Float
        public let voiceActivity: Bool

        // Derived VAC mapping cues
        public var arousalCue: Float { return min(1.0, energy * 3.0) } // Loud = High Arousal
    }

    public init() {}

    /// Processes a PCM audio buffer and returns prosodic features.
    public func process(buffer: AVAudioPCMBuffer) -> ProsodyFeatures {
        print("🎤 Analyzer: Processing Buffer frameLength=\(buffer.frameLength)")
        guard let channelData = buffer.floatChannelData?[0] else {
            return ProsodyFeatures(pitch: 0, energy: 0, zeroCrossingRate: 0, voiceActivity: false)
        }

        let frameLength = UInt(buffer.frameLength)
        let data = UnsafeBufferPointer(start: channelData, count: Int(frameLength))
        let samples = Array(data)

        // 1. RMS Energy
        var energy: Float = 0
        vDSP_rmsqv(channelData, 1, &energy, vDSP_Length(frameLength))

        // 2. Zero Crossing Rate
        let zcr = calculateZeroCrossingRate(samples)

        // 3. Pitch (Autocorrelation)
        // Only calculate pitch if energy is above silence threshold
        var pitch: Float = 0
        let isSpeaking = energy > 0.01

        if isSpeaking {
            pitch = calculatePitch(samples, sampleRate: Float(buffer.format.sampleRate))
        }

        print("✅ Analyzer: Frame Complete")
        return ProsodyFeatures(
            pitch: pitch,
            energy: energy,
            zeroCrossingRate: zcr,
            voiceActivity: isSpeaking
        )
    }

    // MARK: - DSP Helpers

    private func calculateZeroCrossingRate(_ samples: [Float]) -> Float {
        var zeroCrossings = 0
        for i in 1..<samples.count {
            if (samples[i-1] > 0 && samples[i] <= 0) || (samples[i-1] <= 0 && samples[i] > 0) {
                zeroCrossings += 1
            }
        }
        return Float(zeroCrossings) / Float(samples.count)
    }

    private func calculatePitch(_ samples: [Float], sampleRate: Float) -> Float {
        // Simplified Autocorrelation
        // For production, consider YIN algorithm or similar.
        // This is a basic implementation for MVP.

        let n = samples.count
        guard n > 0 else { return 0 }

        // We only care about lags corresponding to human voice range (50Hz - 500Hz)
        let minLag = Int(sampleRate / maxFrequency)
        let maxLag = Int(sampleRate / minFrequency)

        guard maxLag < n else { return 0 }

        var bestLag = 0
        var maxCorrelation: Float = -1.0

        // Warning: Nested loop O(N*Lag). Optimize with FFT for large buffers.
        // For standard buffer sizes (e.g. 1024), this is acceptable.

        // Stride to improve performance
        let lagStride = 2

        for lag in stride(from: minLag, to: maxLag, by: lagStride) {
            var correlation: Float = 0
            var sum: Float = 0

            // Normalized Cross-Correlation
            // Using a subset of samples to speed up
            let count = min(n - lag, 512)

            for i in 0..<count {
                correlation += samples[i] * samples[i + lag]
                sum += samples[i] * samples[i]
            }

            // Normalize (inexact but functional for relative peak picking)
            if sum > 0 {
                correlation /= sum
            }

            if correlation > maxCorrelation {
                maxCorrelation = correlation
                bestLag = lag
            }
        }

        if bestLag > 0 && maxCorrelation > 0.3 { // Threshold for "periodicity"
            return sampleRate / Float(bestLag)
        }

        return 0
    }
}
