import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI

@MainActor
final class SoulGlassTests: XCTestCase {

    func testSoulGlassModifier() throws {
        let sut = Text("Hello").modifier(SoulGlass())
        // Verify content persists through modifier
        XCTAssertNoThrow(try sut.inspect().find(text: "Hello"))
    }

    func testExtensionHelper() throws {
        let sut = Text("World").soulGlass()
        // Verify extension applies and content persists
        XCTAssertNoThrow(try sut.inspect().find(text: "World"))
    }
}
