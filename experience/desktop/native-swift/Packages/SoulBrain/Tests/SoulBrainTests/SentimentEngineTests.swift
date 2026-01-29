import XCTest
@testable import SoulBrain
@testable import SoulCore

final class SentimentEngineTests: XCTestCase {
    
    // MARK: - Basic Analysis
    
    func testNeutralTextReturnsBaseVibe() {
        let text = "The quick brown fox"
        let base = Vibe(valence: 0, arousal: 0, connection: 0)
        let result = SentimentEngine.analyze(text, baseVibe: base)
        
        XCTAssertEqual(result.valence, 0, accuracy: 0.01)
        XCTAssertEqual(result.arousal, 0, accuracy: 0.01)
        XCTAssertEqual(result.connection, 0, accuracy: 0.01)
    }
    
    func testPositiveExactMatch() {
        let text = "I feel happy" // happy -> (0.6, 0.4, 0.6)
        let result = SentimentEngine.analyze(text)
        
        // Match count = 1 ("happy")
        XCTAssertEqual(result.valence, 0.6, accuracy: 0.01)
        XCTAssertEqual(result.arousal, 0.4, accuracy: 0.01)
    }
    
    func testNegativeExactMatch() {
        let text = "This is terrible" // terrible -> (-0.6, 0.4, -0.4)
        let result = SentimentEngine.analyze(text)
        
        XCTAssertEqual(result.valence, -0.6, accuracy: 0.01)
        XCTAssertEqual(result.arousal, 0.4, accuracy: 0.01)
    }
    
    // MARK: - Averaging Logic
    
    func testMixedSentimentAveraging() {
        // "happy" (0.6, 0.4) + "sadness" (from EmotionEngine ~ -0.6?, assume atlas mapping)
        // Let's use known words from internal switch first to be deterministic
        // "happy" (0.6, 0.4, 0.6)
        // "hate" (-0.6, 0.4, -0.4)
        
        let text = "I happy hate this"
        let result = SentimentEngine.analyze(text)
        
        // Avg Valence: (0.6 - 0.6) / 2 = 0
        // Avg Arousal: (0.4 + 0.4) / 2 = 0.4
        // Avg Connection: (0.6 - 0.4) / 2 = 0.1
        
        XCTAssertEqual(result.valence, 0, accuracy: 0.01)
        XCTAssertEqual(result.arousal, 0.4, accuracy: 0.01)
        XCTAssertEqual(result.connection, 0.1, accuracy: 0.01)
    }
    
    // MARK: - Punctuation & Case
    
    func testPunctuationHandling() {
        let text = "Joy! Joy..." // "Joy" matches EmotionEngine (0.9, 0.7, 0.8)
        let result = SentimentEngine.analyze(text)
        
        // Should match "joy" twice
        XCTAssertEqual(result.valence, 0.9, accuracy: 0.01)
    }
    
    func testCaseInsensitivity() {
        let text = "JOY"
        let result = SentimentEngine.analyze(text)
        XCTAssertEqual(result.valence, 0.9, accuracy: 0.01)
    }
    
    // MARK: - Base Vibe Fallback
    
    func testUsesProvidedBaseVibeWhenNoMatches() {
        let base = Vibe(valence: 0.5, arousal: 0.5, connection: 0.5)
        let text = "nothing matches here"
        let result = SentimentEngine.analyze(text, baseVibe: base)
        
        XCTAssertEqual(result.valence, 0.5, accuracy: 0.01)
    }
}
