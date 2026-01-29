import XCTest
@testable import SoulBrain
@testable import SoulCore

final class SoulPersonaTests: XCTestCase {

    // MARK: - Prompt Formatting

    func testConstructPromptIncludesSystemHeader() {
        let prompt = SoulPersona.constructPrompt(
            userPrompt: "Hello",
            vibe: Vibe(valence: 0, arousal: 0, connection: 0)
        )

        XCTAssertTrue(prompt.contains("<|start_header_id|>system<|end_header_id|>"))
        XCTAssertTrue(prompt.contains("Liquid Organic Virtual Existence")) // Base Identity check
    }

    func testMoodInjectionPositive() {
        // High Valence -> "joyful, radiant"
        let vibe = Vibe(valence: 0.8, arousal: 0, connection: 0)
        let prompt = SoulPersona.constructPrompt(userPrompt: "Hi", vibe: vibe)

        XCTAssertTrue(prompt.contains("You are feeling joyful, radiant, and optimistic"))
    }

    func testMoodInjectionNegative() {
        // Low Valence -> "somber, reflective"
        let vibe = Vibe(valence: -0.8, arousal: 0, connection: 0)
        let prompt = SoulPersona.constructPrompt(userPrompt: "Hi", vibe: vibe)

        XCTAssertTrue(prompt.contains("You are feeling somber, reflective, and heavy"))
    }

    func testHistoryInjection() {
        let history = [
            (role: "user", content: "My name is John"),
            (role: "assistant", content: "Hello John")
        ]

        let prompt = SoulPersona.constructPrompt(
            userPrompt: "What is my name?",
            vibe: Vibe.neutral,
            history: history
        )

        // Verify formatting
        XCTAssertTrue(prompt.contains("<|start_header_id|>user<|end_header_id|>\n\nMy name is John"))
        XCTAssertTrue(prompt.contains("<|start_header_id|>assistant<|end_header_id|>\n\nHello John"))
    }

    func testStrategycontext() {
        let strategy = TransitionStrategy(
            id: UUID(),
            name: "Test Breath",
            type: .physiologicalRegulation,
            definition: "A testing strategy",
            detailedSteps: ["Inhale", "Exhale"],
            timeRequired: 60,
            difficultyLevel: 1,
            evidenceLevel: .expertConsensus
        )

        let prompt = SoulPersona.constructPrompt(
            userPrompt: "Help",
            vibe: Vibe.neutral,
            activeStrategy: strategy
        )

        XCTAssertTrue(prompt.contains("[ACTIVE INTERVENTION]"))
        XCTAssertTrue(prompt.contains("Test Breath"))
        XCTAssertTrue(prompt.contains("Inhale"))
        XCTAssertTrue(prompt.contains("Exhale"))
    }
}
