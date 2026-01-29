import Foundation
import SwiftData
import simd
/// Represents a specific emotion definition within a collection.
/// Includes the semantic definition and the mathematical VAC vector.
@Model
@available(macOS 14, iOS 17, *)
public final class Emotion {
    @Attribute(.unique) public var id: UUID
    public var name: String
    public var definition: String
    public var category: String
    
    // VAC Vector (Valance, Arousal, Connection)
    public var valence: Double
    public var arousal: Double
    public var connection: Double
    
    // UI Hints
    public var colorHint: String? // Hex e.g., "#FF0000"
    public var hapticHint: String? // e.g., "HEAVY_THROB"
    
    @Relationship public var collection: EmotionCollection?
    
    public init(
        id: UUID = UUID(),
        name: String,
        definition: String,
        category: String,
        valence: Double,
        arousal: Double,
        connection: Double,
        colorHint: String? = nil,
        hapticHint: String? = nil
    ) {
        self.id = id
        self.name = name
        self.definition = definition
        self.category = category
        self.valence = valence
        self.arousal = arousal
        self.connection = connection
        self.colorHint = colorHint
        self.hapticHint = hapticHint
    }
    
    /// Converts this storage model to a lightweight Vibe struct for math operations
    public var vibe: Vibe {
        Vibe(valence: valence, arousal: arousal, connection: connection)
    }
    
    /// Returns the quaternion representation of this emotion's VAC state.
    public var quaternion: simd_quatf {
        SoulMath.VACVector(valence: Float(valence), arousal: Float(arousal), connection: Float(connection)).toQuaternion()
    }
}
