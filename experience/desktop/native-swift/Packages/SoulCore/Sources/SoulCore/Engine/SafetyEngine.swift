import Foundation

/// Analyzes text for clinical safety risks and triggers alerts.
public class SafetyEngine {

    public struct SafetyResult {
        public let isSafe: Bool
        public let severity: AlertSeverity
        public let flaggedKeywords: [String]
    }

    // Simple Regex Dictionary for MVP.
    // In production, this should be loaded from a secure, encrypted configuration.
    private let criticalPatterns: [String] = [
        "kill myself",
        "suicid", // catches suicide, suicidal
        "end my life",
        "hurt myself",
        "want to die"
    ]

    private let mediumPatterns: [String] = [
        "hopeless",
        "worthless",
        "no point",
        "can't go on",
        "give up"
    ]

    public init() {}

    public func analyze(_ text: String) -> SafetyResult {
        let lowerText = text.lowercased()

        // Critical Check
        // Critical Check
        for pattern in criticalPatterns where lowerText.contains(pattern) {
             return SafetyResult(isSafe: false, severity: .critical, flaggedKeywords: [pattern])
        }

        // Medium Check
        for pattern in mediumPatterns where lowerText.contains(pattern) {
             return SafetyResult(isSafe: false, severity: .medium, flaggedKeywords: [pattern])
        }

        return SafetyResult(isSafe: true, severity: .low, flaggedKeywords: [])
    }
}
