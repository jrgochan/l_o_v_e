import XCTest
import AVFoundation
@testable import SoulVoice

final class AudioAnalyzerTests: XCTestCase {

    // Helper to generate sine wave buffer
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

    // MARK: - DSP Tests

    func testPitchDetectionAccuracy() {
        let analyzer = AudioAnalyzer()
        let targetFreq: Float = 150.0 // Lower freq might be more stable for this basic algo

        guard let buffer = makeSineWaveBuffer(frequency: targetFreq) else {
            XCTFail("Failed to create audio buffer")
            return
        }

        let features = analyzer.process(buffer: buffer)

        XCTAssertTrue(features.voiceActivity, "High energy sine wave should be detected as voice activity (simplistic VAD)")

        // Allow some tolerance for basic autocorrelation
        XCTAssertEqual(features.pitch, targetFreq, accuracy: 20.0, "Pitch should be close to 150Hz")
    }

    func testSilenceDetection() {
        let analyzer = AudioAnalyzer()

        // Zero buffer
        guard let buffer = makeSineWaveBuffer(frequency: 0, duration: 0.1) else { return }
        // Manually zero out just in case
        buffer.floatChannelData?[0].update(repeating: 0, count: Int(buffer.frameLength))

        let features = analyzer.process(buffer: buffer)
        XCTAssertFalse(features.voiceActivity)
        XCTAssertEqual(features.energy, 0, accuracy: 0.001)
    }
}
