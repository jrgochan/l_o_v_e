import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore
@testable import SoulChat

@available(macOS 14, iOS 17, *)
@MainActor
final class SessionReplayViewTests: XCTestCase {
    
    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        // Need Message + Emotion (for SoulView query)
        container = try ModelContainer(for: SessionAnalytics.self, Message.self, Emotion.self, configurations: config)
    }

    func testSessionReplayControls() throws {
        let session = SessionAnalytics(startTime: Date(), startValence: 0.5, startArousal: 0.5)
        session.endTime = Date().addingTimeInterval(60)
        session.messageCount = 10
        
        container.mainContext.insert(session)
        
        let sut = SessionReplayView(session: session)
            .modelContainer(container)

        // Verify Controls
        XCTAssertNoThrow(try sut.inspect().find(text: "Replay"))
        
        // Verify Slider
        XCTAssertNoThrow(try sut.inspect().find(ViewType.Slider.self))
    }
}
