import XCTest
@testable import SoulBio

final class HapticEngineTests: XCTestCase {

    var engine: HapticEngine!

    override func setUp() {
        super.setUp()
        // HapticEngine init might fail on non-supported hardware (like CI/Simulators usually).
        // But the init catches errors. We just want to test the math method which is pure logic.
        if #available(macOS 10.15, iOS 13.0, *) {
            engine = HapticEngine()
        }
    }

    func testHeartbeatMath_Calm() {
        guard #available(macOS 10.15, iOS 13.0, *), let engine = engine else { return }

        // Arousal 0.0 -> 60 BPM
        let params = engine.calculateHeartbeatParameters(arousal: 0.0)
        XCTAssertEqual(params.bpm, 60.0, accuracy: 0.1)
        XCTAssertEqual(params.interval, 1.0, accuracy: 0.01) // 60/60 = 1 sec
    }

    func testHeartbeatMath_Excited() {
        guard #available(macOS 10.15, iOS 13.0, *), let engine = engine else { return }

        // Arousal 1.0 -> 140 BPM (60 + 80)
        let params = engine.calculateHeartbeatParameters(arousal: 1.0)
        XCTAssertEqual(params.bpm, 140.0, accuracy: 0.1)
        XCTAssertLessThan(params.interval, 0.5) // ~0.42s
    }

    func testHeartbeatMath_NegativeClamp() {
        guard #available(macOS 10.15, iOS 13.0, *), let engine = engine else { return }

        // Arousal -0.5 -> Should be treated as 0.0 for BPM (don't go below 60)
        // Implementation used max(0.0, arousal)
        let params = engine.calculateHeartbeatParameters(arousal: -0.5)
        XCTAssertEqual(params.bpm, 60.0, accuracy: 0.1)
    }
}
