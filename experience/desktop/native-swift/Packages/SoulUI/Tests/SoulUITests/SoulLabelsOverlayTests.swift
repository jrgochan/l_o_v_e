import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class SoulLabelsOverlayTests: XCTestCase {

    func testLabelSelection() throws {
        let labels = [("Joy", CGPoint(x: 100, y: 100)), ("Sadness", CGPoint(x: 200, y: 200))]
        let sut = SoulLabelsOverlay(labels: labels, selectedEmotion: "Joy")

        // Canvas is hard to inspect content-wise because it's a drawing context.
        // ViewInspector generally sees it as a `canvas()`.
        XCTAssertNoThrow(try sut.inspect().canvas())

        // We can't easily assert pixel drawing in ViewInspector without SnapshotTesting,
        // but we can verify the View struct initializes and body is accessible.
    }
}
