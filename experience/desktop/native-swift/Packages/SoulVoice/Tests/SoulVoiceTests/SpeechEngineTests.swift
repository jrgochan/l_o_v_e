import XCTest
import AVFoundation
@testable import SoulVoice

@MainActor
final class SpeechEngineTests: XCTestCase {

    // Duplicated helper for robustness
    func makeSineWaveBuffer(frequency: Float, sampleRate: Double = 44100.0, duration: Double = 0.5) -> AVAudioPCMBuffer? {
        let frameCount = AVAudioFrameCount(sampleRate * duration)
        guard let format = AVAudioFormat(standardFormatWithSampleRate: sampleRate, channels: 1),
              let buffer = AVAudioPCMBuffer(pcmFormat: format, frameCapacity: frameCount) else {
            return nil
        }

        buffer.frameLength = frameCount
        let channelData = buffer.floatChannelData![0]
        for i in 0..<Int(frameCount) {
            let time = Double(i) / sampleRate
            let value = sin(2.0 * Double.pi * Double(frequency) * time)
            channelData[i] = Float(value)
        }
        return buffer
    }

    func testConsumeBufferUpdatesLevels() async {
        let engine = SpeechEngine()

        // Initial state
        XCTAssertEqual(engine.audioLevel, 0.0)

        // Create loud signal
        guard let buffer = makeSineWaveBuffer(frequency: 440.0) else {
            XCTFail("Failed to make buffer")
            return
        }

        engine.consumeBuffer(buffer)

        // consumeBuffer launches a Task { @MainActor ... } so we need to wait a tick
        // Allow run loop to cycle
        try? await Task.sleep(nanoseconds: 100_000_000) // 100ms

        // In SpeechEngine: audioLevel = features.energy * 5.0
        // Sine wave RMS is 0.707. * 5.0 = ~3.5.
        // But ProsodyFeatures caps energy? No, ProsodyFeatures struct:
        // public let energy: Float // RMS (0-1 usually, but not clamped in analyzer, vDSP returns real RMS)
        // Actually typical PCM float is -1 to 1. RMS of full sine is 0.707.
        // Wait, AudioAnalyzer code: energy is vDSP_rmsqv.
        // SpeechEngine: self.audioLevel = features.energy * 5.0
        // It might be > 1.0 depending on clamping in UI, but here we check value.

        XCTAssertGreaterThan(engine.audioLevel, 0.1, "Audio level should increase after processing signal")
    }

    func testProsodyUpdates() async {
        let engine = SpeechEngine()
        guard let buffer = makeSineWaveBuffer(frequency: 150.0) else { return }

        engine.consumeBuffer(buffer)
        try? await Task.sleep(nanoseconds: 100_000_000)

        XCTAssertNotNil(engine.prosody)
        XCTAssertEqual(engine.prosody?.pitch ?? 0, 150.0, accuracy: 20.0)
    }
}
