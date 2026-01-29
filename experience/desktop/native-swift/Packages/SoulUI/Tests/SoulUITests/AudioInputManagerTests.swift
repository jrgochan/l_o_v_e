import XCTest
@testable import SoulUI
import AVFoundation

@MainActor
final class AudioInputManagerTests: XCTestCase {

    func testAudioInputManagerDefaults() {
        let manager = AudioInputManager.shared

        // Initial State
        XCTAssertFalse(manager.isListening)
        XCTAssertFalse(manager.permissionDenied)
        XCTAssertEqual(manager.audioLevel, 0.0)
    }

    // We avoid calling start() in CI/Headless as it triggers hardware permission prompts
    // which can hang the test runner.

    func testStopSafety() {
        let manager = AudioInputManager.shared
        // Stop should be safe to call even if not started
        manager.stop()
        XCTAssertFalse(manager.isListening)
    }
}
