import XCTest
import SwiftUI
import ViewInspector
import SwiftData
@testable import SoulUI
@testable import SoulCore

@available(macOS 14, iOS 17, *)
@MainActor
final class PathsTabTests: XCTestCase {
    
    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        // PathsTab queries TransitionPattern
        container = try ModelContainer(for: TransitionPattern.self, configurations: config)
    }

    func testPathsTabForm() throws {
        let computed = Binding<[String]>(wrappedValue: [])
        let playing = Binding<Bool>(wrappedValue: false)
        
        let sut = PathsTab(emotions: [], computedPath: computed, isPlayingPath: playing)
            .modelContainer(container)

        // Verify structure
        XCTAssertNoThrow(try sut.inspect().vStack())
        XCTAssertNoThrow(try sut.inspect().find(text: "Create Journey"))
        
        // Verify Buttons exist
        XCTAssertNoThrow(try sut.inspect().find(button: "Generate Path"))
    }
}
