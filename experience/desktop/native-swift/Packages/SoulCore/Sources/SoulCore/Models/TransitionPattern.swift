import Foundation
import SwiftData

/// Represents a valid psychological transition between two emotional categories.
/// Mirrors `transition_patterns` from Observer.
@Model
@available(macOS 14, iOS 17, *)
public final class TransitionPattern {
    @Attribute(.unique) public var id: UUID
    public var name: String
    public var fromCategory: String
    public var toCategory: String
    public var difficultyScore: Double // 0.0 to 1.0 (Higher is harder)
    public var psychologicalReasoning: String
    
    // Relationship to strategies recommended for this pattern
    public var strategies: [TransitionStrategy]
    
    public init(
        id: UUID = UUID(),
        name: String,
        fromCategory: String,
        toCategory: String,
        difficultyScore: Double,
        psychologicalReasoning: String,
        strategies: [TransitionStrategy] = []
    ) {
        self.id = id
        self.name = name
        self.fromCategory = fromCategory
        self.toCategory = toCategory
        self.difficultyScore = difficultyScore
        self.psychologicalReasoning = psychologicalReasoning
        self.strategies = strategies
    }
}
