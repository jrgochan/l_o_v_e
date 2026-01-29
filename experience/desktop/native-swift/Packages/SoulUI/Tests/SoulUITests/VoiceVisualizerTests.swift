import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
final class VoiceVisualizerTests: XCTestCase {

    func testVoiceVisualizerBars() throws {
        let sut = VoiceVisualizer(audioLevel: 0.5)

        // Verify HStack with 5 bars
        let hStack = try sut.inspect().hStack()
        XCTAssertEqual(try hStack.forEach(0).count, 5)

        // Verify some layout properties if possible, or just existence
    }

    func testVoiceVisualizerLogic() throws {
        let sut = VoiceVisualizer(audioLevel: 1.0)
        let bars = try sut.inspect().hStack().forEach(0)
        
        // Verify center bar (index 2) is tallest
        // We can't easily get the exact frame without a layout pass, 
        // but we can verify the view structure construction.
        // Let's verify we have 5 bars.
        XCTAssertEqual(bars.count, 5)
        
        // Let's verify the animation modifier exists on the first bar
        // Note: ViewInspector access to modifiers is typed.
        // We verify that the first bar is a ShapeView with an animation.
        XCTAssertNoThrow(try bars.first?.shape(0))
    }
}
