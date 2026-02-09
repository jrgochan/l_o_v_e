import XCTest
import SwiftUI
import ViewInspector
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor // Fix Concurrency
final class StrategyCardTests: XCTestCase {

    func testStrategyCardContent() throws {
        let strategy = TransitionStrategy(
            id: UUID(),
            name: "Deep Breath",
            type: .physiologicalRegulation,
            definition: "Take a deep breath to reset.",
            detailedSteps: ["Inhale", "Hold", "Exhale"],
            timeRequired: 120,
            difficultyLevel: 1,
            evidenceLevel: .clinical,
            researchCitations: []
        )

        let sut = StrategyCardView(strategy: strategy, onComplete: {})

        // Inspect
        let nameText = try sut.inspect().find(text: "Deep Breath").string()
        let defText = try sut.inspect().find(text: "Take a deep breath to reset.").string()
        let stepText = try sut.inspect().find(text: "Inhale").string()
        let timeText = try sut.inspect().find(text: "2 min").string() // 120 / 60

        XCTAssertEqual(nameText, "Deep Breath")
        XCTAssertEqual(defText, "Take a deep breath to reset.")
        XCTAssertEqual(stepText, "Inhale")
        XCTAssertEqual(timeText, "2 min")
    }

    func testStrategyCompletionAction() throws {
        let expectation = XCTestExpectation(description: "Complete Action Triggered")
        let strategy = TransitionStrategy(
            id: UUID(),
            name: "Test",
            type: .cognitiveReappraisal,
            definition: "Test",
            detailedSteps: [],
            timeRequired: 60,
            difficultyLevel: 1,
            evidenceLevel: .expertConsensus
        )

        let sut = StrategyCardView(strategy: strategy, onComplete: {
            expectation.fulfill()
        })

        // Find the button and tap it
        try sut.inspect().find(button: "Complete Strategy").tap()

        wait(for: [expectation], timeout: 1.0)
    }
}
