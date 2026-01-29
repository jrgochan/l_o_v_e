import Foundation
import SwiftData
import SoulCore
import SoulBrain

/// Manages semantic search capabilities including embedding generation and vector indexing.
actor SemanticSearchManager {
    private let embedder: Embedder
    private let index: VectorIndex
    private let context: ModelContext

    init(context: ModelContext, embedder: Embedder) {
        self.context = context
        self.embedder = embedder
        self.index = VectorIndex()
    }

    /// Indexes all emotions currently in the database into the VectorIndex
    func indexEmotions() async {
        print("🔍 Semantic Search: Indexing emotions...")
        do {
            let descriptor = FetchDescriptor<Emotion>()
            let emotions = try context.fetch(descriptor)

            for emotion in emotions {
                // Enrich the embedding text with definition and category
                let text = "\(emotion.name). \(emotion.definition). Category: \(emotion.category)"

                if let vector = try? await embedder.embed(text) {
                    index.add(id: emotion.id, vector: vector)
                }
            }
            print("✅ Semantic Search: Indexed \(emotions.count) emotions.")
        } catch {
            print("❌ Semantic Search: Indexing failed: \(error)")
        }
    }

    /// Performs a semantic search against the indexed emotions
    func search(query: String, limit: Int = 20) async -> [Emotion] {
        guard !query.isEmpty else { return [] }

        do {
            let queryVec = try await embedder.embed(query)
            let matchIds = index.search(query: queryVec, limit: limit)

            // Resolve IDs to Objects (Preserving Order)
            let allEmotions = try context.fetch(FetchDescriptor<Emotion>())
            let emotionMap = Dictionary(uniqueKeysWithValues: allEmotions.map { ($0.id, $0) })

            return matchIds.compactMap { emotionMap[$0] }
        } catch {
            print("❌ Semantic Search: Query failed: \(error)")
            return []
        }
    }
}
