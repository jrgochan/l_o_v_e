import XCTest
import Combine
import SwiftData
@testable import SoulUI
@testable import SoulCore

@MainActor
final class PlaybackEngineTests: XCTestCase {

    var session: SessionAnalytics!
    var container: ModelContainer!

    override func setUp() async throws {
        let config = ModelConfiguration(isStoredInMemoryOnly: true)
        container = try ModelContainer(for: SessionAnalytics.self, configurations: config)
        let context = container.mainContext

        let now = Date()
        session = SessionAnalytics(startTime: now, startValence: 0.0, startArousal: 0.0)
        context.insert(session)

        // Add Metric at t=0: (0, 0)
        let vibeStart = Vibe(timestamp: now, valence: 0.0, arousal: 0.0, connection: 0.5)
        // We artificially force timestamp? No, addMetric uses Date().
        // We need to be careful with timestamps.
        // Actually, SessionAnalytics.SessionMetric struct has public init? No, it's Codable/Identifiable struct inside SessionAnalytics.
        // But addMetric() uses Date().
        // To precisely control time, we might need to modify SessionAnalytics to allow injecting timestamp in addMetric, OR we construct the array manually and encode it (since it's public @Attribute).
        // Since `SessionMetric` is public, we can just encode it manually.

        let startMetric = SessionAnalytics.SessionMetric(
            timestamp: now,
            valence: 0.0,
            arousal: 0.0,
            connection: 0.5,
            heartRate: 60,
            hrv: 50,
            messageCount: 0
        )

        let endMetric = SessionAnalytics.SessionMetric(
            timestamp: now.addingTimeInterval(10), // t=10
            valence: 1.0,
            arousal: 1.0,
            connection: 0.5,
            heartRate: 80,
            hrv: 60,
            messageCount: 5
        )

        session.timeSeriesData = try! JSONEncoder().encode([startMetric, endMetric])
        session.endTime = now.addingTimeInterval(10)
    }

    func testInterpolationLogic() {
        let engine = PlaybackEngine(session: session)

        // t=0.0 (Start)
        engine.seek(to: 0.0)
        XCTAssertEqual(engine.currentVibe.valence, 0.0, accuracy: 0.001)
        XCTAssertEqual(engine.currentVibe.arousal, 0.0, accuracy: 0.001)

        // t=0.5 (Midpoint: 5 seconds) -> Should be (0.5, 0.5)
        engine.seek(to: 0.5)
        XCTAssertEqual(engine.currentVibe.valence, 0.5, accuracy: 0.001)
        XCTAssertEqual(engine.currentVibe.arousal, 0.5, accuracy: 0.001)

        // t=1.0 (End)
        engine.seek(to: 1.0)
        XCTAssertEqual(engine.currentVibe.valence, 1.0, accuracy: 0.001)
        XCTAssertEqual(engine.currentVibe.arousal, 1.0, accuracy: 0.001)
    }

    func testSeekExamples() {
        let engine = PlaybackEngine(session: session)

        // t=0.25 -> (0.25, 0.25)
        engine.seek(to: 0.25)
        XCTAssertEqual(engine.currentVibe.valence, 0.25, accuracy: 0.001)
    }
}
