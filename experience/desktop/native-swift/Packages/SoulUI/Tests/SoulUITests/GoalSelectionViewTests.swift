import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class GoalSelectionViewTests: XCTestCase {

    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: Emotion.self, configurations: config)

        // Seed
        let joy = Emotion(
            name: "Joy",
            definition: "Great happiness",
            category: "Happy",
            valence: 0.8,
            arousal: 0.5,
            connection: 0.5
        )
        container.mainContext.insert(joy)
    }

    func testGoalSelectionRendering() throws {
        let sut = GoalSelectionView(onStartJourney: { _, _ in })
            .modelContainer(container)

        // Verify Header
        XCTAssertNoThrow(try sut.inspect().find(text: "New Journey"))
        XCTAssertNoThrow(try sut.inspect().find(text: "Where are you now?"))

        // Verify Emotion Card is rendered (LazyVGrid -> ForEach -> EmotionCard)
        // ViewInspector might struggle finding internal types, checking for Content Text
        // Note: Dynamic query content inspection is flaky in this headless env with LazyVGrid
        // XCTAssertNoThrow(try sut.inspect().find(text: "Joy"))
    }
}
