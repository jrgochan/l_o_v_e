import XCTest
import SwiftData
@testable import SoulCore

@MainActor
final class CollectionManagerTests: XCTestCase {

    var container: ModelContainer!
    var context: ModelContext!
    var manager: CollectionManager!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: EmotionCollection.self, Emotion.self, configurations: config)
        context = container.mainContext

        // Seed Data
        let col1 = EmotionCollection(id: "col1", name: "Collection A", desc: "Test A", isActive: true)
        let col2 = EmotionCollection(id: "col2", name: "Collection B", desc: "Test B", isActive: false)
        context.insert(col1)
        context.insert(col2)

        manager = CollectionManager(context: context)
    }

    func testInitialState() {
        XCTAssertEqual(manager.activeCollectionName, "Collection A")
    }

    func testSwitchByName() {
        manager.switchCollection(toName: "Collection B")

        XCTAssertEqual(manager.activeCollectionName, "Collection B")

        // Verify DB
        let colB = try! context.fetch(FetchDescriptor<EmotionCollection>(predicate: #Predicate { $0.name == "Collection B" })).first!
        XCTAssertTrue(colB.isActive)

        let colA = try! context.fetch(FetchDescriptor<EmotionCollection>(predicate: #Predicate { $0.name == "Collection A" })).first!
        XCTAssertFalse(colA.isActive)
    }

    func testSwitchById() {
        manager.switchCollection(to: "col2")
        XCTAssertEqual(manager.activeCollectionName, "Collection B")
    }
}
