import Foundation

/// Logic for mapping concepts to Valance/Arousal coordinates.
public struct EmotionEngine {

    public init() {}

    public struct EmotionNode: Hashable, Sendable {
        public let name: String
        public let vibe: Vibe

        public init(name: String, valence: Double, arousal: Double, connection: Double) {
            self.name = name
            self.vibe = Vibe(valence: valence, arousal: arousal, connection: connection)
        }

        public func hash(into hasher: inout Hasher) {
            hasher.combine(name)
        }

        public static func == (lhs: EmotionNode, rhs: EmotionNode) -> Bool {
            return lhs.name == rhs.name
        }
    }

    /// The Atlas of the Heart: Known emotional states serve as graph nodes.
    public static let all: [EmotionNode] = [
        // High Energy / Positive
        EmotionNode(name: "Joy", valence: 0.9, arousal: 0.7, connection: 0.8),
        EmotionNode(name: "Excited", valence: 0.8, arousal: 0.9, connection: 0.7),

        // Low Energy / Positive
        EmotionNode(name: "Peace", valence: 0.6, arousal: -0.8, connection: 0.6),
        EmotionNode(name: "Content", valence: 0.5, arousal: -0.6, connection: 0.5),

        // High Energy / Negative
        EmotionNode(name: "Anger", valence: -0.7, arousal: 0.8, connection: -0.3),
        EmotionNode(name: "Fear", valence: -0.8, arousal: 0.9, connection: -0.5),
        EmotionNode(name: "Frustration", valence: -0.5, arousal: 0.6, connection: -0.2),

        // Low Energy / Negative
        EmotionNode(name: "Sadness", valence: -0.6, arousal: -0.4, connection: -0.4),
        EmotionNode(name: "Grief", valence: -0.9, arousal: -0.4, connection: 0.5), // High connection
        EmotionNode(name: "Despair", valence: -0.9, arousal: -0.8, connection: -0.9),

        // Neutral / Bridge States
        EmotionNode(name: "Neutral", valence: 0.0, arousal: 0.0, connection: 0.0),
        EmotionNode(name: "Vulnerability", valence: -0.2, arousal: 0.1, connection: 0.8), // Bridge to Connection
        EmotionNode(name: "Acceptance", valence: 0.3, arousal: -0.3, connection: 0.4), // Bridge out of Grip
        EmotionNode(name: "Surprise", valence: 0.1, arousal: 0.8, connection: 0.2)
    ]

    public static func coordinates(for keyword: String) -> Vibe? {
        if let node = all.first(where: { $0.name.lowercased() == keyword.lowercased() }) {
            return node.vibe
        }
        return nil
    }
}
