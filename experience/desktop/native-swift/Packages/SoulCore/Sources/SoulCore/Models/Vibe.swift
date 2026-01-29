import Foundation
import simd

/// Represents a discrete emotional state at a specific point in time.
public struct Vibe: Codable, Sendable {
    public let id: UUID
    public let timestamp: Date
    
    /// Emotional Valence: -1.0 (Very Unpleasant) to 1.0 (Very Pleasant)
    public let valence: Double
    
    /// Emotional Arousal: -1.0 (Low Energy) to 1.0 (High Energy)
    public let arousal: Double
    
    /// Emotional Connection: -1.0 (Disconnected) to 1.0 (Connected)
    public let connection: Double
    
    public init(id: UUID = UUID(), timestamp: Date = Date(), valence: Double, arousal: Double, connection: Double) {
        self.id = id
        self.timestamp = timestamp
        // Clamp values for safety (-1.0 to 1.0 for all axes)
        self.valence = max(-1.0, min(1.0, valence))
        self.arousal = max(-1.0, min(1.0, arousal))
        self.connection = max(-1.0, min(1.0, connection))
    }
    
    /// Returns the quaternion representation of this Vibe.
    public var quaternion: simd_quatf {
        SoulMath.VACVector(valence: Float(valence), arousal: Float(arousal), connection: Float(connection)).toQuaternion()
    }
    
    public static var neutral: Vibe {
        Vibe(valence: 0, arousal: 0, connection: 0)
    }
}
