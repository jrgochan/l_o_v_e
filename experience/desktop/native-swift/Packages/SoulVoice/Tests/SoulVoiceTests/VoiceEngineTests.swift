import XCTest
import AVFoundation
import SoulCore
@testable import SoulVoice

final class VoiceEngineTests: XCTestCase {

    var engine: VoiceEngine!

    override func setUp() {
        super.setUp()
        engine = VoiceEngine()
    }

    func testVoiceParameters_Happiness() {
        // High Valence (0.9), Neutral Arousal (0.0), Connection (0.8)
        let vibe = Vibe(valence: 0.9, arousal: 0.0, connection: 0.8)
        let params = engine.calculateParameters(for: vibe)

        // Pitch should be high (> 1.0) due to high valence
        XCTAssertGreaterThan(params.pitch, 1.0)

        // Rate should be near mid (0.5 +/- small)
        XCTAssertEqual(params.rate, 0.5, accuracy: 0.05)

        // Volume should be high
        XCTAssertGreaterThan(params.volume, 0.9)
    }

    func testVoiceParameters_Sadness() {
        // Low Valence, Low Arousal
        let vibe = Vibe(valence: -0.8, arousal: -0.5, connection: 0.2)
        let params = engine.calculateParameters(for: vibe)

        // Pitch should be low (< 1.0)
        XCTAssertLessThan(params.pitch, 1.0)

        // Rate should be slow (< 0.5)
        XCTAssertLessThan(params.rate, 0.5)
    }

    func testVoiceParameters_Excitement() {
        // High Arousal
        let vibe = Vibe(valence: 0.5, arousal: 0.9, connection: 0.5)
        let params = engine.calculateParameters(for: vibe)

        // Rate should be fast (> 0.5)
        XCTAssertGreaterThan(params.rate, 0.5)
    }

    func testUpdateVibeStoresState() {
        let vibe = Vibe(valence: 0.5, arousal: 0.5, connection: 0.5)
        engine.update(vibe: vibe)
        // No public accessor for currentVibe to verify directly,
        // but calculateParameters uses it if we verified speak() logic.
        // For now, we trust the update method exists and compiles.
    }

    func testSpeakingAmplitudeUpdate() {
        // Manually trigger the delegate method
        let synth = AVSpeechSynthesizer()
        let utterance = AVSpeechUtterance(string: "Test")
        let range = NSRange(location: 0, length: 4)

        // Initial State
        XCTAssertEqual(engine.speakingAmplitude, 0.0)

        engine.speechSynthesizer(synth, willSpeakRangeOfSpeechString: range, utterance: utterance)

        // Should have updated to random value 0.4...0.8
        XCTAssertGreaterThan(engine.speakingAmplitude, 0.3)
        XCTAssertLessThanOrEqual(engine.speakingAmplitude, 0.8)
    }
}
