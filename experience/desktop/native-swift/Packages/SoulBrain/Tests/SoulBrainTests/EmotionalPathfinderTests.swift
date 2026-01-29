import XCTest
import SoulCore
@testable import SoulBrain

final class EmotionalPathfinderTests: XCTestCase {

    // Mock Data
    var joy: Emotion!
    var neutral: Emotion!
    var sadness: Emotion!
    var anger: Emotion!
    var allEmotions: [Emotion]!
    var patterns: [TransitionPattern]!

    override func setUp() {
        super.setUp()

        joy = Emotion(name: "Joy", definition: "High energy positive", category: "Positive", valence: 0.8, arousal: 0.6, connection: 0.7)
        neutral = Emotion(name: "Neutral", definition: "Baseline", category: "Neutral", valence: 0.0, arousal: 0.0, connection: 0.0)
        sadness = Emotion(name: "Sadness", definition: "Low energy negative", category: "Negative", valence: -0.6, arousal: -0.4, connection: -0.2)
        anger = Emotion(name: "Anger", definition: "High energy negative", category: "Negative", valence: -0.6, arousal: 0.7, connection: -0.3)

        allEmotions = [joy, neutral, sadness, anger]

        // Define Patterns
        patterns = [
            TransitionPattern(name: "Calm Down", fromCategory: "Positive", toCategory: "Neutral", difficultyScore: 1.0, psychologicalReasoning: "Reduce arousal"),
            TransitionPattern(name: "Get Sad", fromCategory: "Neutral", toCategory: "Negative", difficultyScore: 1.0, psychologicalReasoning: "Drop valence"),
            TransitionPattern(name: "Recovery", fromCategory: "Negative", toCategory: "Neutral", difficultyScore: 2.0, psychologicalReasoning: "Stabilize"),
            TransitionPattern(name: "Cheer Up", fromCategory: "Neutral", toCategory: "Positive", difficultyScore: 1.5, psychologicalReasoning: "Increase valence")
        ]
    }

    func testSameCategoryPath() {
        // Joy -> Joy (Same node)
        let path = EmotionalPathfinder.findPath(from: joy, to: joy, using: allEmotions, patterns: patterns)
        XCTAssertNotNil(path)
        XCTAssertEqual(path?.count, 1)
        XCTAssertEqual(path?.first?.name, "Joy")
    }

    func testDirectConnectionIfCloseEnough() {
        // Assuming we add a node close to Joy in same category
        let excited = Emotion(name: "Excited", definition: "Very high energy", category: "Positive", valence: 0.9, arousal: 0.8, connection: 0.8)
        var extendedPool = allEmotions!
        extendedPool.append(excited)

        let path = EmotionalPathfinder.findPath(from: joy, to: excited, using: extendedPool, patterns: patterns)
        XCTAssertNotNil(path)
        // Should be Joy -> Excited given they are close and same category
        XCTAssertEqual(path?.count, 2)
        XCTAssertEqual(path?.first?.name, "Joy")
        XCTAssertEqual(path?.last?.name, "Excited")
    }

    func testMultiStepPathViaNeutral() {
        // Joy (Positive) -> Sadness (Negative)
        // Direct jump is far (dist ~ 1.7 > 1.5 probably) AND different category.
        // Needs Positive -> Neutral -> Negative pattern chain.

        let path = EmotionalPathfinder.findPath(from: joy, to: sadness, using: allEmotions, patterns: patterns)

        XCTAssertNotNil(path, "Should find a path")
        // Expected: Joy -> Neutral -> Sadness
        guard let p = path else { return }

        XCTAssertGreaterThanOrEqual(p.count, 3)
        XCTAssertEqual(p.first?.name, "Joy")
        XCTAssertEqual(p.last?.name, "Sadness")

        // Verify middle node is Neutral
        XCTAssertTrue(p.contains(where: { $0.name == "Neutral" }), "Path should go through Neutral")
    }

    func testNoPathIfNoPattern() {
        // Break the chain: Remove Neutral -> Negative pattern
        let brokenPatterns = [
             TransitionPattern(name: "Calm Down", fromCategory: "Positive", toCategory: "Neutral", difficultyScore: 1.0, psychologicalReasoning: "Reduce arousal")
             // Missing Neutral -> Negative
        ]

        // Joy -> Sadness
        let path = EmotionalPathfinder.findPath(from: joy, to: sadness, using: allEmotions, patterns: brokenPatterns)

        // Should fail because direct jump is too far/invalid category, and bridge is broken
        XCTAssertNil(path, "Should not find path if patterns don't link")
    }
}
