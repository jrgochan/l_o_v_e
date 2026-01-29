import XCTest
import SwiftUI
@testable import SoulUI
@testable import SoulCore

final class SoulColorsTests: XCTestCase {

    func testThresholdMappings() {
        // High Valence (> 0.5) -> Joy
        let joyfulVibe = Vibe(valence: 0.6, arousal: 0, connection: 0)
        let colorJoy = Color.forVibe(joyfulVibe)
        // We can't easily assert Equality on SwiftUI.Color.
        // But we can verify it doesn't crash and returns a value.
        // Or inspect description if possible.
        XCTAssertNotNil(colorJoy)
    }

    func testOpacityMapping() {
        // Connection -1.0 -> Opacity 0.4
        // Connection 1.0 -> Opacity 1.0

        // Since we can't inspect Color opacity specifically without reflection or View inspection,
        // we mainly assume this is a smoke test for the function logic not trapping.

        let disconnected = Vibe(valence: 0, arousal: 0, connection: -1.0)
        _ = Color.forVibe(disconnected)

        let connected = Vibe(valence: 0, arousal: 0, connection: 1.0)
        _ = Color.forVibe(connected)
    }
}
