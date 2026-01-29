import Foundation
import SwiftData

/// Tracks usage metrics and emotional progression for a session.
@Model
@available(macOS 14, iOS 17, *)
public final class SessionAnalytics {
    @Attribute(.unique) public var id: UUID
    public var startTime: Date
    public var endTime: Date?
    public var messageCount: Int

    // Emotional Shift
    public var startValence: Double
    public var startArousal: Double
    public var endValence: Double?
    public var endArousal: Double?

    // Time-Series Data (JSON Encoded [SessionMetric])
    // Storing as Data blob for simplicity and performance in SwiftData
    @Attribute(.externalStorage) public var timeSeriesData: Data?

    public struct SessionMetric: Codable, Identifiable {
        public var id: Date { timestamp }
        public var timestamp: Date
        public var valence: Double
        public var arousal: Double
        public var connection: Double // Added
        public var heartRate: Double
        public var hrv: Double // Added
        public var messageCount: Int // Added
    }

    public init(
        id: UUID = UUID(),
        startTime: Date = Date(),
        startValence: Double,
        startArousal: Double
    ) {
        self.id = id
        self.startTime = startTime
        self.messageCount = 0
        self.startValence = startValence
        self.startArousal = startArousal
        self.timeSeriesData = try? JSONEncoder().encode([SessionMetric]())
    }

    public var duration: TimeInterval {
        return (endTime ?? Date()).timeIntervalSince(startTime)
    }

    /// Appends a new data point to the time series
    public func addMetric(vibe: Vibe, heartRate: Double, hrv: Double, messageCount: Int) {
        var metrics = getMetrics()
        let newMetric = SessionMetric(
            timestamp: Date(),
            valence: vibe.valence,
            arousal: vibe.arousal,
            connection: vibe.connection,
            heartRate: heartRate,
            hrv: hrv,
            messageCount: messageCount
        )
        metrics.append(newMetric)

        // Save back
        self.timeSeriesData = try? JSONEncoder().encode(metrics)
    }

    /// Retrieves decoded metrics
    public func getMetrics() -> [SessionMetric] {
        guard let data = timeSeriesData else { return [] }
        return (try? JSONDecoder().decode([SessionMetric].self, from: data)) ?? []
    }
}
