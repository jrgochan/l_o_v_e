import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class ModelSettingsViewTests: XCTestCase {

    func testModelSettingsStructure() throws {
        let sut = ModelSettingsView()

        // Verify Sections
        // ViewInspector Form inspection often lets you find Section headers directly via text
        XCTAssertNoThrow(try sut.inspect().find(text: "Active Intelligence"))
        XCTAssertNoThrow(try sut.inspect().find(text: "Download"))
        XCTAssertNoThrow(try sut.inspect().find(text: "Location"))
    }
}
