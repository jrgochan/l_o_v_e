import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class ZenHUDTests: XCTestCase {

    func testIdleModeRender() throws {
        let mode = Binding<VisualMode>(wrappedValue: .subtle)
        let sut = ZenHUD(selectedEmotion: nil, hoveredEmotion: nil, activePath: [], visualMode: mode)

        // Check for "MODE" label
        let label = try sut.inspect().find(text: "MODE").string()
        XCTAssertEqual(label, "MODE")

        // Check for current mode display
        let currentMode = try sut.inspect().find(text: "SUBTLE").string()
        XCTAssertEqual(currentMode, "SUBTLE")
    }

    func testModeToggle() throws {
        var modeState = VisualMode.subtle
        let modeBinding = Binding(get: { modeState }, set: { modeState = $0 })
        let sut = ZenHUD(visualMode: modeBinding)

        // Find the button (it's the only button in Idle state)
        // Attempt to tap
        try sut.inspect().find(ViewType.Button.self).tap()

        // Verify next mode
        XCTAssertEqual(modeState, .dynamic)
    }

    func testEmotionDisplay() throws {
        let mode = Binding<VisualMode>(wrappedValue: .subtle)
        let sut = ZenHUD(selectedEmotion: "joy", visualMode: mode)

        // "JOY" text
        let emotionText = try sut.inspect().find(text: "JOY").string()
        XCTAssertEqual(emotionText, "JOY")

        // "EMOTIONAL STATE" label
        XCTAssertNotNil(try sut.inspect().find(text: "EMOTIONAL STATE"))
    }

    func testPathDisplay() throws {
        let mode = Binding<VisualMode>(wrappedValue: .subtle)
        let sut = ZenHUD(activePath: ["A", "B", "C"], visualMode: mode)

        // "JOURNEY ACTIVE"
        XCTAssertNotNil(try sut.inspect().find(text: "JOURNEY ACTIVE"))

        // Start/End
        XCTAssertNotNil(try sut.inspect().find(text: "A"))
        XCTAssertNotNil(try sut.inspect().find(text: "C"))

        // Count "3"
        let count = try sut.inspect().find(text: "3").string()
        XCTAssertEqual(count, "3")
    }
}
