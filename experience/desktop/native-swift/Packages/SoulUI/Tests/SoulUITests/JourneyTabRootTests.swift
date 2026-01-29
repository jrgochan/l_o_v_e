import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class JourneyTabRootTests: XCTestCase {

    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: Emotion.self, configurations: config)
    }

    func testJourneyTabRootNavigation() throws {
        let sut = JourneyTabRoot()
            .modelContainer(container)

        // Verify NavigationStack exists
        XCTAssertNoThrow(try sut.inspect().find(ViewType.NavigationStack.self))

        // Initial state should show GoalSelectionView
        XCTAssertNoThrow(try sut.inspect().find(GoalSelectionView.self))
    }
}
