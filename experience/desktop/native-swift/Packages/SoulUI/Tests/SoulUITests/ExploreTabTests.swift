import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class ExploreTabTests: XCTestCase {

    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: Emotion.self, configurations: config)
    }

    func testExploreTabRendering() throws {
        let selected = Binding<String?>(wrappedValue: nil)
        let sut = ExploreTab(selectedEmotion: selected, activeCollectionName: "Plutchik", onSearch: { _ in [] })
            .modelContainer(container)

        // Verify List Exists
        XCTAssertNoThrow(try sut.inspect().list())

        // Verify Searchable exists (ViewInspector support for searchable is limited, 
        // but we can check if the view hierarchy constructs without crash)
    }
}
