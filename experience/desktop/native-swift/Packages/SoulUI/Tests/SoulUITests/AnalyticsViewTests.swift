import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class AnalyticsViewTests: XCTestCase {
    
    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: SessionAnalytics.self, configurations: config)
    }

    func testAnalyticsViewStructure() throws {
        let sut = AnalyticsView()
            .modelContainer(container)

        // Verify NavigationSplitView
        XCTAssertNoThrow(try sut.inspect().find(ViewType.NavigationSplitView.self))
        
        // Verify HistorySessionList
        XCTAssertNoThrow(try sut.inspect().find(HistorySessionList.self))
    }
}
