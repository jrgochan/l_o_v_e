import Foundation
import SwiftData

/// Represents an active or past emotional transition journey.
/// Mirrors `user_journeys` from Observer.
@Model
@available(macOS 14, iOS 17, *)
public final class UserJourney {
    @Attribute(.unique) public var id: UUID
    public var startEmotion: Emotion?
    public var goalEmotion: Emotion?
    @Relationship(deleteRule: .cascade) public var waypoints: [JourneyWaypoint]
    public var status: JourneyStatus
    public var startedAt: Date
    public var completedAt: Date?
    
    // Metadata for analytics
    public var context: String?
    
    public init(
        id: UUID = UUID(),
        startEmotion: Emotion?,
        goalEmotion: Emotion?,
        waypoints: [JourneyWaypoint] = [],
        status: JourneyStatus = .inProgress,
        startedAt: Date = Date(),
        context: String? = nil
    ) {
        self.id = id
        self.startEmotion = startEmotion
        self.goalEmotion = goalEmotion
        self.waypoints = waypoints
        self.status = status
        self.startedAt = startedAt
        self.context = context
    }
}

/// Represents a specific milestone in a journey.
/// Mirrors `journey_waypoints` from Observer.
@Model
@available(macOS 14, iOS 17, *)
public final class JourneyWaypoint {
    @Attribute(.unique) public var id: UUID
    public var orderIndex: Int
    public var targetEmotion: Emotion?
    public var isReached: Bool
    public var reachedAt: Date?
    public var strategiesTried: [String] // IDs or names of strategies used
    
    // Inverse relationship (optional, but good for navigation)
    @Relationship(inverse: \UserJourney.waypoints) public var journey: UserJourney?
    
    public init(
        id: UUID = UUID(),
        orderIndex: Int,
        targetEmotion: Emotion?,
        isReached: Bool = false,
        reachedAt: Date? = nil,
        strategiesTried: [String] = []
    ) {
        self.id = id
        self.orderIndex = orderIndex
        self.targetEmotion = targetEmotion
        self.isReached = isReached
        self.reachedAt = reachedAt
        self.strategiesTried = strategiesTried
    }
}

public enum JourneyStatus: String, Codable, CaseIterable {
    case inProgress = "in_progress"
    case completed = "completed"
    case abandoned = "abandoned"
}
