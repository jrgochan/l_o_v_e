import XCTest
import SwiftData
@testable import SoulCore

@available(macOS 14, iOS 17, *)
final class DatabaseSeederTests: XCTestCase {

    @MainActor
    func testSeeding() throws {
        // 1. Setup In-Memory Container
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        let container = try ModelContainer(for: EmotionCollection.self, Emotion.self, configurations: config)
        let context = container.mainContext

        // 2. Run Seeder
        try DatabaseSeeder.seed(modelContext: context)

        // 3. Verify Atlas Collection
        let atlasDescriptor = FetchDescriptor<EmotionCollection>(predicate: #Predicate { $0.id == "atlas_of_the_heart" })
        let collections = try context.fetch(atlasDescriptor)

        XCTAssertEqual(collections.count, 1)
        let atlas = collections.first!
        XCTAssertEqual(atlas.name, "Atlas of the Heart")
        XCTAssertTrue(atlas.isActive)

        // 4. Verify Total Collections (Atlas + Plutchik + UAL + GoEmotions = 4)
        let allCollections = try context.fetch(FetchDescriptor<EmotionCollection>())
        XCTAssertEqual(allCollections.count, 4)

        // 5. Verify Emotions Count (Should be 87 based on JSON)
        // Note: We need to ensure the relationship is loaded or fetch emotions directly
        let emotionDescriptor = FetchDescriptor<Emotion>(predicate: #Predicate { $0.collection?.id == "atlas_of_the_heart" })
        let emotions = try context.fetch(emotionDescriptor)

        // Check for full dataset count
        XCTAssertGreaterThan(emotions.count, 80)

        // 5. Verify Specific Emotion (Joy)
        let joy = emotions.first { $0.name == "Joy" }
        XCTAssertNotNil(joy)
        XCTAssertEqual(joy!.valence, 0.9, accuracy: 0.1)

        // 6. Verify Plutchik
        // let plutchikEmotions = try context.fetch(FetchDescriptor<Emotion>(predicate: #Predicate { $0.collection?.id == "plutchik_wheel" }))
        // XCTAssertGreaterThan(plutchikEmotions.count, 0)

        // 7. Verify GoEmotions
        let goEmotions = try context.fetch(FetchDescriptor<Emotion>(predicate: #Predicate { $0.collection?.id == "go_emotions" }))
        XCTAssertGreaterThan(goEmotions.count, 25)
        let realization = goEmotions.first { $0.name == "Realization" }
        XCTAssertNotNil(realization)
    }
}
