import XCTest
import SoulCore
@testable import SoulBrain

final class StrategyEngineTests: XCTestCase {

    // Mock Data
    var joy: Emotion!
    var anxiety: Emotion!
    var strategies: [TransitionStrategy]!

    override func setUp() {
        super.setUp()
        joy = Emotion(name: "Joy", definition: "Happy", category: "Positive", valence: 0.8, arousal: 0.5, connection: 0.7)
        anxiety = Emotion(name: "Anxiety", definition: "Nervous", category: "Negative", valence: -0.5, arousal: 0.9, connection: -0.2)

        strategies = [
            TransitionStrategy(name: "Box Breathing", type: .physiologicalRegulation, definition: "Calm down", detailedSteps: [], timeRequired: 300, difficultyLevel: 1, evidenceLevel: .metaAnalysis),
            TransitionStrategy(name: "Celebration", type: .behavioralActivation, definition: "Party", detailedSteps: [], timeRequired: 600, difficultyLevel: 1, evidenceLevel: .expertConsensus)
        ]
    }

    func testSuggestStrategyForCalming() {
        // High Arousal (Anxiety) -> Low Arousal (Joy/Calm) requires Regulation
        // Anxiety (0.9) -> Joy (0.5). dArousal = -0.4.
        // Needs Calming logic triggers if dArousal < -0.3.

        let suggestion = StrategyEngine.suggestStrategy(from: anxiety, to: joy, availableStrategies: strategies)

        XCTAssertNotNil(suggestion)
        XCTAssertEqual(suggestion?.name, "Box Breathing")
        XCTAssertEqual(suggestion?.type, .physiologicalRegulation)
    }

    func testApplyEffectLogic() {
        // Test that applying a strategy improves the state
        let current = Vibe(valence: 0.2, arousal: 0.8, connection: 0.2)
        // High arousal, low valence.

        let strategy = strategies[0] // Box Breathing

        let after = StrategyEngine.applyEffect(strategy: strategy, currentVibe: current)

        // Valence boost +0.2
        XCTAssertEqual(after.valence, 0.4, accuracy: 0.001)

        // Arousal regulation towards 0.5 (Diff is 0.5 - 0.8 = -0.3. Move 30% -> -0.09)
        // Expected: 0.8 - 0.09 = 0.71
        XCTAssertEqual(after.arousal, 0.71, accuracy: 0.001)

        // Connection boost +0.15
        XCTAssertEqual(after.connection, 0.35, accuracy: 0.001)
    }
}
