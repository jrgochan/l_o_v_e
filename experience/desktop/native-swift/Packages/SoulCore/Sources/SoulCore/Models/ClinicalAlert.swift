import Foundation
import SwiftData

/// Represents a safety alert triggered by the system.
/// Critical for clinical safety and crisis aversion.
@Model
@available(macOS 14, iOS 17, *)
public final class ClinicalAlert {
    @Attribute(.unique) public var id: UUID
    public var timestamp: Date
    public var severity: AlertSeverity
    public var triggerKeyword: String
    public var context: String // Surrounding text or state
    public var isResolved: Bool
    
    public init(
        id: UUID = UUID(),
        timestamp: Date = Date(),
        severity: AlertSeverity,
        triggerKeyword: String,
        context: String,
        isResolved: Bool = false
    ) {
        self.id = id
        self.timestamp = timestamp
        self.severity = severity
        self.triggerKeyword = triggerKeyword
        self.context = context
        self.isResolved = isResolved
    }
}

public enum AlertSeverity: String, Codable, CaseIterable {
    case low         // Monitoring (e.g. "sad", "tired")
    case medium      // Warning (e.g. "hopeless", "worthless")
    case critical    // Crisis (e.g. "hurt myself", "suicide", "kill")
}
