import Foundation
import SwiftData
import SoulCore
import SoulBrain

/// Manages semantic search capabilities including embedding generation and vector indexing.
@available(macOS 14, iOS 17, *)
actor SemanticSearchManager: ModelActor {
    nonisolated public let modelContainer: ModelContainer
    nonisolated public let modelExecutor: any ModelExecutor
    
    private let embedder: Embedder
    private let index: VectorIndex

    init(container: ModelContainer, embedder: Embedder) {
        self.modelContainer = container
        let context = ModelContext(container)
        self.modelExecutor = DefaultSerialModelExecutor(modelContext: context)
        
        self.embedder = embedder
        self.index = VectorIndex()
    }

    /// Indexes all emotions currently in the database into the VectorIndex
    func indexEmotions() async {
        print("🔍 Semantic Search: Indexing emotions...")
        do {
            let descriptor = FetchDescriptor<Emotion>()
            let emotions = try modelContext.fetch(descriptor)

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
    func search(query: String, limit: Int = 20) async -> [UUID] {
        guard !query.isEmpty else { return [] }

        do {
            let queryVec = try await embedder.embed(query)
            let matchIds = index.search(query: queryVec, limit: limit)
            return matchIds
        } catch {
            print("❌ Semantic Search: Query failed: \(error)")
            return []
        }
    }
}
