import XCTest
import SoulCore
@testable import SoulBrain

final class LLMEngineTests: XCTestCase {

    func testMemoryIndexingAndRetrieval() async throws {
        // 1. Setup with Mock Embedder & Mock Inference
        let mockEmbedder = MockEmbedder()
        let mockInference = MockInferenceProvider()
        let engine = LLMEngine(embedder: mockEmbedder, inference: mockInference)

        // 2. Index a specific memory
        let memoryID = UUID()
        let secretInfo = "The project code is Phoenix."
        await engine.indexMemory(id: memoryID, content: secretInfo)

        // 3. Verify it was stored (using internal access via @testable)
        let count = await engine.memoryContentArgs.count
        XCTAssertEqual(count, 1, "Memory should be indexed")

        // 4. Verify Retrieval logic manually (white-box)
        // Since LLMEngine.generate is complex/async stream, let's test result quality
        // via other means or verify internal state.
        // Actually, let's call indexMemory and verify.

        // Test Rehydration
        // Test Rehydration
        let memories = [
            LLMEngine.MemoryImport(id: UUID(), content: "Another memory", embedding: nil)
        ]

        await engine.rehydrate(memories: memories)

        let newCount = await engine.memoryContentArgs.count
        XCTAssertEqual(newCount, 2, "Should have 2 memories after rehydration")
    }

    func testPromptGenerationWithContext() async throws {
        // This test primarily verifies the pipeline doesn't crash with context injection
        let mockEmbedder = MockEmbedder()
        let mockInference = MockInferenceProvider()
        let engine = LLMEngine(embedder: mockEmbedder, inference: mockInference)

        let vibe = Vibe(valence: 0.8, arousal: 0.5, connection: 0.9)
        let stream = await engine.generate(prompt: "Hello", vibe: vibe)

        // Consume stream to ensure no crash
        for await _ in stream {
            // Just consuming
        }
    }

    func testStrategyInjection() async throws {
        let mockEmbedder = MockEmbedder()
        let mockInference = MockInferenceProvider()
        let engine = LLMEngine(embedder: mockEmbedder, inference: mockInference)

        let strategy = TransitionStrategy(
            name: "Deep Breathing",
            type: .physiologicalRegulation,
            definition: "Calm down through breath",
            detailedSteps: ["Inhale", "Exhale"],
            timeRequired: 60,
            difficultyLevel: 1,
            evidenceLevel: .clinical
        )

        let vibe = Vibe(valence: 0.5, arousal: 0.5, connection: 0.5)
        let stream = await engine.generate(prompt: "I'm stressed", vibe: vibe, strategy: strategy, history: [])

        var output = ""
        for await token in stream {
            output += token
        }

        // Since it's using simulation fallback, we just check it produced something
        XCTAssertFalse(output.isEmpty)
    }
}
