import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class BookmarksTabTests: XCTestCase {

    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: ViewPreset.self, configurations: config)
    }

    func testBookmarksEmptyState() throws {
        let sut = BookmarksTab(onSave: {}, onRestore: { _ in })
            .modelContainer(container)

        // Verify "No Bookmarks" text via ContentUnavailableView
        // ViewInspector v0.9.11+ supports ContentUnavailableView inspection
        // If not, we look for the Text directly.
        XCTAssertNoThrow(try sut.inspect().find(text: "No Bookmarks"))

        // Use ViewInspector specific find approach for ContentUnavailable if needed,
        // but text search is robust.
    }
}
