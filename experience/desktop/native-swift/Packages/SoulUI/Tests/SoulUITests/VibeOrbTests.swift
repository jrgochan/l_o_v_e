import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class VibeOrbTests: XCTestCase {

    func testVibeOrbInit() throws {
        let vibe = Vibe(valence: 0.5, arousal: 0.5, connection: 0.5)
        let sut = VibeOrb(vibe: vibe)

        // Verify ZStack structure
        XCTAssertNoThrow(try sut.inspect().zStack())

        // IMPORTANT: We cannot deeply inspect `SoulView` (NSViewRepresentable) 
        // effectively in headless unit tests without booting Metal.
        // We verify the wrapper structure exists.
    }
}
