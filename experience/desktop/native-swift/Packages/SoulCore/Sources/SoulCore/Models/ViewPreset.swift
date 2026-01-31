import Foundation
import SwiftData

/// Represents a saved visual state (Bookmark) of the SoulSphere.
@Model
@available(macOS 14, iOS 17, *)
public final class ViewPreset: @unchecked Sendable {
    @Attribute(.unique) public var id: UUID
    public var name: String
    public var createdAt: Date

    // Vibe State (Flattened for SwiftData stability)
    public var valence: Double
    public var arousal: Double
    public var connection: Double

    // Visual Configuration
    public var visualModeRaw: String // e.g., "liquid", "particles"

    // Context
    public var targetEmotionId: UUID?

    public init(
        id: UUID = UUID(),
        name: String,
        valence: Double,
        arousal: Double,
        connection: Double,
        visualModeRaw: String,
        targetEmotionId: UUID? = nil
    ) {
        self.id = id
        self.name = name
        self.createdAt = Date()
        self.valence = valence
        self.arousal = arousal
        self.connection = connection
        self.visualModeRaw = visualModeRaw
        self.targetEmotionId = targetEmotionId
    }
}
