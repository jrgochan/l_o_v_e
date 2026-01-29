import Foundation
import SwiftData

/// Represents a curated dataset of emotions (e.g., "Atlas of the Heart", "Plutchik").
/// Allows the user to switch between different emotional frameworks.
@Model
@available(macOS 14, iOS 17, *)
public final class EmotionCollection {
    @Attribute(.unique) public var id: String // e.g., "atlas_of_the_heart"
    public var name: String // e.g., "Atlas of the Heart"
    public var desc: String // "Brené Brown's framework..."
    public var isActive: Bool

    @Relationship(deleteRule: .cascade, inverse: \Emotion.collection)
    public var emotions: [Emotion]?

    public init(id: String, name: String, desc: String, isActive: Bool = false) {
        self.id = id
        self.name = name
        self.desc = desc
        self.isActive = isActive
    }
}
