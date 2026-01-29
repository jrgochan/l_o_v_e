import XCTest
import SwiftData
@testable import SoulCore

@MainActor
final class ViewPresetTests: XCTestCase {
    
    var container: ModelContainer!
    var context: ModelContext!
    
    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: ViewPreset.self, configurations: config)
        context = container.mainContext
    }
    
    func testSaveAndFetchBookmark() throws {
        let bookmark = ViewPreset(
            name: "Zen Mode",
            valence: 0.8,
            arousal: 0.2,
            connection: 0.9,
            visualModeRaw: "particles"
        )
        
        context.insert(bookmark)
        try context.save()
        
        let descriptor = FetchDescriptor<ViewPreset>(predicate: #Predicate { $0.name == "Zen Mode" })
        let fetched = try context.fetch(descriptor).first
        
        XCTAssertNotNil(fetched)
        XCTAssertEqual(fetched?.valence, 0.8)
        XCTAssertEqual(fetched?.visualModeRaw, "particles")
        XCTAssertNotNil(fetched?.createdAt)
    }
    
    func testUpdateBookmark() throws {
        let bookmark = ViewPreset(
            name: "Draft",
            valence: 0,
            arousal: 0,
            connection: 0,
            visualModeRaw: "liquid"
        )
        context.insert(bookmark)
        
        bookmark.name = "Final"
        bookmark.visualModeRaw = "mesh"
        
        try context.save()
        
        let fetched = try context.fetch(FetchDescriptor<ViewPreset>()).first
        XCTAssertEqual(fetched?.name, "Final")
        XCTAssertEqual(fetched?.visualModeRaw, "mesh")
    }
}
