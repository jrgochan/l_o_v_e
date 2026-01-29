import Foundation
import SoulCore

public struct SentimentEngine {
    
    /// Analyzes text and returns a corresponding Vibe.
    /// Uses a keyword-based heuristic against the Atlas of Emotions.
    public static func analyze(_ text: String, baseVibe: Vibe = Vibe(valence: 0, arousal: 0, connection: 0)) -> Vibe {
        let words = text.lowercased().components(separatedBy: .punctuationCharacters).joined().components(separatedBy: .whitespaces)
        
        var totalValence: Double = 0
        var totalArousal: Double = 0
        var totalConnection: Double = 0
        var matchCount: Double = 0
        
        // Simple O(N*M) search
        for word in words {
            // Check direct exact match first
            if let node = EmotionEngine.all.first(where: { $0.name.lowercased() == word }) {
                totalValence += node.vibe.valence
                totalArousal += node.vibe.arousal
                totalConnection += node.vibe.connection
                matchCount += 1.0
                continue
            }
            
            // Check partial or mapped synonyms
            if let score = score(for: word) {
                totalValence += score.valence
                totalArousal += score.arousal
                totalConnection += score.connection
                matchCount += 1
            }
        }
        
        if matchCount > 0 {
            // Return average of matches
            return Vibe(
                valence: totalValence / matchCount,
                arousal: totalArousal / matchCount,
                connection: totalConnection / matchCount
            )
        } else {
            return baseVibe
        }
    }
    
    // MARK: - Helper
    private struct SentimentScore {
        let valence: Double
        let arousal: Double
        let connection: Double
    }

    private static func score(for word: String) -> SentimentScore? {
        switch word {
        case "good", "great", "awesome", "yes", "love", "joy", "happy":
            return SentimentScore(valence: 0.6, arousal: 0.4, connection: 0.6)
        case "bad", "terrible", "no", "hate", "suck", "pain", "hurt":
            return SentimentScore(valence: -0.6, arousal: 0.4, connection: -0.4)
        case "calm", "chill", "relax", "peace", "zen", "breathe":
            return SentimentScore(valence: 0.3, arousal: -0.6, connection: 0.3)
        case "angry", "mad", "furious", "rage", "shut up":
            return SentimentScore(valence: -0.7, arousal: 0.9, connection: -0.3)
        case "anxious", "scared", "fear", "nervous", "worry":
            return SentimentScore(valence: -0.4, arousal: 0.7, connection: -0.1)
        case "focus", "work", "busy", "think", "study":
            return SentimentScore(valence: 0.1, arousal: 0.2, connection: -0.1)
        case "tired", "sleepy", "exhausted", "bored":
            return SentimentScore(valence: -0.2, arousal: -0.6, connection: -0.2)
        case "excited", "wow", "amazing", "energy":
            return SentimentScore(valence: 0.5, arousal: 0.8, connection: 0.4)
        default:
            return nil
        }
    }

}
