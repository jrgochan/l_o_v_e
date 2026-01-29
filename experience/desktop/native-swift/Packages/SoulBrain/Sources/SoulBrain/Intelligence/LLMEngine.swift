import Foundation
import SoulCore
import OSLog

/// Abstract provider for LLM generation.
public protocol InferenceProvider: Sendable {
    /// Loads the model resources (weights, tokenizer).
    func load() async throws

    /// Generates a response stream.
    func generate(prompt: String) async -> AsyncStream<String>

    /// Returns true if the model is ready for inference.
    var isReady: Bool { get async }
}

/// The Intelligence Engine powering the "Mind".
/// Coordinates Memory Retrieval and Inference Generation.
public actor LLMEngine {

    internal let memoryIndex = VectorIndex()
    internal var memoryContentArgs: [UUID: String] = [:]

    private let embedder: Embedder
    private let inference: InferenceProvider
    private let logger = Logger(subsystem: "com.soul.brain", category: "LLMEngine")

    // Default to Mock for now in Preview/Tests, but MLX in Production?
    // User requested decoupling.
    // Ideally: init(embedder: Embedder = MLXEmbedder(), inference: InferenceProvider = MLXInferenceProvider())
    // BUT MLXInferenceProvider is in same module? Yes.

    public init(embedder: Embedder, inference: InferenceProvider) {
        self.embedder = embedder
        self.inference = inference
        logger.info("Initializing with \(type(of: inference))...")
    }

    // Convenience Init for Production (uses MLX)
    // Note: Requires MLX imports available?
    // We can leave this out and let the App Composition Root inject it,
    // OR we keep it if we import MLX here or use a Factory.
    // For now, let's keep it simple and require injection or provide a static factory?
    // Let's stick to explicit injection to force good habits, or default to MLX if possible.
    // To compile, we need MLXInferenceProvider visible.

    // MARK: - Lifecycle

    public func loadModel() async {
        do {
            try await inference.load()
            // Load Embedder too
            try? await embedder.load()
        } catch {
            logger.error("Failed to load inference provider: \(error)")
        }
    }

    // MARK: - Memory Management

    public func indexMemory(id: UUID, content: String) async {
        do {
            let vector = try await embedder.embed(content)
            memoryIndex.add(id: id, vector: vector)
            memoryContentArgs[id] = content
            logger.debug("Indexed memory '\(content.prefix(20))...'")
        } catch {
            logger.error("Failed to embed memory: \(error)")
        }
    }

    public struct MemoryImport {
        public let id: UUID
        public let content: String
        public let embedding: Data?

        public init(id: UUID, content: String, embedding: Data?) {
            self.id = id
            self.content = content
            self.embedding = embedding
        }
    }

    public func rehydrate(memories: [MemoryImport]) async {
        print("🧠 LLMEngine: Rehydrating \(memories.count) memories...")
        var loadedCount = 0

        for item in memories {
            if let data = item.embedding {
                let vector = data.withUnsafeBytes {
                    Array($0.bindMemory(to: Float.self))
                }
                memoryIndex.add(id: item.id, vector: vector)
                memoryContentArgs[item.id] = item.content
                loadedCount += 1
            } else {
                await indexMemory(id: item.id, content: item.content)
            }
        }
        logger.info("Rehydrated \(loadedCount) memories from cache.")
    }

    public func seedDebugMemories() async {
        print("🧠 LLMEngine: Seeding debug memories...")
        let memories = [
            "User enjoys late night coding sessions.",
            "User feels calm when listening to rain sounds.",
            "User is working on a Soul project using Swift."
        ]
        for mem in memories {
            await indexMemory(id: UUID(), content: mem)
        }
    }

    // MARK: - Generation

    public func generate(
        prompt: String,
        vibe: Vibe,
        strategy: TransitionStrategy? = nil,
        history: [(role: String, content: String)] = []
    ) -> AsyncStream<String> {
        AsyncStream { continuation in
            Task {
                // 1. Context Retrieval (RAG)
                var relevantMemories: [String] = []
                do {
                    let queryVec = try await embedder.embed(prompt)
                    let matches = memoryIndex.search(query: queryVec, limit: 3)
                    relevantMemories = matches.compactMap { memoryContentArgs[$0] }
                    if !relevantMemories.isEmpty {
                        logger.debug("Recalled \(relevantMemories.count) memories")
                    }
                } catch {
                    logger.error("Retrieval failed: \(error)")
                }

                // 2. Prompt Construction
                let fullPrompt = SoulPersona.constructPrompt(
                    userPrompt: prompt,
                    vibe: vibe,
                    memories: relevantMemories,
                    activeStrategy: strategy,
                    history: history
                )

                // 3. Inference
                let stream = await inference.generate(prompt: fullPrompt)
                for await token in stream {
                    continuation.yield(token)
                }

                continuation.finish()
            }
        }
    }
}
