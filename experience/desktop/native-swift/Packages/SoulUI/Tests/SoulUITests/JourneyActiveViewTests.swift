import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class JourneyActiveViewTests: XCTestCase {
    
    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: Emotion.self, TransitionPattern.self, TransitionStrategy.self, configurations: config)
    }

    func testJourneyActiveCalculatngState() throws {
        let start = Emotion(name: "A", definition: "A", category: "A", valence: 0, arousal: 0, connection: 0)
        let goal = Emotion(name: "B", definition: "B", category: "B", valence: 1, arousal: 1, connection: 1)
        
        let sut = JourneyActiveView(start: start, goal: goal)
            .modelContainer(container)

        // Should start in calculating state
        XCTAssertNoThrow(try sut.inspect().find(text: "Calculating Path..."))
    }
}
